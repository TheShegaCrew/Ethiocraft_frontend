'use client'

import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingBag, Package, Heart, Settings, Pencil, Trash2, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'
import {
  fetchOrders, ApiOrder,
  fetchProductById, ApiProductSummary,
  fetchUserProfile, updateUserProfile, ApiUserProfile, UpdateProfilePayload,
  fetchUserAddresses, createUserAddress, updateUserAddress, deleteUserAddress, ApiAddress, AddressPayload,
} from '@/lib/api'
import { toast } from 'react-toastify'
import { useNotifications } from '@/hooks/useNotifications'
import { Skeleton } from '@/components/ui/skeleton'

// ─── blank address form ──────────────────────────────────────────────────────
const BLANK_ADDRESS: AddressPayload = {
  recipientName: '', phone: '', region: '', city: '',
  line1: '', label: '', subCity: '', isDefault: false,
}

export default function CustomerDashboard() {
  const { token, role } = useAuth()
  const { addItem } = useCart()
  const { wishlistIds, toggleWishlist } = useWishlist()

  // ── Orders ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [inTransitCount, setInTransitCount] = useState<number | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  useEffect(() => {
    setOrdersLoading(true)
    Promise.all([
      fetchOrders(null, { limit: 3 }),
      fetchOrders(null, { status: 'SHIPPED', limit: 1 }),
    ])
      .then(([recent, shipped]) => {
        setOrders(recent.items)
        setTotalOrders(recent.meta.total)
        setInTransitCount(shipped.meta.total)
      })
      .catch((e) => { setOrdersError(e.message); setOrders([]); toast.error(e.message || 'Failed to load orders') })
      .finally(() => setOrdersLoading(false))
  }, [])

  // ── Profile ─────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ApiUserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editForm, setEditForm] = useState<UpdateProfilePayload>({ firstName: '', lastName: '', phone: '', avatarUrl: '' })
  const [editSaving, setEditSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setEditForm(f => ({ ...f, avatarUrl: reader.result as string }))
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    fetchUserProfile()
      .then(setProfile)
      .catch((e: any) => { toast.error(e?.message || 'Failed to load profile') })
      .finally(() => setProfileLoading(false))
  }, [])

  const openEditProfile = () => {
    setEditForm({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
    })
    setShowEditProfile(true)
  }

  const handleSaveProfile = async () => {
    setEditSaving(true)
    try {
      const payload: UpdateProfilePayload = {}
      if (editForm.firstName) payload.firstName = editForm.firstName
      if (editForm.lastName) payload.lastName = editForm.lastName
      if (editForm.phone) payload.phone = editForm.phone
      if (editForm.avatarUrl) payload.avatarUrl = editForm.avatarUrl
      const updated = await updateUserProfile(payload)
      setProfile(updated)
      setShowEditProfile(false)
      toast.success('Profile updated successfully')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Addresses ────────────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<ApiAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressPayload>(BLANK_ADDRESS)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressSaving, setAddressSaving] = useState(false)

  const loadAddresses = () => {
    fetchUserAddresses()
      .then(setAddresses)
      .catch((e: any) => { toast.error(e?.message || 'Failed to load addresses') })
      .finally(() => setAddressesLoading(false))
  }

  useEffect(() => { loadAddresses() }, [])

  const openNewAddress = () => {
    setAddressForm(BLANK_ADDRESS)
    setEditingAddressId(null)
    setShowAddressModal(true)
  }

  const openEditAddress = (addr: ApiAddress) => {
    setAddressForm({
      recipientName: addr.recipientName, phone: addr.phone,
      region: addr.region, city: addr.city, line1: addr.line1,
      label: addr.label ?? '', subCity: addr.subCity ?? '',
      isDefault: addr.isDefault,
    })
    setEditingAddressId(addr.id)
    setShowAddressModal(true)
  }

  const handleSaveAddress = async () => {
    setAddressSaving(true)
    try {
      if (editingAddressId) {
        await updateUserAddress(editingAddressId, addressForm)
        toast.success('Address updated')
      } else {
        await createUserAddress(addressForm)
        toast.success('Address added')
      }
      setShowAddressModal(false)
      loadAddresses()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save address')
    } finally {
      setAddressSaving(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return
    try {
      await deleteUserAddress(id)
      setAddresses((prev) => prev.filter((a) => a.id !== id))
      toast.success('Address deleted')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete address')
    }
  }

  // ── Wishlist ─────────────────────────────────────────────────────────────────
  const [wishlistProducts, setWishlistProducts] = useState<ApiProductSummary[]>([])
  const [wishlistLoading, setWishlistLoading] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setWishlistLoading(true)
      if (!wishlistIds?.length) { if (mounted) setWishlistProducts([]); setWishlistLoading(false); return }
      const results: ApiProductSummary[] = []
      let failed = 0
      for (const id of wishlistIds) {
        try { results.push(await fetchProductById(String(id))) } catch (err) { failed += 1 }
      }
      if (mounted) setWishlistProducts(results)
      if (failed > 0) toast.error(`${failed} wishlist item(s) failed to load`)
      setWishlistLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [wishlistIds])

  const handleRemoveWishlist = (id: string | number, name?: string) => {
    const removed = wishlistProducts.find((x) => String(x.id) === String(id))
    setWishlistProducts((p) => p.filter((x) => String(x.id) !== String(id)))
    try {
      const res = toggleWishlist(id as string | number) as any
      if (res?.whenDone) {
        res.whenDone.catch(() => {
          // restore removed item if API fails and it's not already present
          setWishlistProducts((cur) => {
            if (!removed) return cur
            if (cur.find((x) => String(x.id) === String(removed.id))) return cur
            return [removed, ...cur]
          })
        })
      }
    } catch (e) { console.warn('toggleWishlist error', e) }
    if (name) toast.info(`${name} removed from wishlist`)
  }

  const handleAddWishlistToCart = (prod: ApiProductSummary) => {
    addItem({ id: prod.id, name: prod.title, price: Number(prod.price), image: prod.media?.[0]?.url || '', quantity: 1, category: 'Wishlist' })
    toast.success(`${prod.title} added to cart`)
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const {
    notifications,
    unreadCount: unreadNotifications,
    readCount,
    markAsRead,
    markAllAsRead,
    clearRead,
    refresh,
  } = useNotifications({ enabled: Boolean(token || role) })
  const headerNotifications = notifications.map(n => ({ id: n.id, message: n.message, time: new Date(n.createdAt).toLocaleDateString(), unread: !n.isRead }))

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const getOrderLabel = (o: ApiOrder) => o.items?.length ? o.items.map(i => i.product.title).join(', ') : 'No items'
  const getStatusColor = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'DELIVERED': return 'bg-primary text-primary-foreground'
      case 'SHIPPED': return 'bg-secondary text-secondary-foreground'
      case 'PROCESSING': case 'PAID': case 'PENDING_PAYMENT': return 'bg-muted text-muted-foreground'
      case 'CANCELLED': return 'bg-red-100 text-red-700'
      default: return 'bg-border text-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        notifications={headerNotifications}
        unreadNotifications={unreadNotifications}
        statusText={''}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearRead={clearRead}
        readCount={readCount}
        refresh={refresh}
      />

      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 md:pt-32 pb-12">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="font-druk-medium text-3xl md:text-4xl uppercase tracking-tight mb-2">
              Welcome back{profile ? `, ${profile.firstName}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm font-aeonik uppercase tracking-widest">
              Manage your orders, wishlist, and account settings
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg"><ShoppingBag className="w-6 h-6 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{ordersLoading ? '...' : totalOrders}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-secondary/10 p-3 rounded-lg"><Package className="w-6 h-6 text-secondary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">{inTransitCount === null ? '...' : inTransitCount}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-lg"><Heart className="w-6 h-6 text-accent" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Wishlist Items</p>
                  <p className="text-2xl font-bold">{wishlistProducts.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg"><Settings className="w-6 h-6 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <p className="text-2xl font-bold">{profileLoading ? '...' : (profile?.status === 'ACTIVE' ? 'Active' : 'Inactive')}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="orders" className="w-full font-aeonik">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders" className="uppercase tracking-widest text-xs">Recent Orders</TabsTrigger>
              <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Orders</h2>
                <Link href="/customer/orders"><Button variant="outline">View All</Button></Link>
              </div>
              <div className="space-y-3">
                {ordersLoading ? (
                  <div className="grid gap-3">
                    {[1,2,3].map(i => (
                      <Card key={i} className="p-4" aria-hidden>
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </Card>
                    ))}
                  </div>
                ) : ordersError ? (
                  <Card className="p-4 border-red-200 bg-red-50"><p className="text-sm text-red-700">{ordersError}</p></Card>
                ) : orders.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No recent orders found.</p>
                    <Link href="/products"><Button className="mt-4">Browse Products</Button></Link>
                  </Card>
                ) : orders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="font-semibold">{getOrderLabel(order)}</p>
                        <p className="text-sm text-muted-foreground">Order {order.id}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-lg">{order.currency} {Number(order.totalAmount).toFixed(2)}</p>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        <Link href={`/customer/orders/${order.id}`}>
                          <Button variant="outline" size="sm">Details</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Wishlist Tab */}
            <TabsContent value="wishlist" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Your Wishlist</h2>
              {wishlistLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2].map(i => (
                    <Card key={i} className="p-4" aria-hidden>
                      <Skeleton className="h-24 rounded mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-1" />
                      <Skeleton className="h-4 w-1/4" />
                    </Card>
                  ))}
                </div>
              ) : wishlistProducts.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No wishlist items yet.</p>
                  <Link href="/products"><Button className="mt-4">Browse Products</Button></Link>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wishlistProducts.map((prod) => (
                    <Card key={prod.id} className="overflow-hidden">
                      <div className="flex gap-4 p-4">
                        <img src={prod.media?.[0]?.url || '/placeholder.svg'} alt={prod.title} className="w-24 h-24 object-cover rounded-lg bg-muted" />
                        <div className="flex-1">
                          <p className="font-semibold">{prod.title}</p>
                          <p className="text-sm text-muted-foreground">{prod.materials?.join(', ')}</p>
                          <p className="text-lg font-bold text-secondary mt-2">${prod.price}</p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" className="flex-1 bg-primary" onClick={() => handleAddWishlistToCart(prod)}>Add to Cart</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRemoveWishlist(prod.id, prod.title)}>Remove</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Account Settings</h2>

              {/* Profile Card */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  {profile?.avatarUrl ? (
                    <Image src={profile.avatarUrl} alt="Avatar" width={64} height={64} className="rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                      {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{profileLoading ? '...' : profile ? `${profile.firstName} ${profile.lastName}` : '—'}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    {profile?.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Button className="bg-primary hover:bg-primary/90" onClick={openEditProfile}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                </div>
              </Card>

              {/* Addresses Card */}
              <Card className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Addresses</h3>
                  <Button variant="outline" size="sm" onClick={openNewAddress}>
                    <Plus className="w-4 h-4 mr-1" /> Add Address
                  </Button>
                </div>
                {addressesLoading ? (
                  <div className="space-y-3">
                    {[1,2].map(i => (
                      <Card key={i} className="p-4" aria-hidden>
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </Card>
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No addresses saved yet.</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <Card key={addr.id} className="p-4 bg-muted/50">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            {addr.isDefault && <Badge className="mb-1 text-xs">Default</Badge>}
                            <p className="font-semibold">{addr.recipientName}</p>
                            <p className="text-sm text-muted-foreground mt-1">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.region}</p>
                            <p className="text-sm text-muted-foreground">{addr.phone}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => openEditAddress(addr)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAddress(addr.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* ── Edit Profile Modal ─────────────────────────────────────────────── */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={editForm.firstName ?? ''} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={editForm.lastName ?? ''} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Profile Photo <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative group w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/40 overflow-hidden hover:border-primary transition-colors flex items-center justify-center bg-muted"
                >
                  {editForm.avatarUrl ? (
                    <img src={editForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center px-1">Upload photo</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                </button>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Click the circle to upload</p>
                  <p>JPEG, PNG, or WEBP — max 2 MB</p>
                  {editForm.avatarUrl && (
                    <button type="button" className="text-destructive hover:underline" onClick={() => setEditForm(f => ({ ...f, avatarUrl: '' }))}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Address Modal ─────────────────────────────────────────────────── */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingAddressId ? 'Edit Address' : 'Add New Address'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <Input id="recipientName" value={addressForm.recipientName} onChange={e => setAddressForm(f => ({ ...f, recipientName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addrPhone">Phone *</Label>
                <Input id="addrPhone" value={addressForm.phone} onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="label">Label <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="label" placeholder="Home, Office..." value={addressForm.label ?? ''} onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="region">Region *</Label>
                <Input id="region" value={addressForm.region} onChange={e => setAddressForm(f => ({ ...f, region: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">City *</Label>
                <Input id="city" value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="subCity">Sub-City</Label>
                <Input id="subCity" value={addressForm.subCity ?? ''} onChange={e => setAddressForm(f => ({ ...f, subCity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="woreda">Woreda</Label>
                <Input id="woreda" value={addressForm.woreda ?? ''} onChange={e => setAddressForm(f => ({ ...f, woreda: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="line1">Address Line 1 *</Label>
                <Input id="line1" value={addressForm.line1} onChange={e => setAddressForm(f => ({ ...f, line1: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isDefault" checked={!!addressForm.isDefault} onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4" />
                <Label htmlFor="isDefault" className="cursor-pointer">Set as default address</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressModal(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAddress}
              disabled={addressSaving || !addressForm.recipientName || !addressForm.phone || !addressForm.region || !addressForm.city || !addressForm.line1}
            >
              {addressSaving ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik { font-family: var(--font-aeonik), sans-serif; }
        .font-inter { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  )
}
