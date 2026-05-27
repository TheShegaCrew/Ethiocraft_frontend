'use client'

import { ChangeEvent, DragEvent, useState, useEffect } from 'react'
import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle,
  Upload,
  Camera,
  MapPin,
  Lock,
  UserCheck,
  FileText,
  Edit,
  Package,
  Layers,
  Sparkles,
  ImageIcon,
  Phone,
  Mail,
  Hash,
} from 'lucide-react'

const verificationFieldClass =
  'rounded-xl border-border/70 bg-background/80 shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30'

const createInitialVerificationForm = (task?: any) => ({
  title: task?.sampleTitle || task?.name || '',
  description: '',
  category: '',
  price: '',
  currency: 'ETB',
  stock: '',
  measurements: '',
  materials: '',
  tags: '',
  culturalNotes: '',
  suggestedPricing: '',
})

/** Match backend updateDraftSchema rules — only include fields that pass validation */
const buildVerificationDraftPayload = (form: ReturnType<typeof createInitialVerificationForm>, media: {
  uploadedUrls: string[]
  modelUrl: string | null
}) => {
  const normalizedMaterials = form.materials
    ? form.materials.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const normalizedTags = form.tags
    ? form.tags.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const normalizedPrice = form.price.trim() ? Number(form.price) : undefined
  const normalizedStock = form.stock.trim() ? Number(form.stock) : undefined
  const normalizedSuggestedPricing = form.suggestedPricing.trim()
    ? Number(form.suggestedPricing)
    : undefined

  const title = form.title.trim()
  const description = form.description.trim()
  const category = form.category.trim()

  const payload: Record<string, unknown> = {
    dimensions: { measurements: form.measurements.trim() },
    materials: normalizedMaterials,
    culturalMetadata: { notes: form.culturalNotes.trim() },
    extensionData: {
      ...(typeof normalizedSuggestedPricing === 'number' && !Number.isNaN(normalizedSuggestedPricing)
        ? { suggestedPricing: normalizedSuggestedPricing }
        : {}),
      ...(media.uploadedUrls.length ? { mediaFiles: media.uploadedUrls } : {}),
      ...(media.modelUrl ? { modelUrl: media.modelUrl } : {}),
    },
  }

  if (title.length >= 3) payload.title = title
  if (description.length >= 20) payload.description = description
  if (category.length >= 2) payload.category = category
  if (typeof normalizedPrice === 'number' && !Number.isNaN(normalizedPrice) && normalizedPrice > 0) {
    payload.price = normalizedPrice
  }
  if (typeof normalizedStock === 'number' && !Number.isNaN(normalizedStock) && normalizedStock >= 0) {
    payload.stock = Math.floor(normalizedStock)
  }
  if (normalizedTags.length) payload.tags = normalizedTags

  return payload
}

const parseApiErrorMessage = async (res: Response, fallback: string) => {
  try {
    const body = await res.json()
    if (body?.details?.length) {
      const detailText = body.details.map((d: { path?: string; message?: string }) =>
        d.path ? `${d.path}: ${d.message}` : d.message,
      ).join('; ')
      return detailText || body.message || fallback
    }
    return body?.message || fallback
  } catch {
    return fallback
  }
}
import Link from 'next/link'
import { toast } from 'react-toastify'
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/hooks/useNotifications'

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const AGENT_SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  PAID: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
}


export default function AgentDashboard() {
  // Modal States
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false) // Account Activation & Password Setup
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false) // Profile Completion
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false) // Physical Verification Data Entry & Media
  const [isShipmentUpdateModalOpen, setIsShipmentUpdateModalOpen] = useState(false) // Order Status Update
  
  // Selection States
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedShipment, setSelectedShipment] = useState<any>(null)
  const [verificationTasksData, setVerificationTasksData] = useState<any[]>([])
  const [verificationForm, setVerificationForm] = useState(createInitialVerificationForm())
  const [verificationErrors, setVerificationErrors] = useState<{ measurements?: string }>({})
  const [uploadedMediaFiles, setUploadedMediaFiles] = useState<any[]>([])
  const [verificationProgressByTaskId, setVerificationProgressByTaskId] = useState<
    Record<string, { form: ReturnType<typeof createInitialVerificationForm>; media: any[] }>
  >({})
  const [dragActive, setDragActive] = useState(false)
  const [drafts, setDrafts] = useState<any[]>([])
  const [agentRegion, setAgentRegion] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<any>(null)

  // Demo state to show the activation banner
  const [accountStatus, setAccountStatus] = useState<'pending_activation' | 'incomplete_profile' | 'active'>('pending_activation')

  const [taskStats, setTaskStats] = useState<any[]>([])
  const [monthlyVolume, setMonthlyVolume] = useState<number[]>([]) // for bar chart
  const [performanceMetrics, setPerformanceMetrics] = useState({ accuracyRate: 0, slaCompliance: 0, issueResolutionRate: 0 })

  const [shipments, setShipments] = useState<any[]>([])

  const [selectedShipmentStatus, setSelectedShipmentStatus] = useState<string | null>(null)
  const [shipmentLocationInput, setShipmentLocationInput] = useState('')
  const [shipmentNotesInput, setShipmentNotesInput] = useState('')

  const { token, role } = useAuth()
  const {
    notifications,
    unreadCount: unreadNotifications,
    readCount,
    markAsRead,
    markAllAsRead,
    clearRead,
    refresh,
  } = useNotifications({ enabled: Boolean(token || role) })

  const headerNotifications = notifications.map((n) => ({
    id: n.id,
    message: n.message,
    time: new Date(n.createdAt).toLocaleDateString(),
    unread: !n.isRead,
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'DELIVERED':
      case 'Delivered':
        return 'bg-primary text-primary-foreground'
      case 'SHIPPED':
      case 'In Transit':
        return 'bg-secondary text-secondary-foreground'
      case 'PROCESSING':
      case 'Pending Pickup':
      case 'PAID':
        return 'bg-muted text-muted-foreground'
      case 'Pending':
      case 'PENDING_PAYMENT':
        return 'bg-accent/20 text-accent'
      case 'Issue Flagged':
      case 'CANCELLED':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-border text-foreground'
    }
  }

  const openVerificationModal = (task: any) => {
    setSelectedTask(task)
    const taskId = task?.id
    const cachedProgress = taskId ? verificationProgressByTaskId[taskId] : undefined
    setVerificationForm(cachedProgress?.form || createInitialVerificationForm(task))
    setVerificationErrors({})
    setUploadedMediaFiles(cachedProgress?.media || [])
    setIsVerificationModalOpen(true)
  }

  const persistVerificationProgress = (taskId?: string | null) => {
    const id = taskId || selectedTask?.id
    if (!id) return
    setVerificationProgressByTaskId((prev) => ({
      ...prev,
      [id]: {
        form: verificationForm,
        media: uploadedMediaFiles,
      },
    }))
  }

  const handleVerificationModalChange = (open: boolean) => {
    if (!open) {
      persistVerificationProgress()
      setVerificationErrors({})
    }
    setIsVerificationModalOpen(open)
  }

  // Load server-driven data for dashboard (drafts for verification agents, shipments, profile)
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1'
    async function load() {
      let drafts: any[] = []
      let orders: any[] = []
      let regionLocal = ''
      let agentIdLocal = ''
      try {
        // Profile
        const pres = await fetch(`${base}/users/me`, { credentials: 'include' })
        if (pres.ok) {
          const body = await pres.json()
          const data = body.data || {}
          const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ')
          // Prefer default address city for agent service area, fall back to agentProfile/artisanProfile
          const defaultAddr = (data.addresses || []).find((a: any) => a.isDefault) || (data.addresses || [])[0]
          const serviceRegions = defaultAddr?.city || data.agentProfile?.city || data.artisanProfile?.region || ''
          // store agent region to filter shipments
          setAgentRegion(serviceRegions || null)
          regionLocal = serviceRegions || ''
          // store agent id to filter assigned drafts
          setAgentId(data.id || null)
          agentIdLocal = data.id || ''
          setAccountStatus(!data.artisanProfile ? 'incomplete_profile' : data.artisanProfile.verificationStatus === 'PENDING' ? 'incomplete_profile' : 'active')
        }
      } catch (err) {
        // ignore
      }

      try {
        const draftsUrl = `${base}/verifications/products/drafts${role === 'VERIFICATION_AGENT' ? '?assigned=true' : ''}`
        const dres = await fetch(draftsUrl, { credentials: 'include' })
        if (dres.ok) {
          const body = await dres.json()
          drafts = body.data || []

          const mappedDrafts = drafts.map((d:any) => ({ id: d.id, type: d.status, name: d.title || d.artisan?.firstName || 'Unknown', location: d.artisan?.artisanProfile?.region || '', date: d.createdAt, status: d.status, artisanPhone: d.artisan?.phone, artisanEmail: d.artisan?.email, sampleTitle: d.title || '', createdAt: d.createdAt, updatedAt: d.updatedAt }))
          setVerificationTasksData(mappedDrafts)
        }
      } catch (err) {
        // ignore
      }

      try {
        const ores = await fetch(`${base}/orders`, { credentials: 'include' })
        if (ores.ok) {
          const body = await ores.json()
          orders = body.data?.items || []

          // Filter orders by agent region (if available)
          const region = regionLocal || agentRegion || ''
          const matchesRegion = (o: any) => {
            if (!region) return true
            const city = (o.shippingAddress?.city || o.address?.city || '').toString().toLowerCase()
            const addrRegion = (o.shippingAddress?.region || o.address?.region || '').toString().toLowerCase()
            const r = region.toString().toLowerCase()
            return city.includes(r) || addrRegion.includes(r) || (o.destination || '').toString().toLowerCase().includes(r)
          }

          const filtered = orders.filter(matchesRegion)
          const mappedOrders = filtered.map((o:any) => ({ id: o.id, order: o.id, customer: o.customer?.firstName || o.customerId, status: o.status, destination: o.shippingAddress?.city || o.address?.city || '', date: o.createdAt, history: [] }))
          setShipments(mappedOrders)
        }
      } catch (err) {
        // ignore
      }

      // Derive dashboard aggregates from fetched data and notifications
      try {
        const totalVerifications = drafts.length
        const pendingDrafts = drafts.filter((d:any) => !['AGENT_VERIFIED','PUBLISHED','APPROVED'].includes(d.status)).length
        const activeShipments = orders.filter((o:any) => ['PROCESSING','SHIPPED'].includes(o.status)).length
        const issuesFlagged = notifications.filter((n:any) => ['PRODUCT_REJECTED','GENERAL'].includes(n.type || '')).length

        setTaskStats([
          { title: 'Total Verifications', value: String(totalVerifications), icon: CheckCircle2 },
          { title: 'Pending Tasks', value: String(pendingDrafts), icon: Clock },
          { title: 'Active Shipments', value: String(activeShipments), icon: Truck },
          { title: 'Issues Flagged', value: String(issuesFlagged), icon: AlertCircle },
        ])

        // Monthly volume (last 7 months)
        const now = new Date()
        const months = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date()
          d.setMonth(now.getMonth() - (6 - i))
          return d
        })
        const volume = months.map((m) => drafts.filter((d:any) => { const dt = new Date(d.createdAt || d.date); return dt.getMonth() === m.getMonth() && dt.getFullYear() === m.getFullYear() }).length)
        setMonthlyVolume(volume)

        // Performance metrics
        const total = drafts.length || 1
        const approved = drafts.filter((d:any) => ['ADMIN_REVIEW','AGENT_VERIFIED','PUBLISHED','APPROVED'].includes(d.status)).length
        const within48h = drafts.filter((d:any) => { if (!d.createdAt || !d.updatedAt) return false; const diff = new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime(); return diff <= 48 * 60 * 60 * 1000 }).length
        const issuesResolved = drafts.filter((d:any) => d.status !== 'REJECTED').length
        setPerformanceMetrics({ accuracyRate: Math.round((approved / total) * 100 * 10) / 10, slaCompliance: Math.round((within48h / total) * 100), issueResolutionRate: Math.round((issuesResolved / total) * 100) })
      } catch (err) {
        // ignore
      }
    }
    load()
  }, [token, role, notifications])

  const openShipmentModal = (shipment: any) => {
    setSelectedShipment(shipment)
    const nextStatuses = AGENT_SHIPMENT_TRANSITIONS[shipment.status] || []
    setSelectedShipmentStatus(nextStatuses[0] || shipment.status)
    setShipmentLocationInput('')
    setShipmentNotesInput('')
    setIsShipmentUpdateModalOpen(true)
  }

  const handleConfirmShipmentUpdate = () => {
    if (!selectedShipment || !selectedShipmentStatus) return
    const allowed = AGENT_SHIPMENT_TRANSITIONS[selectedShipment.status] || []
    if (!allowed.includes(selectedShipmentStatus)) {
      toast.error('Invalid status transition. Please choose the next valid stage.')
      return
    }

    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1'
    fetch(`${base}/orders/${selectedShipment.order}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: selectedShipmentStatus }) })
      .then(async (res) => {
        if (!res.ok) throw new Error('Update failed')
        const body = await res.json()
        const updated = body.data
        setShipments((prev) => prev.map((s) => (s.id === selectedShipment.id ? { ...s, status: updated.status } : s)))
        toast.success('Shipment status updated and customer notified.')
        setIsShipmentUpdateModalOpen(false)
      })
      .catch(() => {
        toast.error('Failed to update shipment status')
      })
  }

  const handleMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    handleFilesAdded(files)
  }

  const handleFilesAdded = async (files: File[]) => {
    const MAX_MB = 50
    const added: any[] = []
    for (const file of files) {
      const sizeMB = file.size / (1024 * 1024)
      const type = file.type
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      const threeDExts = ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', 'usdz']
      // Basic type whitelist, include common 3D extensions
      const allowed = /^(image|video)\//.test(type) || threeDExts.includes(ext)
      if (!allowed) {
        toast.error(`${file.name}: Unsupported file type`)
        continue
      }
      if (sizeMB > MAX_MB) {
        toast.error(`${file.name}: File exceeds ${MAX_MB}MB limit`)
        continue
      }

      let finalFile: File = file
      // Simple image compression for large images
      if (/^image\//.test(type) && sizeMB > 5) {
        try {
          // compress image
          // eslint-disable-next-line no-await-in-loop
          finalFile = await compressImage(file, 0.8)
        } catch (e) {
          // fallback to original
        }
      }

      const previewUrl = URL.createObjectURL(finalFile)
      const is3D = threeDExts.includes(ext)
      added.push({ file: finalFile, name: finalFile.name, size: finalFile.size, type: finalFile.type, previewUrl, status: 'pending', progress: 0, is3D, ext })
    }
    if (added.length) setUploadedMediaFiles((prev) => [...prev, ...added])
  }

  const compressImage = (file: File, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxW = 1920
          const scale = Math.min(1, maxW / img.width)
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file)
              const compressed = new File([blob], file.name, { type: 'image/jpeg' })
              resolve(compressed)
            },
            'image/jpeg',
            quality,
          )
        }
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = URL.createObjectURL(file)
      } catch (err) {
        reject(err)
      }
    })
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (!files.length) return
    handleFilesAdded(files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }

  const removeUploadedMedia = (fileName: string) => {
    setUploadedMediaFiles((prev) => prev.filter((m) => m.name !== fileName))
  }

  const uploadFile = (mediaItem: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fd = new FormData()
      fd.append('files', mediaItem.file)
      const xhr = new XMLHttpRequest()
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1'
      xhr.open('POST', `${base}/uploads`)
      xhr.withCredentials = true
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100)
          setUploadedMediaFiles((prev) => prev.map((m) => (m.name === mediaItem.name ? { ...m, progress: pct, status: 'uploading' } : m)))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const body = JSON.parse(xhr.responseText)
            // body.data is an array of created media records
            const created = Array.isArray(body.data) ? body.data : []
            const uploadedUrl = created[0]?.url || mediaItem.name
            setUploadedMediaFiles((prev) => prev.map((m) => (m.name === mediaItem.name ? { ...m, status: 'uploaded', progress: 100, uploadedAt: new Date().toISOString(), uploadedUrl } : m)))
            resolve(uploadedUrl)
          } catch {
            setUploadedMediaFiles((prev) => prev.map((m) => (m.name === mediaItem.name ? { ...m, status: 'uploaded', progress: 100, uploadedAt: new Date().toISOString() } : m)))
            resolve(mediaItem.name)
          }
        } else {
          setUploadedMediaFiles((prev) => prev.map((m) => (m.name === mediaItem.name ? { ...m, status: 'error', error: `Upload failed (${xhr.status})` } : m)))
          reject(new Error('Upload failed'))
        }
      }
      xhr.onerror = () => {
        setUploadedMediaFiles((prev) => prev.map((m) => (m.name === mediaItem.name ? { ...m, status: 'error', error: 'Network error' } : m)))
        reject(new Error('Network error'))
      }
      xhr.send(fd)
    })
  }

  const handleRetryUpload = async (mediaItem: any) => {
    setUploadedMediaFiles((prev) => prev.map((m) => (m.name === mediaItem.name ? { ...m, status: 'pending', progress: 0 } : m)))
    try {
      await uploadFile(mediaItem)
      toast.success(`${mediaItem.name} uploaded`)
    } catch (e) {
      toast.error(`${mediaItem.name} upload failed`)
    }
  }

  // duplicate removed earlier

  const handleSubmitVerification = async () => {
    if (!verificationForm.measurements.trim()) {
      setVerificationErrors({ measurements: 'Measurements are required.' })
      toast.error('Please fill in mandatory measurements before submission.')
      return
    }
    // Upload any pending media
    const uploadedUrls: string[] = []
    let modelUrl: string | null = null;
    for (const media of uploadedMediaFiles) {
      let url = media.status === 'uploaded' ? (media.uploadedUrl || media.name) : null;
      if (!url) {
        try {
          url = await uploadFile(media)
        } catch (e) {
          toast.error(`Failed to upload ${media.name}. Please retry.`)
          return
        }
      }
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
      if (['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', 'usdz'].includes(ext)) {
        modelUrl = url;
      } else {
        uploadedUrls.push(url);
      }
    }

    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1'
    try {
      const patchPayload = buildVerificationDraftPayload(verificationForm, { uploadedUrls, modelUrl })

      // 1. Update draft with agent inputs
      const updateDraftRes = await fetch(`${base}/verifications/products/drafts/${selectedTask?.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(patchPayload)
      });
      
      if (!updateDraftRes.ok) {
        const message = await parseApiErrorMessage(updateDraftRes, 'Failed to update draft with verification data')
        throw new Error(message)
      }

      // 2. Mark draft as agent verified
      const reviewRes = await fetch(`${base}/verifications/products/drafts/${selectedTask?.id}/verify`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ notes: verificationForm.culturalNotes || '' })
      });
      
      if (!reviewRes.ok) {
        const message = await parseApiErrorMessage(reviewRes, 'Failed to verify draft')
        throw new Error(message)
      }
      
      const body = await reviewRes.json();
      const draft = body.data?.draft || body.data;

      // Add created draft to local list
      if (draft) setDrafts((prev) => [draft, ...prev])
      setVerificationTasksData((prev) => prev.map((task) => (task.id === selectedTask?.id ? { ...task, status: 'Completed' } : task)))
      if (selectedTask?.id) {
        setVerificationProgressByTaskId((prev) => {
          const next = { ...prev }
          delete next[selectedTask.id]
          return next
        })
      }
      toast.success('Verification submitted. Product Draft updated and marked as Verified.')
      setIsVerificationModalOpen(false)
      setSelectedDraft(draft)
      setIsDraftModalOpen(true)
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Failed to submit verification'
      toast.error(message)
    }
  }

  const saveDraft = () => {
    const draft = {
      id: `D-${Date.now()}`,
      linkedSampleId: selectedTask?.id,
      createdAt: new Date().toISOString(),
      agentInput: {
        measurements: verificationForm.measurements,
        materials: verificationForm.materials,
        culturalNotes: verificationForm.culturalNotes,
        suggestedPricing: verificationForm.suggestedPricing,
        mediaFiles: uploadedMediaFiles.map((m) => m.name),
      },
    }
    setDrafts((prev) => [draft, ...prev])
    toast.success('Draft saved locally')
    setSelectedDraft(draft)
    setIsDraftModalOpen(true)
  }

  const getDraftViewData = (draft: any) => {
    if (!draft) return null
    const isLocal = Boolean(draft.agentInput)
    const dimensions = draft.dimensions as { measurements?: string } | string | null | undefined
    const culturalMetadata = draft.culturalMetadata as { notes?: string } | null | undefined
    const extensionData = draft.extensionData as {
      suggestedPricing?: number | string
      mediaFiles?: string[]
      modelUrl?: string
    } | null | undefined

    const measurements = isLocal
      ? draft.agentInput?.measurements
      : typeof dimensions === 'object' && dimensions?.measurements
        ? dimensions.measurements
        : typeof dimensions === 'string'
          ? dimensions
          : '—'

    const materials = isLocal
      ? draft.agentInput?.materials
      : Array.isArray(draft.materials)
        ? draft.materials.join(', ')
        : '—'

    const culturalNotes = isLocal
      ? draft.agentInput?.culturalNotes
      : culturalMetadata?.notes || draft.verificationNotes || '—'

    const suggestedPricing = isLocal
      ? draft.agentInput?.suggestedPricing
      : extensionData?.suggestedPricing ?? '—'

    const mediaFiles: string[] = isLocal
      ? draft.agentInput?.mediaFiles || []
      : [
          ...(Array.isArray(extensionData?.mediaFiles) ? extensionData.mediaFiles : []),
          ...(extensionData?.modelUrl ? [extensionData.modelUrl] : []),
        ]

    return {
      id: draft.id,
      linkedSampleId: draft.linkedSampleId || draft.sampleId || '—',
      title: draft.title || '—',
      description: draft.description || '—',
      category: draft.category || '—',
      price: draft.price != null ? String(draft.price) : '—',
      currency: draft.currency || 'ETB',
      stock: draft.stock != null ? String(draft.stock) : '—',
      status: draft.status || 'Local draft',
      tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : '—',
      measurements: measurements || '—',
      materials: materials || '—',
      culturalNotes: culturalNotes || '—',
      suggestedPricing: suggestedPricing != null && suggestedPricing !== '' ? String(suggestedPricing) : '—',
      mediaFiles,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    }
  }

  const draftView = getDraftViewData(selectedDraft)

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        statusText="Real-time sync active"
        notifications={headerNotifications}
        unreadNotifications={unreadNotifications}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearRead={clearRead}
        readCount={readCount}
        refresh={refresh}
      />

      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="font-druk-medium text-3xl md:text-4xl uppercase tracking-[0.04em] mb-2">Agent Dashboard</h1>
            <p className="font-inter text-muted-foreground">Manage verification tasks and shipment logistics</p>
          </div>
          


          {/* {accountStatus === 'incomplete_profile' && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold text-primary flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Profile Incomplete
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Please complete your agent profile and upload your ID for verification.</p>
              </div>
              <Button onClick={() => setIsProfileModalOpen(true)}>
                Complete Profile
              </Button>
            </div>
          )} */}

          {/* Task Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {taskStats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-aeonik text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">{stat.title}</p>
                      <p className="font-druk-medium text-2xl">{stat.value}</p>
                    </div>
                    <Icon className="w-8 h-8 text-secondary opacity-20" />
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="verification" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto md:h-10 gap-2 mb-8 bg-transparent md:bg-muted p-0 md:p-1">
              <TabsTrigger value="verification" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Verification Tasks</TabsTrigger>
              <TabsTrigger value="shipments" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Shipments</TabsTrigger>
              <TabsTrigger value="verified" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Verified Products</TabsTrigger>
              <TabsTrigger value="reports" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">My Reports</TabsTrigger>
            </TabsList>

            {/* Verification Tasks Tab */}
            <TabsContent value="verification" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">Assigned Tasks</h2>
              </div>

              <div className="space-y-3">
                {verificationTasksData.map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="font-aeonik bg-primary/20 text-primary">{task.type}</Badge>
                          <span className="text-xs text-muted-foreground font-mono">{task.id}</span>
                        </div>
                        <p className="font-inter font-semibold">{task.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {task.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {task.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                        {task.status === 'Pending' ? (
                          <Button className="bg-primary" onClick={() => openVerificationModal(task)}>
                            Verify Data
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => openVerificationModal(task)}>
                            View Report
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Shipments Tab */}
            <TabsContent value="shipments" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">Shipment Logistics</h2>
              </div>

              <div className="overflow-x-auto bg-card rounded-lg border border-border">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Shipment ID</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Order</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Destination</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Status</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Date</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr key={shipment.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold">{shipment.id}</td>
                        <td className="py-3 px-4">{shipment.order}</td>
                        <td className="py-3 px-4">{shipment.destination}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(shipment.status)}>{ORDER_STATUS_LABELS[shipment.status] || shipment.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">{shipment.date}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openShipmentModal(shipment)}>
                              Update Status
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Verified Products Tab */}
            <TabsContent value="verified" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">Verified Products</h2>
                <Button variant="outline" onClick={() => { /* potential export */ }}>Export</Button>
              </div>

              {drafts.length === 0 ? (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">No verified products yet. Submit a verification to create a draft.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {drafts.map((d) => (
                    <Card key={d.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground font-mono">{d.id}</div>
                        <div className="font-semibold">Sample: {d.linkedSampleId}</div>
                        <div className="text-sm text-muted-foreground">Submitted: {new Date(d.submittedAt || d.createdAt || Date.now()).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedDraft(d); setIsDraftModalOpen(true); }}>
                          View Draft
                        </Button>
                        <Button size="sm" onClick={() => { /* promote to product flow */ toast.info('Promote flow not implemented') }}>
                          Promote
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reports & Metrics Tab */}
            <TabsContent value="reports" className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">Detailed Analytics</h2>
                <Button variant="outline">Export CSV</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6">
                  <h3 className="font-aeonik text-xs uppercase tracking-[0.12em] text-muted-foreground mb-4">Verification Volume (Monthly)</h3>
                  <div className="h-48 flex items-end gap-2 bg-muted/10 p-4 rounded-lg border border-border/50">
                    {/* Monthly verification volume (last 7 months) */}
                    {(monthlyVolume.length ? monthlyVolume : [0,0,0,0,0,0,0]).map((height, idx) => (
                      <div key={idx} className="flex-1 bg-primary/80 hover:bg-primary transition-all rounded-t-sm relative group" style={{ height: `${Math.min(100, height)}%` }}>
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">{height}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-aeonik text-xs uppercase tracking-[0.12em] text-muted-foreground mb-4">Performance Metrics</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Accuracy Rate</span>
                        <span className="font-bold">{performanceMetrics.accuracyRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${performanceMetrics.accuracyRate}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>SLA Compliance (48h)</span>
                        <span className="font-bold">{performanceMetrics.slaCompliance}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-secondary h-2 rounded-full" style={{ width: `${performanceMetrics.slaCompliance}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Issue Resolution Rate</span>
                        <span className="font-bold">{performanceMetrics.issueResolutionRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${performanceMetrics.issueResolutionRate}%` }}></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* 1. Account Activation / Password Setup Modal */}
      <Dialog open={isActivationModalOpen} onOpenChange={setIsActivationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Password Confirmation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Please confirm your password to activate your agent account.</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">New Password</label>
              <input type="password" className="w-full p-3 border border-border rounded bg-background" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Confirm Password</label>
              <input type="password" className="w-full p-3 border border-border rounded bg-background" placeholder="••••••••" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => {
                setIsActivationModalOpen(false);
                setAccountStatus('incomplete_profile');
              }} className="w-full">Activate Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Profile Completion Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Complete Agent Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                <input type="text" defaultValue="John Doe" className="w-full p-3 border border-border rounded bg-muted cursor-not-allowed" disabled />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Service City(s)</label>
                <input type="text" placeholder="e.g. Addis Ababa, Oromia" className="w-full p-3 border border-border rounded bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Upload Official ID</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-3">Upload a scanned copy of your Government ID</p>
                <Button type="button" variant="outline" size="sm">Select File</Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="outline">Later</Button>
              </DialogClose>
              <Button onClick={() => {
                setIsProfileModalOpen(false);
                setAccountStatus('active');
              }}>Submit Profile</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Physical Verification Data Entry & Media Upload Modal */}
      <Dialog open={isVerificationModalOpen} onOpenChange={handleVerificationModalChange}>
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden border-border/60 p-0 shadow-2xl sm:rounded-2xl">
          {/* Hero header */}
          <div className="relative shrink-0 overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-6 py-5 pr-14">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-secondary/20 blur-2xl" />
            <DialogHeader className="relative space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-aeonik text-[10px] uppercase tracking-wider">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Verification workspace
                </Badge>
                {selectedTask?.status && (
                  <Badge className={getStatusColor(selectedTask.status)}>{selectedTask.status}</Badge>
                )}
              </div>
              <DialogTitle className="font-aeonik text-xl uppercase tracking-[0.08em] sm:text-2xl">
                Verification Data Entry
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  {selectedTask?.id}
                </span>
                <span className="hidden text-border sm:inline">|</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {selectedTask?.location || 'Location TBD'}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="relative mt-4 flex flex-col gap-3 rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-inter text-base font-semibold">{selectedTask?.name}</p>
                <p className="text-xs text-muted-foreground">Task type · {selectedTask?.type || 'Draft verification'}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {selectedTask?.date ? new Date(selectedTask.date).toLocaleDateString() : 'Today'}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Product draft fields */}
              <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-[2px]">
                <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-aeonik text-sm font-bold uppercase tracking-[0.1em]">Product draft</h3>
                    <p className="text-xs text-muted-foreground">Core listing fields from schema</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
                    <Input
                      className={verificationFieldClass}
                      placeholder="Handwoven cotton shawl"
                      value={verificationForm.title}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                    <Textarea
                      className={`${verificationFieldClass} min-h-[88px] resize-y`}
                      placeholder="Describe craftsmanship, finish, and usage..."
                      value={verificationForm.description}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                    <Input
                      className={verificationFieldClass}
                      placeholder="Textiles"
                      value={verificationForm.category}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
                    <Input
                      className={verificationFieldClass}
                      placeholder="ETB"
                      value={verificationForm.currency}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, currency: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Price</Label>
                    <Input
                      type="number"
                      className={verificationFieldClass}
                      placeholder="0.00"
                      value={verificationForm.price}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock</Label>
                    <Input
                      type="number"
                      min={0}
                      className={verificationFieldClass}
                      placeholder="0"
                      value={verificationForm.stock}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, stock: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator className="bg-border/60" />

                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary-foreground">
                    <Layers className="h-3.5 w-3.5" />
                  </span>
                  <p className="font-aeonik text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Verification details</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Materials verified</Label>
                  <Textarea
                    className={`${verificationFieldClass} min-h-[64px]`}
                    placeholder="E.g., 100% pure cotton, natural dye..."
                    value={verificationForm.materials}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, materials: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</Label>
                  <Input
                    className={verificationFieldClass}
                    placeholder="heritage, handmade, cotton"
                    value={verificationForm.tags}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, tags: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Comma-separated</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Measurements / dimensions / weight <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    className={`${verificationFieldClass} ${verificationErrors.measurements ? 'border-destructive ring-destructive/30' : ''}`}
                    placeholder="20cm × 15cm · 1.2kg"
                    value={verificationForm.measurements}
                    onChange={(e) => {
                      setVerificationForm((prev) => ({ ...prev, measurements: e.target.value }))
                      if (verificationErrors.measurements) setVerificationErrors({})
                    }}
                  />
                  {verificationErrors.measurements && (
                    <p className="text-xs text-destructive">{verificationErrors.measurements}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cultural context</Label>
                  <Textarea
                    className={`${verificationFieldClass} min-h-[64px]`}
                    placeholder="Confirm cultural authenticity markers..."
                    value={verificationForm.culturalNotes}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, culturalNotes: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pricing recommendation (USD)</Label>
                  <Input
                    type="number"
                    className={verificationFieldClass}
                    placeholder="Suggest retail price..."
                    value={verificationForm.suggestedPricing}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, suggestedPricing: e.target.value }))}
                  />
                </div>
              </section>

              {/* Media upload */}
              <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-[2px]">
                <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-aeonik text-sm font-bold uppercase tracking-[0.1em]">Professional media</h3>
                    <p className="text-xs text-muted-foreground">Photos, video & 3D assets</p>
                  </div>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]'
                      : 'border-border/70 bg-gradient-to-b from-muted/20 to-background hover:border-primary/40 hover:bg-muted/25'
                  }`}
                >
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${dragActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    <div className="flex gap-1">
                      <Camera className="h-5 w-5" />
                      <Upload className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="font-inter text-sm font-semibold">Drag & drop media files</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    JPG, PNG, MP4, GLTF · max 50MB per file
                  </p>
                  <input
                    id="verification-media-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept=".jpg,.jpeg,.png,.mp4,.gltf,.glb,.obj,.fbx,.stl,.ply,.usdz"
                    onChange={handleMediaUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 rounded-full border-border/80 px-5 shadow-sm"
                    onClick={() => (document.getElementById('verification-media-upload') as HTMLInputElement)?.click()}
                  >
                    Browse files
                  </Button>

                  {uploadedMediaFiles.length > 0 && (
                    <div className="mt-6 w-full space-y-2 text-left">
                      {uploadedMediaFiles.map((m) => (
                        <div
                          key={m.name}
                          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/50">
                              {m.previewUrl ? (
                                <img src={m.previewUrl} alt={m.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground px-1 truncate">{m.name}</span>
                              )}
                            </div>
                            <div className="min-w-0 text-sm">
                              <div className="truncate font-medium">{m.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {m.size ? `${Math.round(m.size / 1024)} KB` : ''}
                                {m.is3D ? ' · 3D model' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {m.status === 'uploading' && (
                              <div className="h-2 w-full min-w-[120px] overflow-hidden rounded-full bg-muted sm:w-28">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.progress || 0}%` }} />
                              </div>
                            )}
                            {m.status === 'error' && <span className="text-xs text-destructive">{m.error}</span>}
                            {m.status === 'error' && (
                              <Button size="sm" variant="ghost" onClick={() => handleRetryUpload(m)}>Retry</Button>
                            )}
                            {m.is3D && (
                              <a
                                href={m.previewUrl}
                                download={m.name}
                                className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                              >
                                Download
                              </a>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => removeUploadedMedia(m.name)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Artisan context */}
            <section className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-foreground shadow-sm ring-1 ring-border/50">
                  <UserCheck className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="font-aeonik text-sm font-bold uppercase tracking-[0.1em]">Artisan & sample</h4>
                  <p className="text-xs text-muted-foreground">Pre-populated reference</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Sample', value: selectedTask?.sampleTitle || selectedTask?.name },
                  { label: 'Sample ID', value: selectedTask?.id, mono: true },
                  { label: 'Artisan', value: selectedTask?.name },
                  { label: 'Phone', value: selectedTask?.artisanPhone || '—', icon: Phone },
                  { label: 'Email', value: selectedTask?.artisanEmail || '—', icon: Mail },
                  { label: 'Location', value: selectedTask?.location || '—', icon: MapPin },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 shadow-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className={`mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground ${item.mono ? 'font-mono text-xs' : ''}`}>
                      {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      <span className="truncate">{item.value}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sticky footer — always visible */}
          <div className="z-10 flex shrink-0 flex-col-reverse gap-3 border-t border-border/60 bg-background px-6 py-4 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <AlertCircle className="mr-2 h-4 w-4" />
              Flag issue
            </Button>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" className="rounded-full" onClick={saveDraft}>
                Save draft
              </Button>
              <Button className="rounded-full px-6 shadow-md" onClick={handleSubmitVerification}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit verification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Order Status Update Modal */}
      <Dialog open={isShipmentUpdateModalOpen} onOpenChange={setIsShipmentUpdateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Update Shipment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
             <div className="bg-muted/30 p-3 rounded-lg border border-border mb-4">
              <p className="text-sm font-semibold">Tracking: {selectedShipment?.id}</p>
              <p className="text-xs text-muted-foreground">Order: {selectedShipment?.order} | To: {selectedShipment?.destination}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">New Status</label>
              <select
                className="w-full p-3 border border-border rounded bg-background"
                value={selectedShipmentStatus || selectedShipment?.status}
                onChange={(e) => setSelectedShipmentStatus(e.target.value)}
                disabled={(AGENT_SHIPMENT_TRANSITIONS[selectedShipment?.status] || []).length === 0}
              >
                {(AGENT_SHIPMENT_TRANSITIONS[selectedShipment?.status] || []).map((opt) => (
                  <option key={opt} value={opt}>{ORDER_STATUS_LABELS[opt] || opt}</option>
                ))}
              </select>
              {(AGENT_SHIPMENT_TRANSITIONS[selectedShipment?.status] || []).length === 0 && (
                <p className="text-xs text-muted-foreground">No further status updates are available for this shipment.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Location/Checkpoint</label>
              <input type="text" className="w-full p-3 border border-border rounded bg-background" placeholder="E.g., Bole International Airport" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Update Notes</label>
              <textarea className="w-full p-3 border border-border rounded bg-background min-h-[80px]" placeholder="Add any relevant tracking notes..." />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleConfirmShipmentUpdate} disabled={(AGENT_SHIPMENT_TRANSITIONS[selectedShipment?.status] || []).length === 0}>Confirm Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />

      {/* Draft Viewer Modal */}
      <Dialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden border-border/60 p-0 shadow-2xl sm:rounded-2xl">
          <div className="relative shrink-0 overflow-hidden border-b border-border/60 bg-gradient-to-br from-secondary/15 via-background to-primary/10 px-6 py-5 pr-14">
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/20 blur-2xl" />
            <DialogHeader className="relative space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-secondary/40 bg-secondary/10 font-aeonik text-[10px] uppercase tracking-wider">
                  <FileText className="mr-1 h-3 w-3" />
                  Draft preview
                </Badge>
                {draftView?.status && (
                  <Badge className={getStatusColor(draftView.status)}>{draftView.status}</Badge>
                )}
              </div>
              <DialogTitle className="font-aeonik text-xl uppercase tracking-[0.08em] sm:text-2xl">
                Product Draft
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {draftView ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      {draftView.id}
                    </span>
                    <span className="hidden text-border sm:inline">|</span>
                    <span className="text-muted-foreground">
                      Linked sample · <span className="font-mono text-foreground">{draftView.linkedSampleId}</span>
                    </span>
                  </>
                ) : (
                  'Review saved or submitted draft details'
                )}
              </DialogDescription>
            </DialogHeader>
            {draftView && (
              <div className="relative mt-4 rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                <p className="font-inter text-base font-semibold">{draftView.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{draftView.description}</p>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {!draftView ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 py-16 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No draft selected</p>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-[2px]">
                  <div className="mb-4 flex items-center gap-3 border-b border-border/50 pb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-aeonik text-sm font-bold uppercase tracking-[0.1em]">Listing details</h3>
                      <p className="text-xs text-muted-foreground">Product draft schema fields</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Category', value: draftView.category },
                      { label: 'Price', value: `${draftView.price} ${draftView.currency}` },
                      { label: 'Stock', value: draftView.stock },
                      { label: 'Tags', value: draftView.tags },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 shadow-sm"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-[2px]">
                  <div className="mb-4 flex items-center gap-3 border-b border-border/50 pb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-aeonik text-sm font-bold uppercase tracking-[0.1em]">Agent verification</h3>
                      <p className="text-xs text-muted-foreground">Physical inspection & notes</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Measurements', value: draftView.measurements },
                      { label: 'Materials', value: draftView.materials },
                      { label: 'Cultural notes', value: draftView.culturalNotes, span: true },
                      { label: 'Suggested pricing (USD)', value: draftView.suggestedPricing },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl border border-border/50 bg-background/80 px-4 py-3 shadow-sm ${item.span ? 'sm:col-span-2' : ''}`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {draftView.mediaFiles.length > 0 && (
                  <section className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-[2px]">
                    <div className="mb-4 flex items-center gap-3 border-b border-border/50 pb-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-aeonik text-sm font-bold uppercase tracking-[0.1em]">Media assets</h3>
                        <p className="text-xs text-muted-foreground">{draftView.mediaFiles.length} file(s)</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {draftView.mediaFiles.map((url: string) => {
                        const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)
                        return (
                          <div
                            key={url}
                            className="group overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"
                          >
                            {isImage ? (
                              <div className="h-20 w-28 bg-muted">
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="flex h-20 w-36 items-center gap-2 px-3">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-xs font-medium">{url.split('/').pop() || url}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {(draftView.createdAt || draftView.updatedAt) && (
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {draftView.createdAt && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Created {new Date(draftView.createdAt).toLocaleString()}
                      </span>
                    )}
                    {draftView.updatedAt && (
                      <span className="inline-flex items-center gap-1">
                        <Edit className="h-3.5 w-3.5" />
                        Updated {new Date(draftView.updatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="z-10 flex shrink-0 justify-end gap-2 border-t border-border/60 bg-background px-6 py-4 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.12)]">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full px-6">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik      { font-family: var(--font-aeonik), sans-serif; }
        .font-inter       { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  )
}