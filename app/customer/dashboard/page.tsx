'use client'

import { Footer } from '@/components/shared/footer'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShoppingBag, Package, Heart, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { getWishlistProductIds, toggleWishlistProduct } from '@/lib/wishlist'
import { fetchOrders, ApiOrder } from '@/lib/api'
import { toast } from 'react-toastify'

export default function CustomerDashboard() {
  const { token } = useAuth()
  const { addItem } = useCart()
  const wishlistUserKey = token ?? 'guest'
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setOrders([])
      setTotalOrders(0)
      setOrdersLoading(false)
      return
    }

    setOrdersLoading(true)
    setOrdersError(null)

    fetchOrders(token, { limit: 3 })
      .then((response) => {
        setOrders(response.items)
        setTotalOrders(response.meta.total)
      })
      .catch((error) => {
        console.error(error)
        setOrdersError(error.message || 'Unable to load orders.')
        setOrders([])
        setTotalOrders(0)
      })
      .finally(() => setOrdersLoading(false))
  }, [token])

  const formatOrderDate = (createdAt: string) =>
    new Date(createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const getOrderLabel = (order: ApiOrder) => {
    if (!order.items?.length) {
      return 'No items available'
    }
    return order.items.map((item) => item.product.title).join(', ')
  }

  const getOrderTotal = (order: ApiOrder) =>
    `${order.currency} ${order.totalAmount.toFixed(2)}`

  const catalogProducts = [
    {
      id: 1,
      name: 'Leather Shoulder Bag',
      price: 168,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 2,
      name: 'Lalibela Filigree Earrings',
      price: 124,
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 3,
      name: 'Sidama Coffee Ceremony Set',
      price: 210,
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 4,
      name: 'Woven Mesob Basket',
      price: 96,
      image: 'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 5,
      name: 'Addis Leather Weekender',
      price: 182,
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 6,
      name: 'Hand-Loomed Gabi Shawl',
      price: 88,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 7,
      name: 'Axum Cross Pendant',
      price: 116,
      image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
    {
      id: 8,
      name: 'Harar Palm Tote',
      price: 74,
      image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80',
      artisan: 'EthioCraft Artisan',
    },
  ]
  const [wishlistIds, setWishlistIds] = useState<(string | number)[]>([])
  const notifications = [
    { id: '1', message: 'Order #EC-1024 has been shipped.', time: '15 mins ago', unread: true },
    { id: '2', message: 'Your refund request for #EC-1011 is being reviewed.', time: '3 hours ago', unread: true },
    { id: '3', message: 'Your wishlist item "Woven Mesob Basket" is back in stock.', time: '1 day ago', unread: false },
  ]
  const unreadNotifications = notifications.filter((note) => note.unread).length

  useEffect(() => {
    setWishlistIds(getWishlistProductIds(wishlistUserKey))
  }, [wishlistUserKey])

  const wishlistItems = useMemo(
    () => catalogProducts.filter((product) => wishlistIds.includes(product.id)),
    [wishlistIds],
  )

  const handleRemoveWishlistItem = (productId: number, productName: string) => {
    const { ids } = toggleWishlistProduct(wishlistUserKey, productId)
    setWishlistIds(ids)
    toast.info(`${productName} removed from wishlist`)
  }

  const handleAddWishlistItemToCart = (item: (typeof catalogProducts)[number]) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      category: 'Wishlist',
    })
    toast.success(`${item.name} added to cart`)
  }

  const getStatusColor = (status: string) => {
    const normalized = status?.toString()?.toUpperCase?.() ?? ''
    switch (normalized) {
      case 'DELIVERED':
        return 'bg-primary text-primary-foreground'
      case 'SHIPPED':
        return 'bg-secondary text-secondary-foreground'
      case 'PROCESSING':
      case 'PAID':
      case 'PENDING_PAYMENT':
        return 'bg-muted text-muted-foreground'
      case 'CANCELLED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-border text-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <DashboardHeader
        notifications={notifications}
        unreadNotifications={unreadNotifications} statusText={''}      />

      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 md:pt-32 pb-12">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="font-druk-medium text-3xl md:text-4xl uppercase tracking-tight mb-2">Welcome back</h1>
            <p className="text-muted-foreground text-sm font-aeonik uppercase tracking-widest">Manage your orders, wishlist, and account settings</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{ordersLoading ? '...' : totalOrders}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Heart className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wishlist Items</p>
                  <p className="text-2xl font-bold">{wishlistItems.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <p className="text-2xl font-bold">Active</p>
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
                <Link href="/customer/orders">
                  <Button variant="outline">View All</Button>
                </Link>
              </div>

              <div className="space-y-3">
                {ordersLoading ? (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Loading your recent orders...</p>
                  </Card>
                ) : ordersError ? (
                  <Card className="p-4 border-red-200 bg-red-50">
                    <p className="text-sm text-red-700">{ordersError}</p>
                  </Card>
                ) : orders.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No recent orders found.</p>
                    <Link href="/products">
                      <Button className="mt-4">Browse Products</Button>
                    </Link>
                  </Card>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="font-semibold">{getOrderLabel(order)}</p>
                          <p className="text-sm text-muted-foreground">Order {order.id}</p>
                          <p className="text-sm text-muted-foreground">{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-bold text-lg">{getOrderTotal(order)}</p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          <Link href={`/customer/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Wishlist Tab */}
            <TabsContent value="wishlist" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Your Wishlist</h2>

              {wishlistItems.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No wishlist items yet.</p>
                  <Link href="/products">
                    <Button className="mt-4">Browse Products</Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wishlistItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="flex gap-4 p-4">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg bg-muted"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.artisan}</p>
                          <p className="text-lg font-bold text-secondary mt-2">${item.price}</p>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="flex-1 bg-primary"
                              onClick={() => handleAddWishlistItemToCart(item)}
                            >
                              Add to Cart
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveWishlistItem(item.id, item.name)}
                            >
                              Remove
                            </Button>
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

              <Card className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">First Name</label>
                    <p className="text-lg">John</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Last Name</label>
                    <p className="text-lg">Doe</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-muted-foreground">Email</label>
                    <p className="text-lg">john.doe@example.com</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button className="bg-primary hover:bg-primary/90">Edit Profile</Button>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="font-semibold">Addresses</h3>
                <div className="space-y-3">
                  <Card className="p-4 bg-muted/50">
                    <p className="font-semibold">Default Shipping Address</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      123 Main St, Addis Ababa, Ethiopia 1000
                    </p>
                  </Card>
                </div>
                <Button variant="outline">Manage Addresses</Button>
              </Card>
            </TabsContent>
          </Tabs >
        </div >
      </main >

      <Footer />
      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik { font-family: var(--font-aeonik), sans-serif; }
        .font-inter { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div >
  )
}
