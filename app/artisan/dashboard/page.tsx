'use client'

import { useState } from 'react'
import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Star, 
  Bell, 
  Upload, 
  MapPin, 
  CreditCard, 
  User,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

export default function ArtisanDashboard() {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const summaryCards = [
    {
      title: 'Total Sales',
      value: '$5,420.50',
      change: '+12.5%',
      icon: TrendingUp,
    },
    {
      title: 'Active Listings',
      value: '24',
      change: '+3',
      icon: Package,
    },
    {
      title: 'Orders This Month',
      value: '18',
      change: '+5',
      icon: ShoppingCart,
    },
    {
      title: 'Pending Samples',
      value: '5',
      change: '-1',
      icon: Upload,
    },
  ]

  const quickActions = [
    {
      title: 'Submit new sample',
      description: 'Upload product photos, videos, and metadata for review.',
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

  const recentOrders = [
    {

      id: 'ORD-001',
      customer: 'Ahmed Hassan',
      product: 'Traditional Habesha Dress',
      date: 'Dec 15, 2024',
      amount: '$149.99',
      status: 'Completed',
    },
    {
      id: 'ORD-002',
      customer: 'Fatima Ali',
      product: 'Hand-Woven Basket',
      date: 'Dec 14, 2024',
      amount: '$89.99',
      status: 'Shipped',
    },
    {
      id: 'ORD-003',
      customer: 'Mohammed Taye',
      product: 'Gold Filigree Jewelry',
      date: 'Dec 12, 2024',
      amount: '$199.99',
      status: 'Processing',
    },
  ]

  const products = [
    {
      id: 1,
      name: 'Traditional Habesha Dress',
      price: '$149.99',
      stock: 5,
      sales: 24,
      image: '/placeholder.svg?height=150&width=150',
    },
    {
      id: 2,
      name: 'Hand-Woven Basket',
      price: '$89.99',
      stock: 12,
      sales: 18,
      image: '/placeholder.svg?height=150&width=150',
    },
    {
      id: 3,
      name: 'Gold Filigree Jewelry',
      price: '$199.99',
      stock: 3,
      sales: 12,
      image: '/placeholder.svg?height=150&width=150',
    },
  ]

  const sampleHistory = [
    { id: 'SMP-101', name: 'Leather Messenger Bag', date: 'Dec 10, 2024', status: 'Approved', notes: 'Approved for artisan shop display.' },
    { id: 'SMP-102', name: 'Ceramic Vase', date: 'Dec 08, 2024', status: 'Rejected', notes: 'Needed stronger glaze finish and size adjustment.' },
    { id: 'SMP-103', name: 'Beaded Necklace', date: 'Dec 15, 2024', status: 'Pending Review', notes: 'Review in progress for product photography assets.' },
  ]

  const notifications = [
    {
      id: '1',
      type: 'approval',
      message: 'Your sample "Leather Messenger Bag" has been approved and is now live in your shop.',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: '2',
      type: 'order',
      message: 'New order received for "Traditional Habesha Dress" - Order #ORD-001',
      time: '5 hours ago',
      unread: true,
    },
    {
      id: '3',
      type: 'system',
      message: 'Your payout for December has been processed. Check your bank account.',
      time: '1 day ago',
      unread: false,
    },
    {
      id: '4',
      type: 'rejection',
      message: 'Sample "Ceramic Vase" was rejected. Please review feedback and resubmit.',
      time: '2 days ago',
      unread: false,
    },
  ]
  const unreadNotifications = notifications.filter((note) => note.unread).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Approved':
        return 'bg-primary text-primary-foreground'
      case 'Shipped':
        return 'bg-secondary text-secondary-foreground'
      case 'Processing':
      case 'Pending Review':
        return 'bg-muted text-muted-foreground'
      case 'Rejected':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-border text-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        statusText="Real-time socket connected"
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
            <h1 className="font-druk-medium text-3xl md:text-4xl uppercase tracking-[0.04em] mb-2">Artisan Dashboard</h1>
            <p className="font-inter text-muted-foreground">Manage your shop, products, and orders</p>
          </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card, i) => {
              const Icon = card.icon
              return (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-aeonik text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">{card.title}</p>
                      <p className="font-druk-medium text-2xl">{card.value}</p>
                      <p className="font-inter text-xs text-primary mt-2">{card.change} from last month</p>
                    </div>
                    <Icon className="w-8 h-8 text-secondary opacity-20" />
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Quick Actions */}
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
                  {action.onClick ? (
                    <Button className="mt-6 w-full bg-primary" onClick={action.onClick}>{action.label}</Button>
                  ) : (
                    <Button className="mt-6 bg-primary">{action.label}</Button>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto md:h-10 gap-2 mb-8 bg-transparent md:bg-muted p-0 md:p-1">
              <TabsTrigger value="orders" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Orders</TabsTrigger>
              <TabsTrigger value="products" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Products</TabsTrigger>
              <TabsTrigger value="samples" className="font-aeonik text-xs uppercase tracking-[0.12em] bg-muted md:bg-transparent">Samples</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">Recent Orders</h2>
                <Link href="/artisan/orders">
                  <Button variant="outline">View All</Button>
                </Link>
              </div>

              <div className="overflow-x-auto bg-card rounded-lg border border-border">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Order ID</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Customer</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Product</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Amount</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Status</th>
                      <th className="font-aeonik text-left text-xs uppercase tracking-[0.12em] py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold">{order.id}</td>
                        <td className="py-3 px-4">{order.customer}</td>
                        <td className="py-3 px-4 text-sm">{order.product}</td>
                        <td className="py-3 px-4 font-bold text-secondary">{order.amount}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/artisan/orders/${order.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">My Products</h2>
                
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-40 object-cover bg-muted"
                    />
                    <div className="p-4">
                      <h3 className="font-inter font-semibold mb-2">{product.name}</h3>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-druk-medium text-lg text-secondary">{product.price}</span>
                        <Badge variant="outline" className="font-aeonik text-xs uppercase tracking-[0.1em]">Stock: {product.stock}</Badge>
                      </div>
                      <p className="font-inter text-sm text-muted-foreground mb-3">{product.sales} sales</p>
                      <div className="flex gap-2">
                        <Link href={`/artisan/products/${product.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full bg-transparent">Edit</Button>
                        </Link>
                        <Button variant="outline" size="sm">Delete</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="samples" className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-aeonik text-lg uppercase tracking-[0.12em] font-bold">My Samples</h2>
                <Link href="/artisan/samples">
                  <Button variant="outline">View All</Button>
                </Link>
              </div>

              <div className="grid gap-4">
                {sampleHistory.map((sample) => (
                  <Card key={sample.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-base">{sample.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sample.id} • {sample.date}</p>
                        <p className="text-sm text-muted-foreground mt-3">{sample.notes}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(sample.status)}>{sample.status}</Badge>
                        <Link href={`/artisan/samples/${sample.id}`}>
                          <Button variant="outline" size="sm">Details</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>


          </Tabs>
        </div>
      </main>

      {/* Submit Sample Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Submit Digital Sample</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <input type="text" className="w-full p-2 border border-border rounded-md bg-background" placeholder="e.g. Woven Indigo Scarf" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea className="w-full p-2 border border-border rounded-md bg-background min-h-[100px]" placeholder="Materials used, dimensions, and crafting technique..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Media (Photos/Videos)</label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">Drag and drop files here, or click to browse</p>
                <input type="file" multiple className="hidden" id="file-upload" />
                <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                  Select Files
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Submit for Review</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-aeonik text-lg uppercase tracking-[0.12em]">Update Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <section className="space-y-4">
              <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold">Personal & Shop Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Shop Name</label>
                  <input type="text" defaultValue="Crafts by Aisha" className="w-full p-3 border border-border rounded bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                  <input type="text" defaultValue="Aisha Mohammed" className="w-full p-3 border border-border rounded bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
                  <input type="email" defaultValue="aisha.crafts@example.com" className="w-full p-3 border border-border rounded bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                  <input type="tel" defaultValue="+251 911 234 567" className="w-full p-3 border border-border rounded bg-background" />
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="font-aeonik text-sm uppercase tracking-[0.12em] font-bold">Bank Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Bank Name</label>
                  <select className="w-full p-3 border border-border rounded bg-background">
                    <option>Commercial Bank of Ethiopia</option>
                    <option>Dashen Bank</option>
                    <option>Awash Bank</option>
                    <option>Abyssinia Bank</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Account Number</label>
                  <input type="text" defaultValue="100029384756" className="w-full p-3 border border-border rounded bg-background" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Account Holder Name</label>
                  <input type="text" defaultValue="Aisha Mohammed" className="w-full p-3 border border-border rounded bg-background" />
                </div>
              </div>
            </section>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Save Profile Updates</Button>
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