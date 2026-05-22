'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import {
  ApiArtisanDraft,
  fetchArtisanDraft,
  resolveMediaUrl,
  submitArtisanDraft,
  updateArtisanDraft,
  uploadArtisanDraftImages,
} from '@/lib/api'

const EDITABLE_STATUSES = ['ADMIN_CREATED', 'AGENT_IN_PROGRESS', 'REJECTED']

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase()
  if (['APPROVED', 'PUBLISHED'].includes(normalized)) return 'bg-primary text-primary-foreground'
  if (['REJECTED'].includes(normalized)) return 'bg-destructive text-destructive-foreground'
  return 'bg-muted text-muted-foreground'
}

export type DraftDialogMode = 'view' | 'edit'

type DraftDetailDialogProps = {
  draftId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: DraftDialogMode
  onSuccess?: () => void
}

export function DraftDetailDialog({
  draftId,
  open,
  onOpenChange,
  mode: initialMode = 'view',
  onSuccess,
}: DraftDetailDialogProps) {
  const [mode, setMode] = useState<DraftDialogMode>(initialMode)
  const [draft, setDraft] = useState<ApiArtisanDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    submissionNotes: '',
  })

  const loadDraft = useCallback(async () => {
    if (!draftId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchArtisanDraft(draftId)
      setDraft(data)
      setForm({
        title: data.title ?? '',
        description: data.description ?? '',
        category: data.category ?? '',
        price: data.price != null ? String(data.price) : '',
        stock: data.stock != null ? String(data.stock) : '',
        submissionNotes: data.submissionNotes ?? '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load draft')
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    if (open && draftId) {
      setMode(initialMode)
      setActionError(null)
      setSuccess(null)
      setImageFiles([])
      loadDraft()
    }
  }, [open, draftId, initialMode, loadDraft])

  const editable = draft ? EDITABLE_STATUSES.includes(draft.status) : false
  const canSubmit = editable && (draft?.media.length ?? 0) > 0

  const handleSave = async () => {
    if (!draftId || !editable) return
    setActionError(null)
    setSuccess(null)
    const price = Number(form.price)
    const stock = Number(form.stock)
    if (!form.title.trim() || !form.description.trim() || !form.category.trim()) {
      setActionError('Title, description, and category are required.')
      return
    }
    if (form.description.trim().length < 20) {
      setActionError('Description must be at least 20 characters.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setActionError('Price must be a positive number.')
      return
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setActionError('Stock must be zero or greater.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateArtisanDraft(draftId, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price,
        stock,
      })
      setDraft(updated)
      setSuccess('Draft saved.')
      onSuccess?.()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadImages = async () => {
    if (!draftId || !editable || imageFiles.length === 0) return
    setActionError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const updated = await uploadArtisanDraftImages(draftId, imageFiles)
      setDraft(updated)
      setImageFiles([])
      setSuccess('Images uploaded.')
      onSuccess?.()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload images')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!draftId || !canSubmit) return
    setActionError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await submitArtisanDraft(draftId, form.submissionNotes.trim() || undefined)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit draft')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">
            {mode === 'edit' ? 'Edit draft' : 'Draft details'}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading draft…
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && draft && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-lg">{draft.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Draft {draft.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <Badge className={statusBadgeClass(draft.status)}>{formatStatus(draft.status)}</Badge>
            </div>

            {draft.verificationNotes && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Review notes</p>
                {draft.verificationNotes}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {draft.media.map((m) => (
                <img
                  key={m.id ?? m.url}
                  src={resolveMediaUrl(m.url)}
                  alt={draft.title}
                  className="w-20 h-20 object-cover rounded-md border border-border"
                />
              ))}
            </div>

            {mode === 'view' ? (
              <div className="space-y-3 text-sm">
                {draft.category && (
                  <p>
                    <span className="text-muted-foreground">Category: </span>
                    {draft.category}
                  </p>
                )}
                {draft.price != null && (
                  <p>
                    <span className="text-muted-foreground">Price: </span>
                    ETB {Number(draft.price).toLocaleString()}
                  </p>
                )}
                {draft.stock != null && (
                  <p>
                    <span className="text-muted-foreground">Stock: </span>
                    {draft.stock}
                  </p>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">{draft.description}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(draft.updatedAt).toLocaleString()}
                  {draft.submittedAt
                    ? ` · Submitted ${new Date(draft.submittedAt).toLocaleString()}`
                    : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    disabled={!editable}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    disabled={!editable}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price (ETB)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      disabled={!editable}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                      disabled={!editable}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full p-2 border border-border rounded-md bg-background min-h-[100px]"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={!editable}
                  />
                </div>
                {editable && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Add images</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="w-full text-sm"
                        onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
                      />
                      {imageFiles.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleUploadImages} disabled={saving}>
                          Upload {imageFiles.length} image(s)
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Submission notes (optional)</label>
                      <textarea
                        className="w-full p-2 border border-border rounded-md bg-background min-h-[60px]"
                        placeholder="Notes for the verification team…"
                        value={form.submissionNotes}
                        onChange={(e) => setForm((f) => ({ ...f, submissionNotes: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            {success && <p className="text-sm text-primary">{success}</p>}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              {mode === 'view' && editable && (
                <Button onClick={() => setMode('edit')}>Edit draft</Button>
              )}
              {mode === 'edit' && editable && (
                <>
                  <Button variant="outline" onClick={() => setMode('view')}>
                    Back to details
                  </Button>
                  <Button onClick={handleSave} disabled={saving || submitting}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || saving || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      'Submit for verification'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
