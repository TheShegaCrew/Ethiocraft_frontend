'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ApiArtisanSample,
  deleteArtisanSample,
  fetchArtisanSample,
  resubmitArtisanSample,
  resolveMediaUrl,
  updateArtisanSample,
  uploadArtisanSampleImages,
} from '@/lib/api'

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase()
  if (['APPROVED'].includes(normalized)) return 'bg-primary text-primary-foreground'
  if (['REJECTED'].includes(normalized)) return 'bg-destructive text-destructive-foreground'
  if (['MORE_INFO_REQUESTED', 'SUBMITTED'].includes(normalized)) return 'bg-muted text-muted-foreground'
  return 'bg-secondary text-secondary-foreground'
}

export type SampleDialogMode = 'view' | 'update' | 'upload'

type SampleDetailDialogProps = {
  sampleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: SampleDialogMode
  onSuccess?: () => void
}

export function SampleDetailDialog({
  sampleId,
  open,
  onOpenChange,
  mode: initialMode = 'view',
  onSuccess,
}: SampleDetailDialogProps) {
  const [mode, setMode] = useState<SampleDialogMode>(initialMode)
  const [sample, setSample] = useState<ApiArtisanSample | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
  })

  const loadSample = useCallback(async () => {
    if (!sampleId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchArtisanSample(sampleId)
      setSample(data)
      setForm({
        title: data.title ?? '',
        description: data.description ?? '',
        category: data.category ?? '',
        price: data.price != null ? String(data.price) : '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sample')
    } finally {
      setLoading(false)
    }
  }, [sampleId])

  useEffect(() => {
    if (open && sampleId) {
      setMode(initialMode)
      setActionError(null)
      setSuccess(null)
      setImageFiles([])
      loadSample()
    }
    if (!open) {
      setSample(null)
      setForm({ title: '', description: '', category: '', price: '' })
      setImageFiles([])
      setActionError(null)
      setSuccess(null)
      setError(null)
      setDeleteConfirmOpen(false)
    }
  }, [open, sampleId, initialMode, loadSample])

  const editable = sample ? sample.status !== 'APPROVED' : false
  const canDelete = editable
  const canResubmit =
    sample &&
    ['MORE_INFO_REQUESTED', 'REJECTED'].includes(sample.status) &&
    sample.media.length > 0

  const handleSave = async () => {
    if (!sampleId || !editable) return
    setActionError(null)
    setSuccess(null)
    if (!form.title.trim() || !form.description.trim() || !form.category.trim()) {
      setActionError('Title, description, and category are required.')
      return
    }
    if (form.description.trim().length < 20) {
      setActionError('Description must be at least 20 characters.')
      return
    }

    const payload: Parameters<typeof updateArtisanSample>[1] = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
    }
    const price = Number(form.price)
    if (form.price.trim() && Number.isFinite(price) && price > 0) {
      payload.price = price
    }

    setSaving(true)
    try {
      const updated = await updateArtisanSample(sampleId, payload)
      setSample(updated)
      setSuccess('Sample updated.')
      onSuccess?.()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update sample')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadImages = async () => {
    if (!sampleId || !editable || imageFiles.length === 0) return
    setActionError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await uploadArtisanSampleImages(sampleId, imageFiles)
      setImageFiles([])
      await loadSample()
      setSuccess('Images uploaded.')
      onSuccess?.()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload images')
    } finally {
      setSaving(false)
    }
  }

  const handleResubmit = async () => {
    if (!sampleId || !canResubmit) return
    setActionError(null)
    setSuccess(null)
    setResubmitting(true)
    try {
      await resubmitArtisanSample(sampleId)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to resubmit sample')
    } finally {
      setResubmitting(false)
    }
  }

  const clearSampleState = () => {
    setSample(null)
    setForm({ title: '', description: '', category: '', price: '' })
    setImageFiles([])
    setActionError(null)
    setSuccess(null)
    setError(null)
    setMode('view')
    setDeleteConfirmOpen(false)
  }

  const handleDelete = async () => {
    if (!sampleId || !canDelete) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteArtisanSample(sampleId)
      clearSampleState()
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete sample')
      setDeleteConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const titleByMode: Record<SampleDialogMode, string> = {
    view: 'Sample details',
    update: 'Update sample',
    upload: 'Upload sample images',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">
            {titleByMode[mode]}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading sample…
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && sample && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-lg">{sample.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sample {sample.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <Badge className={statusBadgeClass(sample.status)}>{formatStatus(sample.status)}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {sample.media.map((m) => (
                <img
                  key={m.id ?? m.url}
                  src={resolveMediaUrl(m.url)}
                  alt={sample.title}
                  className="w-20 h-20 object-cover rounded-md border border-border"
                />
              ))}
            </div>

            {mode === 'view' && (
              <div className="space-y-3 text-sm">
                {sample.category && (
                  <p>
                    <span className="text-muted-foreground">Category: </span>
                    {sample.category}
                  </p>
                )}
                {sample.price != null && (
                  <p>
                    <span className="text-muted-foreground">Price: </span>
                    ETB {Number(sample.price).toLocaleString()}
                  </p>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">{sample.description}</p>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(sample.createdAt).toLocaleString()}
                </p>
                {sample.status === 'MORE_INFO_REQUESTED' && (
                  <p className="text-xs text-amber-700">
                    Admin requested more information. Use Update or Upload images, then resubmit.
                  </p>
                )}
              </div>
            )}

            {mode === 'update' && editable && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (ETB, optional)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full p-2 border border-border rounded-md bg-background min-h-[100px]"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {mode === 'upload' && editable && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add more product photos (JPEG, PNG, or WEBP). Existing images are shown above.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  className="w-full text-sm"
                  onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
                />
                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imageFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="w-16 h-16 rounded border border-border overflow-hidden bg-muted"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'update' && !editable && (
              <p className="text-sm text-muted-foreground">This sample can no longer be updated.</p>
            )}

            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            {success && <p className="text-sm text-primary">{success}</p>}

            <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-border">
              {canDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting || saving || resubmitting}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete sample
                    </>
                  )}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>

                {mode === 'view' && editable && (
                  <>
                    <Button variant="outline" onClick={() => setMode('update')}>
                      Update
                    </Button>
                    <Button variant="outline" onClick={() => setMode('upload')}>
                      Upload images
                    </Button>
                  </>
                )}

                {mode === 'update' && editable && (
                  <>
                    <Button variant="outline" onClick={() => setMode('view')}>
                      Back to details
                    </Button>
                    <Button onClick={handleSave} disabled={saving || resubmitting || deleting}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                    </Button>
                    {canResubmit && (
                      <Button variant="secondary" onClick={handleResubmit} disabled={saving || resubmitting || deleting}>
                        {resubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Resubmitting…
                          </>
                        ) : (
                          'Resubmit for review'
                        )}
                      </Button>
                    )}
                  </>
                )}

                {mode === 'upload' && editable && (
                  <>
                    <Button variant="outline" onClick={() => setMode('view')}>
                      Back to details
                    </Button>
                    <Button
                      onClick={handleUploadImages}
                      disabled={saving || imageFiles.length === 0 || deleting}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        `Upload ${imageFiles.length} image(s)`
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sample?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{sample?.title}&quot; and all uploaded images. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? 'Deleting…' : 'Delete sample'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
