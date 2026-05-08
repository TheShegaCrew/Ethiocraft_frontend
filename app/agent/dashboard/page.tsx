'use client'

import { ChangeEvent, useState } from 'react'
import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
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
  Edit
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'


export default function AgentDashboard() {
  // Modal States
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false) // Account Activation & Password Setup
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false) // Profile Completion
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false) // Physical Verification Data Entry & Media
  const [isShipmentUpdateModalOpen, setIsShipmentUpdateModalOpen] = useState(false) // Order Status Update
  
  // Selection States
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedShipment, setSelectedShipment] = useState<any>(null)
  const [verificationTasksData, setVerificationTasksData] = useState([
    { id: 'VT-101', type: 'Artisan Verification', name: 'Bekele Wolde', location: 'Addis Ababa', date: 'Dec 16, 2024', status: 'Pending', artisanPhone: '+251 911 345 678', artisanEmail: 'bekele.wolde@ethiocraft.example', sampleTitle: 'Hand-carved Coffee Table Set' },
    { id: 'VT-102', type: 'Product Authenticity Check', name: 'Traditional Habesha Dress', location: 'Hawassa', date: 'Dec 15, 2024', status: 'Pending', artisanPhone: '+251 923 567 234', artisanEmail: 'selamawit.tesfaye@ethiocraft.example', sampleTitle: 'Traditional Habesha Dress' },
    { id: 'VT-103', type: 'Artisan Documents', name: 'Selam Adeyemi', location: 'Dire Dawa', date: 'Dec 14, 2024', status: 'Completed', artisanPhone: '+251 934 998 211', artisanEmail: 'selam.adeyemi@ethiocraft.example', sampleTitle: 'Clay Pottery Collection' },
  ])
  const [verificationForm, setVerificationForm] = useState({
    measurements: '',
    materials: '',
    culturalNotes: '',
    suggestedPricing: '',
  })
  const [verificationErrors, setVerificationErrors] = useState<{ measurements?: string }>({})
  const [uploadedMediaFiles, setUploadedMediaFiles] = useState<File[]>([])

  // Demo state to show the activation banner
  const [accountStatus, setAccountStatus] = useState<'pending_activation' | 'incomplete_profile' | 'active'>('pending_activation')

  const taskStats = [
    { title: 'Total Verifications', value: '156', icon: CheckCircle2 },
    { title: 'Pending Tasks', value: '12', icon: Clock },
    { title: 'Active Shipments', value: '34', icon: Truck },
    { title: 'Issues Flagged', value: '3', icon: AlertCircle },
  ]

  const shipments = [
    { id: 'SHP-001', order: 'ORD-001', customer: 'Ahmed Hassan', status: 'In Transit', destination: 'Addis Ababa', date: 'Dec 15, 2024' },
    { id: 'SHP-002', order: 'ORD-002', customer: 'Fatima Ali', status: 'Pending Pickup', destination: 'Dire Dawa', date: 'Dec 14, 2024' },
    { id: 'SHP-003', order: 'ORD-003', customer: 'Mohammed Taye', status: 'Delivered', destination: 'Mekelle', date: 'Dec 12, 2024' },
  ]

  const notifications = [
    { id: 1, type: 'assignment', message: 'New Verification Task: Authenticate 5 Pottery items in Hawassa.', time: '10 mins ago', unread: true },
    { id: 2, type: 'alert', message: 'Shipment SHP-002 is delayed. Action required.', time: '1 hour ago', unread: true },
    { id: 3, type: 'system', message: 'Your weekly performance report is ready.', time: '1 day ago', unread: false },
  ]
  const unreadNotifications = notifications.filter((note) => note.unread).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered':
        return 'bg-primary text-primary-foreground'
      case 'In Transit':
        return 'bg-secondary text-secondary-foreground'
      case 'Pending Pickup':
        return 'bg-muted text-muted-foreground'
      case 'Pending':
        return 'bg-accent/20 text-accent'
      case 'Issue Flagged':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-border text-foreground'
    }
  }

  const openVerificationModal = (task: any) => {
    setSelectedTask(task)
    setVerificationForm({
      measurements: '',
      materials: '',
      culturalNotes: '',
      suggestedPricing: '',
    })
    setVerificationErrors({})
    setUploadedMediaFiles([])
    setIsVerificationModalOpen(true)
  }

  const openShipmentModal = (shipment: any) => {
    setSelectedShipment(shipment)
    setIsShipmentUpdateModalOpen(true)
  }

  const handleMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploadedMediaFiles((prev) => [...prev, ...files])
  }

  const removeUploadedMedia = (fileName: string) => {
    setUploadedMediaFiles((prev) => prev.filter((file) => file.name !== fileName))
  }

  const handleSubmitVerification = () => {
    if (!verificationForm.measurements.trim()) {
      setVerificationErrors({ measurements: 'Measurements are required.' })
      toast.error('Please fill in mandatory measurements before submission.')
      return
    }

    const metadataPayload = {
      draftStatus: 'Product Draft',
      linkedSampleId: selectedTask?.id,
      sampleStatusUpdate: 'Verified',
      submittedAt: new Date().toISOString(),
      agentInput: {
        measurements: verificationForm.measurements,
        materials: verificationForm.materials,
        culturalNotes: verificationForm.culturalNotes,
        suggestedPricing: verificationForm.suggestedPricing,
        mediaFiles: uploadedMediaFiles.map((file) => file.name),
      },
    }

    setVerificationTasksData((prev) =>
      prev.map((task) => (task.id === selectedTask?.id ? { ...task, status: 'Completed' } : task)),
    )

    console.log('Verification submission metadata:', metadataPayload)
    toast.success('Verification submitted. Product Draft saved and sample marked as Verified.')
    setIsVerificationModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        statusText="Real-time sync active"
        notifications={notifications.map((note) => ({
          id: note.id,
          message: note.message,
          time: note.time,
          unread: note.unread,
        }))}
        unreadNotifications={unreadNotifications}
      />

      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="font-druk-medium text-3xl md:text-4xl uppercase tracking-[0.04em] mb-2">Agent Dashboard</h1>
            <p className="font-inter text-muted-foreground">Manage verification tasks and shipment logistics</p>
          </div>
          
          {/* Account Activation / Profile Completion Banners */}
          {accountStatus === 'pending_activation' && (
            <div className="mb-6 p-4 bg-secondary/10 border border-secondary rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold text-secondary flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Account Activation Required
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Please confirm your password to complete account verification.</p>
              </div>
              <Button onClick={() => setIsActivationModalOpen(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Setup Password
              </Button>
            </div>
          )}

          {accountStatus === 'incomplete_profile' && (
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
          )}

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
            <TabsList className="grid w-full grid-cols-3 h-auto md:h-10 gap-2 mb-8 bg-transparent md:bg-muted p-0 md:p-1">
              <TabsTrigger value="verification" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Verification Tasks</TabsTrigger>
              <TabsTrigger value="shipments" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Shipments</TabsTrigger>
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
                          <Badge className={getStatusColor(shipment.status)}>{shipment.status}</Badge>
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
                    {/* Simulated Bar Chart */}
                    {[40, 60, 45, 80, 55, 90, 75].map((height, idx) => (
                      <div key={idx} className="flex-1 bg-primary/80 hover:bg-primary transition-all rounded-t-sm relative group" style={{ height: `${height}%` }}>
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
                        <span className="font-bold">98.5%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>SLA Compliance (48h)</span>
                        <span className="font-bold">92%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-secondary h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Issue Resolution Rate</span>
                        <span className="font-bold">88%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '88%' }}></div>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase">Service Region(s)</label>
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
      <Dialog open={isVerificationModalOpen} onOpenChange={setIsVerificationModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">
              Verification Data Entry <span className="text-muted-foreground font-mono text-sm normal-case ml-2">{selectedTask?.id}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-sm mb-1">{selectedTask?.name}</h4>
              <p className="text-xs text-muted-foreground">Task Type: {selectedTask?.type} | Location: {selectedTask?.location}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Form */}
              <div className="space-y-4">
                <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold border-b border-border pb-2">Physical Specs</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Materials Verified</label>
                  <textarea
                    className="w-full p-3 border border-border rounded bg-background min-h-[60px]"
                    placeholder="E.g., 100% pure cotton, natural dye..."
                    value={verificationForm.materials}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, materials: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Measurements / Dimensions / Weight *</label>
                  <input
                    type="text"
                    required
                    className={`w-full p-3 border rounded bg-background ${verificationErrors.measurements ? 'border-destructive' : 'border-border'}`}
                    placeholder="20cm x 15cm, 1.2kg"
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Cultural Context / Notes</label>
                  <textarea
                    className="w-full p-3 border border-border rounded bg-background min-h-[60px]"
                    placeholder="Confirm cultural authenticity markers..."
                    value={verificationForm.culturalNotes}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, culturalNotes: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Pricing Recommendation (USD)</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-border rounded bg-background"
                    placeholder="Suggest retail price..."
                    value={verificationForm.suggestedPricing}
                    onChange={(e) => setVerificationForm((prev) => ({ ...prev, suggestedPricing: e.target.value }))}
                  />
                </div>
              </div>

              {/* Media Upload */}
              <div className="space-y-4">
                <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold border-b border-border pb-2">Professional Media</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">High-Res Photos & 3D Scans</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/10 transition-colors hover:bg-muted/30 cursor-pointer flex flex-col items-center justify-center min-h-[220px]">
                    <div className="flex gap-2 mb-3">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">Drag & drop media files</p>
                    <p className="text-xs text-muted-foreground mb-4">Supports JPG, PNG, MP4, GLTF (max 50MB)</p>
                    <input
                      id="verification-media-upload"
                      type="file"
                      className="hidden"
                      multiple
                      accept=".jpg,.jpeg,.png,.mp4,.gltf"
                      onChange={handleMediaUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('verification-media-upload')?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                  {uploadedMediaFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Uploaded Media</p>
                      <div className="space-y-1">
                        {uploadedMediaFiles.map((file) => (
                          <div key={file.name} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded border border-border">
                            <span className="text-xs truncate max-w-[220px]">{file.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeUploadedMedia(file.name)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-sm mb-2">Artisan & Sample Details (Pre-populated)</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">Sample:</span> {selectedTask?.sampleTitle || selectedTask?.name}</p>
                <p><span className="font-medium text-foreground">Sample ID:</span> {selectedTask?.id}</p>
                <p><span className="font-medium text-foreground">Artisan Name:</span> {selectedTask?.name}</p>
                <p><span className="font-medium text-foreground">Artisan Phone:</span> {selectedTask?.artisanPhone || 'Not available'}</p>
                <p><span className="font-medium text-foreground">Artisan Email:</span> {selectedTask?.artisanEmail || 'Not available'}</p>
                <p><span className="font-medium text-foreground">Meeting Location:</span> {selectedTask?.location}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                Flag Issue
              </Button>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Save Draft</Button>
                </DialogClose>
                <Button onClick={handleSubmitVerification}>Submit Verification</Button>
              </div>
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
              <select className="w-full p-3 border border-border rounded bg-background" defaultValue={selectedShipment?.status}>
                <option value="Pending Pickup">Pending Pickup</option>
                <option value="In Transit">In Transit</option>
                <option value="Customs Clearing">Customs Clearing</option>
                <option value="Delivered">Delivered</option>
                <option value="Issue Flagged">Issue Flagged</option>
              </select>
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
              <Button>Confirm Update</Button>
            </div>
          </div>
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