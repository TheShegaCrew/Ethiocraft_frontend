'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/hooks/useNotifications'
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

export default function ArtisanDraftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { role } = useAuth()
  const enabled = role === 'ARTISAN'

  const { notifications, unreadCount, readCount, markAsRead, markAllAsRead, clearRead, refresh } =
    useNotifications({ enabled })

  const [draft, setDraft] = useState<ApiArtisanDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    submissionNotes: '',
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const loadDraft = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchArtisanDraft(id)
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
  }, [id])

  useEffect(() => {
    if (enabled) loadDraft()
  }, [enabled, loadDraft])

  const editable = draft ? EDITABLE_STATUSES.includes(draft.status) : false
  const canSubmit = editable && (draft?.media.length ?? 0) > 0

  const headerNotifications = notifications.map((n) => ({
    id: n.id,
    message: n.message,
    time: new Date(n.createdAt).toLocaleString(),
    unread: !n.isRead,
  }))

  const handleSave = async () => {
    if (!id || !editable) return
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
      const updated = await updateArtisanDraft(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price,
        stock,
      })
      setDraft(updated)
      setSuccess('Draft saved.')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadImages = async () => {
    if (!id || !editable || imageFiles.length === 0) return
    setActionError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const updated = await uploadArtisanDraftImages(id, imageFiles)
      setDraft(updated)
      setImageFiles([])
      setSuccess('Images uploaded.')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload images')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!id || !canSubmit) return
    setActionError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const updated = await submitArtisanDraft(
        id,
        form.submissionNotes.trim() || undefined,
      )
      setDraft(updated)
      setSuccess('Draft submitted for verification.')
      router.push('/artisan/dashboard')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit draft')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        statusText="Draft details"
        notifications={headerNotifications}
        unreadNotifications={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearRead={clearRead}
        readCount={readCount}
        refresh={refresh}
      />

      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link
            href="/artisan/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading draft…
            </div>
          )}

          {error && (
            <Card className="p-4 border-destructive/40 text-destructive text-sm">{error}</Card>
          )}

          {!loading && draft && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-druk-medium text-2xl md:text-3xl uppercase tracking-[0.04em]">
                    {draft.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Draft {draft.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <Badge className={statusBadgeClass(draft.status)}>{formatStatus(draft.status)}</Badge>
              </div>

              {draft.verificationNotes && (
                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Review notes</p>
                  <p className="text-sm">{draft.verificationNotes}</p>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                {draft.media.map((m) => (
                  <img
                    key={m.id ?? m.url}
                    src={resolveMediaUrl(m.url)}
                    alt={draft.title}
                    className="w-24 h-24 object-cover rounded-md border border-border"
                  />
                ))}
              </div>

              {editable ? (
                <Card className="p-6 space-y-4">
                  <h2 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold">Edit draft</h2>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price (ETB)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-2 border border-border rounded-md bg-background"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
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
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="w-full p-2 border border-border rounded-md bg-background min-h-[120px]"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
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
                  {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                  {success && <p className="text-sm text-primary">{success}</p>}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving || submitting}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                    </Button>
                    <Button
                      variant="secondary"
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
                  </div>
                  {!canSubmit && editable && (
                    <p className="text-xs text-muted-foreground">
                      Upload at least one product image before submitting.
                    </p>
                  )}
                </Card>
              ) : (
                <Card className="p-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This draft is in <strong>{formatStatus(draft.status)}</strong> status and cannot be edited.
                  </p>
                  <p className="text-sm">{draft.description}</p>
                  {draft.submittedAt && (
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(draft.submittedAt).toLocaleString()}
                    </p>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik      { font-family: var(--font-aeonik), sans-serif; }
        .font-inter       { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  )
}
