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
  ApiArtisanSample,
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

export default function ArtisanSampleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { role } = useAuth()
  const enabled = role === 'ARTISAN'

  const { notifications, unreadCount, readCount, markAsRead, markAllAsRead, clearRead, refresh } =
    useNotifications({ enabled })

  const [sample, setSample] = useState<ApiArtisanSample | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const loadSample = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchArtisanSample(id)
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
  }, [id])

  useEffect(() => {
    if (enabled) loadSample()
  }, [enabled, loadSample])

  const editable = sample ? sample.status !== 'APPROVED' : false
  const canResubmit =
    sample &&
    ['MORE_INFO_REQUESTED', 'REJECTED'].includes(sample.status) &&
    sample.media.length > 0

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
      const updated = await updateArtisanSample(id, payload)
      setSample(updated)
      setSuccess('Sample updated.')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update sample')
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
      await uploadArtisanSampleImages(id, imageFiles)
      setImageFiles([])
      await loadSample()
      setSuccess('Images uploaded.')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload images')
    } finally {
      setSaving(false)
    }
  }

  const handleResubmit = async () => {
    if (!id || !canResubmit) return
    setActionError(null)
    setSuccess(null)
    setResubmitting(true)
    try {
      await resubmitArtisanSample(id)
      setSuccess('Sample resubmitted for review.')
      router.push('/artisan/dashboard')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to resubmit sample')
    } finally {
      setResubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        statusText="Sample details"
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
              Loading sample…
            </div>
          )}

          {error && (
            <Card className="p-4 border-destructive/40 text-destructive text-sm">{error}</Card>
          )}

          {!loading && sample && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-druk-medium text-2xl md:text-3xl uppercase tracking-[0.04em]">
                    {sample.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
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
                    className="w-24 h-24 object-cover rounded-md border border-border"
                  />
                ))}
              </div>

              {editable ? (
                <Card className="p-6 space-y-4">
                  <h2 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold">Update sample</h2>
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
                      className="w-full p-2 border border-border rounded-md bg-background min-h-[120px]"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upload more images</label>
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
                  {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                  {success && <p className="text-sm text-primary">{success}</p>}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving || resubmitting}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                    </Button>
                    {canResubmit && (
                      <Button variant="secondary" onClick={handleResubmit} disabled={saving || resubmitting}>
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
                  </div>
                  {sample.status === 'MORE_INFO_REQUESTED' && (
                    <p className="text-xs text-muted-foreground">
                      Admin requested more information. Update your sample and resubmit when ready.
                    </p>
                  )}
                </Card>
              ) : (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">
                    This sample is approved and linked to your product workflow.
                  </p>
                  <p className="text-sm mt-3">{sample.description}</p>
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
