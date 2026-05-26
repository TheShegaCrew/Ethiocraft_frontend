'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { DraftDetailDialog, type DraftDialogMode } from '@/components/artisan/draft-detail-dialog'
import { SampleDetailDialog, type SampleDialogMode } from '@/components/artisan/sample-detail-dialog'
import {
  Package,
  ShoppingCart,
  Upload,
  User,
  Loader2,
  FileImage,
  Bell,
  Eye,
  Pencil,
  ExternalLink,
  Send,
  Trash2,
} from 'lucide-react'
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
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/hooks/useNotifications'
import {
  ApiArtisanDraft,
  ApiArtisanSample,
  ApiOrder,
  ApiProductSummary,
  createArtisanSample,
  fetchArtisanDrafts,
  fetchArtisanPublishedProducts,
  fetchArtisanSamples,
  fetchOrders,
  fetchUserProfile,
  resolveMediaUrl,
  updateUserProfile,
  uploadArtisanSampleImages,
  submitArtisanDraft,
  resubmitArtisanSample,
  deleteArtisanSample,
} from '@/lib/api'

const BANK_OPTIONS = [
  'Commercial Bank of Ethiopia',
  'Dashen Bank',
  'Awash Bank',
  'Bank of Abyssinia',
  'Cooperative Bank of Oromia',
]

type ProfileFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  shopName: string
  bio: string
  region: string
  city: string
  bankName: string
  accountNumber: string
  accountHolderName: string
}

const emptyProfileForm: ProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  shopName: '',
  bio: '',
  region: '',
  city: '',
  bankName: BANK_OPTIONS[0],
  accountNumber: '',
  accountHolderName: '',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

function statusBadgeClass(status: string) {
  const normalized = status.toUpperCase()
  if (['APPROVED', 'PUBLISHED', 'DELIVERED', 'PAID', 'COMPLETED'].includes(normalized)) {
    return 'bg-primary text-primary-foreground'
  }
  if (['REJECTED', 'CANCELLED', 'FAILED'].includes(normalized)) {
    return 'bg-destructive text-destructive-foreground'
  }
  if (['ADMIN_REVIEW', 'AGENT_IN_PROGRESS', 'AGENT_VERIFIED', 'PROCESSING', 'SHIPPED', 'SUBMITTED', 'MORE_INFO_REQUESTED'].includes(normalized)) {
    return 'bg-muted text-muted-foreground'
  }
  return 'bg-secondary text-secondary-foreground'
}

function notificationTypeClasses(type: string) {
  const normalized = type.toUpperCase()
  if (normalized.includes('APPROVED') || normalized.includes('PUBLISHED') || normalized.includes('PAYMENT_SUCCESS')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
  if (normalized.includes('REJECTED') || normalized.includes('FAILED')) {
    return 'border-rose-200 bg-rose-50 text-rose-900'
  }
  if (normalized.includes('ORDER_PLACED') || normalized.includes('ORDER_SHIPPED')) {
    return 'border-sky-200 bg-sky-50 text-sky-900'
  }
  if (normalized.includes('DRAFT') || normalized.includes('VERIFICATION') || normalized.includes('REVIEW')) {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }
  return 'border-slate-200 bg-slate-50 text-slate-900'
}

function notificationTypeBadgeClass(type: string) {
  const normalized = type.toUpperCase()
  if (normalized.includes('APPROVED') || normalized.includes('PUBLISHED') || normalized.includes('PAYMENT_SUCCESS')) {
    return 'bg-emerald-100 text-emerald-900 border border-emerald-200'
  }
  if (normalized.includes('REJECTED') || normalized.includes('FAILED')) {
    return 'bg-rose-100 text-rose-900 border border-rose-200'
  }
  if (normalized.includes('ORDER_PLACED') || normalized.includes('ORDER_SHIPPED')) {
    return 'bg-sky-100 text-sky-900 border border-sky-200'
  }
  if (normalized.includes('DRAFT') || normalized.includes('VERIFICATION') || normalized.includes('REVIEW')) {
    return 'bg-amber-100 text-amber-900 border border-amber-200'
  }
  return 'bg-slate-100 text-slate-900 border border-slate-200'
}

function notificationTypeLabel(type: string) {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPrice(value: number | string | null | undefined, currency = 'ETB') {
  const amount = Number(value ?? 0)
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const EDITABLE_DRAFT_STATUSES = ['ADMIN_CREATED', 'AGENT_IN_PROGRESS', 'REJECTED']

const REVIEW_NOTIFICATION_PATTERN = /PRODUCT|SAMPLE|DRAFT|VERIFICATION|REVIEW|REJECT/i

function canEditDraft(draft: ApiArtisanDraft) {
  return EDITABLE_DRAFT_STATUSES.includes(draft.status)
}

function canSubmitDraft(draft: ApiArtisanDraft) {
  return canEditDraft(draft) && draft.media.length > 0
}

function canEditSample(sample: ApiArtisanSample) {
  return sample.status !== 'APPROVED'
}

function canDeleteSample(sample: ApiArtisanSample) {
  return sample.status !== 'APPROVED'
}

function canResubmitSample(sample: ApiArtisanSample) {
  return ['MORE_INFO_REQUESTED', 'REJECTED'].includes(sample.status) && sample.media.length > 0
}

function isReviewNotification(type: string) {
  return REVIEW_NOTIFICATION_PATTERN.test(type)
}

export default function ArtisanDashboard() {
  const { role } = useAuth()
  const enabled = role === 'ARTISAN'

  const { notifications, unreadCount, readCount, markAsRead, markAllAsRead, clearRead, refresh } =
    useNotifications({ enabled })

  const [samples, setSamples] = useState<ApiArtisanSample[]>([])
  const [drafts, setDrafts] = useState<ApiArtisanDraft[]>([])
  const [published, setPublished] = useState<ApiProductSummary[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [sampleForm, setSampleForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    stock: '',
  })
  const [sampleFiles, setSampleFiles] = useState<File[]>([])

  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm)
  const [artisanName, setArtisanName] = useState<string>('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [submittingDraftId, setSubmittingDraftId] = useState<string | null>(null)
  const [resubmittingSampleId, setResubmittingSampleId] = useState<string | null>(null)
  const [draftDialog, setDraftDialog] = useState<{ id: string; mode: DraftDialogMode } | null>(null)
  const [sampleDialog, setSampleDialog] = useState<{ id: string; mode: SampleDialogMode } | null>(null)
  const [sampleToDelete, setSampleToDelete] = useState<ApiArtisanSample | null>(null)
  const [deletingSampleId, setDeletingSampleId] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const profile = await fetchUserProfile()
      const ext = profile.artisanProfile?.extensionData
      const bank = profile.artisanProfile?.artisanBankDetail ?? {
        bankName: ext?.bankName,
        accountNumber: ext?.accountNumber,
        accountHolderName: ext?.accountHolderName,
      }
      const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      setArtisanName(fullName || 'Artisan')
      setProfileForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        shopName: profile.artisanProfile?.shopName ?? '',
        bio: profile.artisanProfile?.bio ?? '',
        region: profile.artisanProfile?.region ?? '',
        city: profile.artisanProfile?.city ?? '',
        bankName: bank?.bankName ?? BANK_OPTIONS[0],
        accountNumber: bank?.accountNumber ?? '',
        accountHolderName: bank?.accountHolderName ?? '',
      })
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      loadProfile()
    }
  }, [enabled, loadProfile])

  useEffect(() => {
    if (isProfileModalOpen) {
      loadProfile()
    }
  }, [isProfileModalOpen, loadProfile])

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      if (!profileForm.shopName.trim()) {
        throw new Error('Shop name is required.')
      }
      await updateUserProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim() || undefined,
        artisanProfile: {
          shopName: profileForm.shopName.trim(),
          bio: profileForm.bio.trim() || undefined,
          region: profileForm.region.trim() || undefined,
          city: profileForm.city.trim() || undefined,
        },
        artisanBankDetail: {
          bankName: profileForm.bankName,
          accountNumber: profileForm.accountNumber.trim(),
          accountHolderName: profileForm.accountHolderName.trim(),
        },
      })
      setProfileSuccess('Profile updated successfully.')
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const loadDashboard = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    const results = await Promise.allSettled([
      fetchArtisanSamples(),
      fetchArtisanDrafts(),
      fetchArtisanPublishedProducts(),
      fetchOrders(null, { limit: 10 }),
    ])

    const [samplesResult, draftsResult, publishedResult, ordersResult] = results
    const errors: string[] = []

    if (samplesResult.status === 'fulfilled') {
      setSamples(samplesResult.value)
    } else {
      setSamples([])
      errors.push(samplesResult.reason instanceof Error ? samplesResult.reason.message : 'Failed to load samples')
    }

    if (draftsResult.status === 'fulfilled') {
      setDrafts(draftsResult.value)
    } else {
      setDrafts([])
      errors.push(draftsResult.reason instanceof Error ? draftsResult.reason.message : 'Failed to load drafts')
    }

    if (publishedResult.status === 'fulfilled') {
      setPublished(publishedResult.value)
    } else {
      setPublished([])
      errors.push(
        publishedResult.reason instanceof Error ? publishedResult.reason.message : 'Failed to load published products',
      )
    }

    if (ordersResult.status === 'fulfilled') {
      setOrders(ordersResult.value.items)
    } else {
      setOrders([])
      errors.push(ordersResult.reason instanceof Error ? ordersResult.reason.message : 'Failed to load orders')
    }

    setError(errors.length > 0 ? errors.join(' | ') : null)
    setLoading(false)
  }, [enabled])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const headerNotifications = notifications.map((n) => ({
    id: n.id,
    message: n.message,
    time: new Date(n.createdAt).toLocaleString(),
    unread: !n.isRead,
  }))

  const pendingSamples = samples.filter((s) => ['SUBMITTED', 'MORE_INFO_REQUESTED'].includes(s.status)).length
  const liveProducts = published.filter((p) => p.status === 'PUBLISHED').length
  const inPipelineDrafts = drafts.filter((d) => d.status !== 'PUBLISHED' && d.status !== 'REJECTED').length

  const reviewNotifications = useMemo(
    () => notifications.filter((n) => isReviewNotification(n.type)),
    [notifications],
  )

  const handleSubmitDraft = async (draftId: string) => {
    setSubmittingDraftId(draftId)
    setError(null)
    try {
      await submitArtisanDraft(draftId)
      await loadDashboard()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit draft')
    } finally {
      setSubmittingDraftId(null)
    }
  }

  const handleResubmitSample = async (sampleId: string) => {
    setResubmittingSampleId(sampleId)
    setError(null)
    try {
      await resubmitArtisanSample(sampleId)
      await loadDashboard()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resubmit sample')
    } finally {
      setResubmittingSampleId(null)
    }
  }

  const handleConfirmDeleteSample = async () => {
    if (!sampleToDelete) return
    setDeletingSampleId(sampleToDelete.id)
    setError(null)
    try {
      await deleteArtisanSample(sampleToDelete.id)
      if (sampleDialog?.id === sampleToDelete.id) {
        setSampleDialog(null)
      }
      setSampleToDelete(null)
      await loadDashboard()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete sample')
    } finally {
      setDeletingSampleId(null)
    }
  }

  const summaryCards = useMemo(
    () => [
      {
        title: 'Live Products',
        value: String(liveProducts),
        change: `${published.length} total in catalog`,
        icon: Package,
      },
      {
        title: 'Verification Drafts',
        value: String(inPipelineDrafts),
        change: `${drafts.length} drafts total`,
        icon: FileImage,
      },
      {
        title: 'Recent Orders',
        value: String(orders.length),
        change: 'Latest 10 orders',
        icon: ShoppingCart,
      },
      {
        title: 'Pending Samples',
        value: String(pendingSamples),
        change: `${samples.length} samples submitted`,
        icon: Upload,
      },
    ],
    [liveProducts, published.length, inPipelineDrafts, drafts.length, orders.length, pendingSamples, samples.length],
  )

  const handleSubmitSample = async () => {
    setSubmitError(null)
    if (!sampleForm.title.trim() || !sampleForm.description.trim() || !sampleForm.category.trim()) {
      setSubmitError('Title, description, and category are required.')
      return
    }
    if (sampleForm.description.trim().length < 20) {
      setSubmitError('Description must be at least 20 characters.')
      return
    }
    if (sampleFiles.length === 0) {
      setSubmitError('Upload at least one product image (JPEG, PNG, or WEBP).')
      return
    }

    const price = Number(sampleForm.price)
    if (sampleForm.price.trim() && (!Number.isFinite(price) || price <= 0)) {
      setSubmitError('Price must be a positive number, or leave it empty.')
      return
    }

    setSubmitting(true)
    try {
      const payload: Parameters<typeof createArtisanSample>[0] = {
        title: sampleForm.title.trim(),
        description: sampleForm.description.trim(),
        category: sampleForm.category.trim(),
      }
      if (Number.isFinite(price) && price > 0) {
        payload.price = price
      }
      const stock = Number(sampleForm.stock)
      if (Number.isFinite(stock) && stock >= 0) {
        payload.stock = stock
      }

      const sampleId = await createArtisanSample(payload)
      await uploadArtisanSampleImages(sampleId, sampleFiles)
      setIsSubmitModalOpen(false)
      setSampleForm({ title: '', description: '', category: '', price: '', stock: '' })
      setSampleFiles([])
      await loadDashboard()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit sample')
    } finally {
      setSubmitting(false)
    }
  }

  const quickActions = [
    {
      title: 'Submit new sample',
      description: 'Upload product photos and details for admin review (sample-first workflow).',
      icon: Upload,
      label: 'Submit Sample',
      onClick: () => setIsSubmitModalOpen(true),
    },
    {
      title: 'Update profile',
      description: 'Manage contact information and bank details.',
      icon: User,
      label: 'Edit Profile',
      onClick: () => setIsProfileModalOpen(true),
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        statusText="Notifications refresh automatically"
        notifications={headerNotifications}
        unreadNotifications={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearRead={clearRead}
        readCount={readCount}
        refresh={refresh}
      />

      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-druk-medium text-3xl md:text-4xl uppercase tracking-[0.04em] mb-2">
              Welcome back, {artisanName || 'Artisan'}
            </h1>
            <p className="font-inter text-muted-foreground">
              Manage your samples, drafts, products, and alerts.
            </p>
          </div>

          {error && (
            <Card className="p-4 mb-6 border-destructive/40 bg-destructive/5 text-destructive text-sm">
              {error}
              <Button variant="outline" size="sm" className="ml-4" onClick={loadDashboard}>
                Retry
              </Button>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card, i) => {
              const Icon = card.icon
              return (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-aeonik text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">{card.title}</p>
                      <p className="font-druk-medium text-2xl">{loading ? '…' : card.value}</p>
                      <p className="font-inter text-xs text-primary mt-2">{card.change}</p>
                    </div>
                    <Icon className="w-8 h-8 text-secondary opacity-20" />
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 mb-8 md:grid-cols-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Card key={index} className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-aeonik text-xs uppercase tracking-[0.12em] text-muted-foreground">{action.title}</p>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-inter text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <Button className="mt-6 w-full bg-primary" onClick={action.onClick}>
                    {action.label}
                  </Button>
                </Card>
              )
            })}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading dashboard…
            </div>
          )}

          {!loading && (
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto md:h-10 gap-2 mb-8 bg-transparent md:bg-muted p-0 md:p-1">
                <TabsTrigger value="orders" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Orders</TabsTrigger>
                <TabsTrigger value="products" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Products</TabsTrigger>
                <TabsTrigger value="samples" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Samples</TabsTrigger>
                <TabsTrigger value="notifications" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">
                  Alerts
                  {unreadCount > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="space-y-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">Recent Orders</h2>
                {orders.length === 0 ? (
                  <Card className="p-6 text-sm text-muted-foreground">No orders yet for your products.</Card>
                ) : (
                  <div className="overflow-x-auto bg-card rounded-lg border border-border">
                    <table className="w-full">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Order</th>
                          <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Items</th>
                          <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Total</th>
                          <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Status</th>
                          <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                            <td className="py-3 px-4 font-semibold text-sm">{order.id.slice(-8).toUpperCase()}</td>
                            <td className="py-3 px-4 text-sm">
                              {order.items.map((item) => item.product?.title ?? 'Product').join(', ')}
                            </td>
                            <td className="py-3 px-4 font-bold text-secondary">
                              {formatPrice(order.totalAmount, order.currency)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={statusBadgeClass(order.status)}>{formatStatus(order.status)}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <Tabs defaultValue="drafts">
                  <TabsList className="mb-4">
                    <TabsTrigger value="drafts">Drafts</TabsTrigger>
                    <TabsTrigger value="published">Published</TabsTrigger>
                  </TabsList>

                  <TabsContent value="drafts" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Verification drafts created after a sample is approved. Edit and submit when ready.
                    </p>
                    {drafts.length === 0 ? (
                      <Card className="p-6 text-sm text-muted-foreground">No verification drafts yet.</Card>
                    ) : (
                      <div className="grid gap-4">
                        {drafts.map((draft) => (
                          <Card key={draft.id} className="p-4 flex flex-col sm:flex-row gap-4">
                            <img
                              src={resolveMediaUrl(draft.media[0]?.url)}
                              alt={draft.title}
                              className="w-full sm:w-28 h-28 object-cover rounded-md bg-muted"
                            />
                            <div className="flex-1 flex flex-col gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{draft.title}</h3>
                                  <Badge className={statusBadgeClass(draft.status)}>{formatStatus(draft.status)}</Badge>
                                </div>
                                {draft.verificationNotes && (
                                  <p className="text-sm text-muted-foreground mt-2">{draft.verificationNotes}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Updated {new Date(draft.updatedAt).toLocaleDateString()}
                                  {draft.submittedAt
                                    ? ` · Submitted ${new Date(draft.submittedAt).toLocaleDateString()}`
                                    : ''}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDraftDialog({ id: draft.id, mode: 'view' })}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  View details
                                </Button>
                                {canEditDraft(draft) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDraftDialog({ id: draft.id, mode: 'edit' })}
                                  >
                                    <Pencil className="w-3.5 h-3.5 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                {canSubmitDraft(draft) && (
                                  <Button
                                    size="sm"
                                    disabled={submittingDraftId === draft.id}
                                    onClick={() => handleSubmitDraft(draft.id)}
                                  >
                                    {submittingDraftId === draft.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <>
                                        <Send className="w-3.5 h-3.5 mr-1" />
                                        Submit for verification
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="published" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Approved and live catalog products. Only <strong>PUBLISHED</strong> items appear on the marketplace.
                    </p>
                    {published.length === 0 ? (
                      <Card className="p-6 text-sm text-muted-foreground">No approved or published products yet.</Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {published.map((product) => (
                          <Card key={product.id} className="overflow-hidden">
                            <img
                              src={resolveMediaUrl(product.media[0]?.url)}
                              alt={product.title}
                              className="w-full h-40 object-cover bg-muted"
                            />
                            <div className="p-4">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h3 className="font-inter font-semibold">{product.title}</h3>
                                <Badge className={statusBadgeClass(product.status)}>{formatStatus(product.status)}</Badge>
                              </div>
                              <p className="font-druk-medium text-lg text-secondary mb-2">
                                {formatPrice(product.price)}
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {product.publishedAt
                                  ? `Published ${new Date(product.publishedAt).toLocaleDateString()}`
                                  : 'Awaiting admin publish'}
                              </p>
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href={`/products/${product.slug || product.id}`}>
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  View product page
                                </Link>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="samples" className="space-y-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">My Samples</h2>
                {samples.length === 0 ? (
                  <Card className="p-6 text-sm text-muted-foreground">
                    No samples yet. Submit a sample to start the product workflow.
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {samples.map((sample) => (
                      <Card key={sample.id} className="p-4 flex flex-col sm:flex-row gap-4">
                        <img
                          src={resolveMediaUrl(sample.media[0]?.url)}
                          alt={sample.title}
                          className="w-full sm:w-28 h-28 object-cover rounded-md bg-muted"
                        />
                        <div className="flex-1 flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <p className="font-semibold">{sample.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {sample.id.slice(-8).toUpperCase()} · {new Date(sample.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sample.description}</p>
                            </div>
                            <Badge className={statusBadgeClass(sample.status)}>{formatStatus(sample.status)}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSampleDialog({ id: sample.id, mode: 'view' })}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            {canEditSample(sample) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSampleDialog({ id: sample.id, mode: 'update' })}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" />
                                Update
                              </Button>
                            )}
                            {canEditSample(sample) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSampleDialog({ id: sample.id, mode: 'upload' })}
                              >
                                <Upload className="w-3.5 h-3.5 mr-1" />
                                Upload images
                              </Button>
                            )}
                            {canResubmitSample(sample) && (
                              <Button
                                size="sm"
                                disabled={resubmittingSampleId === sample.id}
                                onClick={() => handleResubmitSample(sample.id)}
                              >
                                {resubmittingSampleId === sample.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5 mr-1" />
                                    Resubmit
                                  </>
                                )}
                              </Button>
                            )}
                            {canDeleteSample(sample) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingSampleId === sample.id}
                                onClick={() => setSampleToDelete(sample)}
                              >
                                {deletingSampleId === sample.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification history
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                      Mark all read
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearRead} disabled={readCount === 0}>
                      Clear read
                    </Button>
                  </div>
                </div>

                {reviewNotifications.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-aeonik text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      Review &amp; product alerts
                    </h3>
                    <div className="grid gap-2">
                      {reviewNotifications.map((n) => (
                        <Card
                          key={n.id}
                          className={`p-4 cursor-pointer transition-colors border ${notificationTypeClasses(n.type)} ${!n.isRead ? 'ring-1 ring-primary/30' : ''}`}
                          onClick={() => markAsRead(n.id)}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <Badge className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${notificationTypeBadgeClass(n.type)}`}>
                                {notificationTypeLabel(n.type)}
                              </Badge>
                              {!n.isRead && (
                                <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{n.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-aeonik text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    All recent notifications
                  </h3>
                  {notifications.length === 0 ? (
                    <Card className="p-6 text-sm text-muted-foreground">No notifications yet.</Card>
                  ) : (
                    <div className="grid gap-2">
                      {notifications.map((n) => (
                        <Card
                          key={n.id}
                          className={`p-4 cursor-pointer transition-colors border ${notificationTypeClasses(n.type)} ${!n.isRead ? 'ring-1 ring-primary/30' : ''}`}
                          onClick={() => markAsRead(n.id)}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <Badge className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${notificationTypeBadgeClass(n.type)}`}>
                                {notificationTypeLabel(n.type)}
                              </Badge>
                              {!n.isRead && (
                                <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{n.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(n.createdAt).toLocaleString()} · {formatStatus(n.type)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <DraftDetailDialog
        draftId={draftDialog?.id ?? null}
        open={!!draftDialog}
        mode={draftDialog?.mode ?? 'view'}
        onOpenChange={(open) => {
          if (!open) setDraftDialog(null)
        }}
        onSuccess={loadDashboard}
      />

      <SampleDetailDialog
        sampleId={sampleDialog?.id ?? null}
        open={!!sampleDialog}
        mode={sampleDialog?.mode ?? 'view'}
        onOpenChange={(open) => {
          if (!open) setSampleDialog(null)
        }}
        onSuccess={loadDashboard}
      />

      <AlertDialog
        open={!!sampleToDelete}
        onOpenChange={(open) => {
          if (!open) setSampleToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sample?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{sampleToDelete?.title}&quot; and all uploaded images. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingSampleId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deletingSampleId}
              onClick={(e) => {
                e.preventDefault()
                void handleConfirmDeleteSample()
              }}
            >
              {deletingSampleId ? 'Deleting…' : 'Delete sample'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Submit Digital Sample</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <input
                type="text"
                className="w-full p-2 border border-border rounded-md bg-background"
                placeholder="e.g. Woven Indigo Scarf"
                value={sampleForm.title}
                onChange={(e) => setSampleForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <input
                type="text"
                className="w-full p-2 border border-border rounded-md bg-background"
                placeholder="e.g. Textiles"
                value={sampleForm.category}
                onChange={(e) => setSampleForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (ETB)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border border-border rounded-md bg-background"
                  value={sampleForm.price}
                  onChange={(e) => setSampleForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border border-border rounded-md bg-background"
                  value={sampleForm.stock}
                  onChange={(e) => setSampleForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full p-2 border border-border rounded-md bg-background min-h-[100px]"
                placeholder="Materials, dimensions, and crafting technique (min. 20 characters)…"
                value={sampleForm.description}
                onChange={(e) => setSampleForm((f) => ({ ...f, description: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{sampleForm.description.length}/20 min characters</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Images</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="w-full text-sm"
                onChange={(e) => setSampleFiles(Array.from(e.target.files ?? []))}
              />
              {sampleFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{sampleFiles.length} file(s) selected</p>
                  <div className="flex flex-wrap gap-2">
                    {sampleFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative w-16 h-16 rounded border border-border overflow-hidden bg-muted"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline" disabled={submitting}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmitSample} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isProfileModalOpen}
        onOpenChange={(open) => {
          setIsProfileModalOpen(open)
          if (!open) {
            setProfileError(null)
            setProfileSuccess(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Update Profile</DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading profile…
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold">Personal &amp; shop</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Shop name</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.shopName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, shopName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Full name</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="w-full p-3 border border-border rounded bg-background"
                        placeholder="First"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                      />
                      <input
                        type="text"
                        className="w-full p-3 border border-border rounded bg-background"
                        placeholder="Last"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
                    <input
                      type="email"
                      readOnly
                      className="w-full p-3 border border-border rounded bg-muted text-muted-foreground"
                      value={profileForm.email}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Phone</label>
                    <input
                      type="tel"
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Region</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.region}
                      onChange={(e) => setProfileForm((f) => ({ ...f, region: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">City</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Bio</label>
                    <textarea
                      className="w-full p-3 border border-border rounded bg-background min-h-[80px]"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold">Bank details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Bank name</label>
                    <select
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.bankName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, bankName: e.target.value }))}
                    >
                      {BANK_OPTIONS.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Account number</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.accountNumber}
                      onChange={(e) => setProfileForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Account holder name</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-border rounded bg-background"
                      value={profileForm.accountHolderName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, accountHolderName: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              {profileSuccess && <p className="text-sm text-primary">{profileSuccess}</p>}

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" disabled={profileSaving}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save profile'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik      { font-family: var(--font-aeonik), sans-serif; }
        .font-inter       { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  )
}



