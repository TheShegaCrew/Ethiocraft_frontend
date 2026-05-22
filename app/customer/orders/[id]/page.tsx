"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Footer } from "@/components/shared/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/hooks/useNotifications";
import {
  fetchOrderById,
  fetchOrderTracking,
  type ApiOrder,
  type ApiOrderTracking,
  type ApiOrderTrackingEvent,
} from "@/lib/api";

// Icons for modern UI
import {
  Package,
  Truck,
  MapPin,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Receipt,
  Info
} from "lucide-react";

function formatDateTime(date?: string | null): string {
  if (!date) return "Not available";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number | string | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return `${currency} 0.00`;
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency} 0.00`;
  return `${currency} ${numAmount.toFixed(2)}`;
}

function statusClass(status?: string | null): string {
  const normalized = status?.toUpperCase() ?? "";
  switch (normalized) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "SHIPPED":
    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "PROCESSING":
    case "PAID":
    case "PENDING_PAYMENT":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatAddress(order: ApiOrder): string {
  const address = order.shippingAddress || order.deliveryAddress;
  if (!address) return "No shipping address available.";
  const parts = [
    address.fullName,
    address.phoneNumber,
    address.street,
    address.city,
    address.region,
    address.country,
    address.postalCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "No shipping address available.";
}

// Standard tracking timeline stages (aligned with DB OrderStatus and tracking events)
const TRACKING_STAGES = [
  { status: "PENDING_PAYMENT", label: "Order Placed", description: "Your order has been confirmed and placed" },
  { status: "PROCESSING", label: "Processing", description: "We're preparing your order for shipment" },
  { status: "SHIPPED", label: "Shipped", description: "Your package has been picked up by the carrier" },
  { status: "IN_TRANSIT", label: "In Transit", description: "Your order is on the way to you" },
  { status: "DELIVERED", label: "Delivered", description: "Your order has been successfully delivered" },
];

function getStatusIcon(status?: string | null) {
  const normalized = status?.toUpperCase() ?? "";
  switch (normalized) {
    case "PENDING_PAYMENT":
      return "🧾";
    case "PAID":
      return "✓";
    case "PROCESSING":
      return "⚙";
    case "SHIPPED":
      return "📦";
    case "IN_TRANSIT":
      return "🚚";
    case "DELIVERED":
      return "✓";
    default:
      return "•";
  }
}

function getStatusDescription(status?: string | null): string {
  const stage = TRACKING_STAGES.find(s => s.status === status?.toUpperCase());
  return stage?.description || "Awaiting tracking update";
}

function getProgressPercentage(status?: string | null): number {
  const statusIndex = TRACKING_STAGES.findIndex(s => s.status === status?.toUpperCase());
  if (statusIndex === -1) return 0;
  return ((statusIndex + 1) / TRACKING_STAGES.length) * 100;
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const { token, role } = useAuth();

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [tracking, setTracking] = useState<ApiOrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    notifications,
    unreadCount: unreadNotifications,
    readCount,
    markAsRead,
    markAllAsRead,
    clearRead,
    refresh,
  } = useNotifications({ enabled: Boolean(token || role) });

  const headerNotifications = notifications.map((n) => ({
    id: n.id,
    message: n.message,
    time: new Date(n.createdAt).toLocaleDateString(),
    unread: !n.isRead,
  }));

  useEffect(() => {
    const loadOrderDetail = async () => {
      if (!orderId) {
        setIsLoading(false);
        setError("Order ID was not provided.");
        return;
      }

      if (!role) {
        setIsLoading(false);
        setError("Please sign in to view your order details.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [orderData, trackingData] = await Promise.all([
          fetchOrderById(orderId),
          fetchOrderTracking(orderId),
        ]);

        setOrder(orderData);
        setTracking(trackingData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load order details.";
        setError(message);
        setOrder(null);
        setTracking(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderDetail();
  }, [orderId, role]);

  const trackingEvents = useMemo(() => {
    const events = tracking?.events || [];
    // If a PAID event exists, drop historical PENDING_PAYMENT events so UI isn't confusing
    const hasPaid = events.some((e) => (e.status || '').toUpperCase() === 'PAID');
    const filtered = hasPaid ? events.filter((e) => (e.status || '').toUpperCase() !== 'PENDING_PAYMENT') : events;
    return [...filtered].sort((a: ApiOrderTrackingEvent, b: ApiOrderTrackingEvent) => {
      const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
      const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
      return bTime - aTime; // Newest first
    });
  }, [tracking]);

  const latestPayment = useMemo(() => {
    if (!order) return null;
    // `payments` may be included by the API; pick the most recent successful/last payment
    // @ts-ignore
    const payments = order.payments as Array<any> | undefined;
    if (!payments || !payments.length) return null;
    const sorted = [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted[0];
  }, [order]);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-inter">
      <DashboardHeader
        statusText="Order tracking updates active"
        notifications={headerNotifications}
        unreadNotifications={unreadNotifications}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearRead={clearRead}
        readCount={readCount}
        refresh={refresh}
      />
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 md:pt-32 pb-12 max-w-7xl">
          <div className="mb-6">
            <Link
              href="/customer/dashboard"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-1/3" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
              </div>
            </div>
          ) : error ? (
            <Card className="p-8 border-red-200 bg-red-50/50 text-center">
              <div className="flex justify-center mb-4">
                <Info className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-xl font-semibold text-red-900 mb-2">Unable to load order</h1>
              <p className="text-red-600 mb-6">{error}</p>
              {!role && (
                <Link href="/auth/login">
                  <Button variant="default">Sign In to Continue</Button>
                </Link>
              )}
            </Card>
          ) : !order ? (
            <Card className="p-12 text-center text-muted-foreground">
              Order not found.
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Order Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border shadow-sm">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    Order #{order.id}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    Placed on {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <Badge variant="outline" className={`px-4 py-1.5 text-sm uppercase tracking-wider font-semibold ${statusClass(order.status)}`}>
                  {order.status}
                </Badge>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Tracking & Items */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Tracking Timeline */}
                  <Card className="overflow-hidden shadow-sm">
                    <CardHeader className="bg-muted/30 border-b pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="w-5 h-5 text-primary" />
                        Tracking Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/* Carrier & Tracking Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted/40 rounded-lg text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Carrier</p>
                          <p className="font-medium">{tracking?.carrier || "Standard Shipping"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Tracking Number</p>
                          <p className="font-medium font-mono">{tracking?.trackingNumber || "Pending"}</p>
                        </div>
                      </div>

                      {/* Progress Indicator */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">Order Progress</p>
                          <p className="text-xs text-muted-foreground">{Math.round(getProgressPercentage(order.status))}%</p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-500 rounded-full" 
                            style={{ width: `${getProgressPercentage(order.status)}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Description */}
                      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Current Status: {order.status}</p>
                          <p className="text-sm text-blue-800 mt-1">{getStatusDescription(order.status)}</p>
                        </div>
                      </div>

                      {/* Standard Tracking Stages */}
                      <div className="mb-8">
                        <p className="text-sm font-semibold mb-4 text-muted-foreground">Expected Journey</p>
                        <div className="grid grid-cols-5 gap-2">
                          {TRACKING_STAGES.map((stage, index) => {
                            const isCompleted = TRACKING_STAGES.findIndex(s => s.status === order.status?.toUpperCase()) >= index;
                            const isCurrent = stage.status === order.status?.toUpperCase();
                            return (
                              <div key={stage.status} className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all ${
                                  isCompleted ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                                  {getStatusIcon(stage.status)}
                                </div>
                                <p className={`text-xs text-center font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {stage.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actual Tracking Events from API */}
                      {trackingEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          <p>No detailed tracking updates available yet.</p>
                          <p className="text-xs mt-2">Tracking information will appear here as your order moves through our system.</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold mb-4 text-muted-foreground border-t pt-4">Detailed Timeline</p>
                          <div className="relative pl-2 md:pl-0">
                            {/* Vertical Line */}
                            <div className="absolute left-[11px] md:left-[19px] top-2 bottom-2 w-0.5 bg-border" />
                            
                            <div className="space-y-6">
                              {trackingEvents.map((event, index) => {
                                const isLatest = index === 0;
                                const statusLabel = TRACKING_STAGES.find(s => s.status === event.status?.toUpperCase())?.label || event.status || 'Update';
                                return (
                                  <div key={event.id || `${event.status}-${index}`} className="relative flex gap-4 items-start">
                                    <div className={`relative z-10 flex items-center justify-center w-6 h-6 md:w-10 md:h-10 rounded-full border-2 bg-background ${isLatest ? 'border-primary ring-4 ring-primary/10' : 'border-muted-foreground/30'}`}>
                                      {isLatest ? (
                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary" />
                                      ) : (
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground/30" />
                                      )}
                                    </div>
                                    <div className="flex-1 pt-1 md:pt-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className={`font-semibold ${isLatest ? 'text-foreground' : 'text-muted-foreground'}`}>
                                          {statusLabel}
                                        </h4>
                                        <span className="text-xs text-muted-foreground">{event.id ? `#${event.id}` : null}</span>
                                      </div>

                                      <p className="text-sm text-muted-foreground mb-1">
                                        <span className="font-medium">Event time:</span> {formatDateTime(event.timestamp || event.createdAt)}
                                      </p>

                                      {/* Extra metadata stored in DB */}
                                      <div className="text-sm mt-2 space-y-1">
                                        {event.location && (
                                          <p className="text-muted-foreground"><span className="font-medium">Location:</span> {event.location}</p>
                                        )}
                                        {event.description && (
                                          <p className="bg-muted/30 p-2.5 rounded-md text-foreground/80">{event.description}</p>
                                        )}
                                        {event.note && (
                                          <p className="text-sm text-muted-foreground"><span className="font-medium">Note:</span> {event.note}</p>
                                        )}
                                        {event.createdAt && event.createdAt !== event.timestamp && (
                                          <p className="text-xs text-muted-foreground">Recorded at: {formatDateTime(event.createdAt)}{event.updatedAt ? ` · Updated: ${formatDateTime(event.updatedAt)}` : ''}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Items */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-muted/30 border-b pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-primary" />
                        Items Ordered
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {order.items?.length ? (
                        <div className="divide-y">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-muted/20 transition-colors">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                                  <Package className="w-6 h-6 text-muted-foreground/50" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{item.product.title}</p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    Qty: {item.quantity} × {formatMoney(item.unitPrice, order.currency)}
                                  </p>
                                </div>
                              </div>
                              <p className="font-bold text-foreground mt-4 sm:mt-0 text-right">
                                {formatMoney(item.lineTotal, order.currency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="p-6 text-sm text-muted-foreground text-center">No order items available.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Summaries */}
                <div className="space-y-8">
                  
                  {/* Order Summary */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-muted/30 border-b pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Receipt className="w-5 h-5 text-primary" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Subtotal</span>
                          <span className="text-foreground font-medium">{formatMoney(order.subtotalAmount, order.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Shipping</span>
                          <span className="text-foreground font-medium">{formatMoney(order.shippingFee, order.currency)}</span>
                        </div>
                        <div className="pt-4 border-t flex justify-between items-center">
                          <span className="font-semibold text-base">Total</span>
                          <span className="font-bold text-lg text-primary">
                            {formatMoney(order.totalAmount, order.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t space-y-4">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Payment Method</p>
                            <p className="text-sm text-muted-foreground">
                              {friendlyPaymentMethod(order.paymentMethod ?? (latestPayment?.provider || latestPayment?.txRef)) }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Payment Status</p>
                            <p className="text-sm text-muted-foreground">
                              {friendlyPaymentStatus(order.paymentStatus ?? latestPayment?.status)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipping Details */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-muted/30 border-b pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5 text-primary" />
                        Shipping Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <p className="text-sm font-medium mb-2 text-muted-foreground">Delivery Address</p>
                        <p className="text-sm leading-relaxed max-w-[250px]">
                          {formatAddress(order)}
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-1 text-muted-foreground">Estimated Delivery</p>
                        <p className="text-sm font-semibold">
                          {formatDateTime(tracking?.estimatedDeliveryDate || order.estimatedDeliveryDate)}
                        </p>
                      </div>

                      {(tracking?.deliveredAt || order.deliveredAt) && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-1 text-muted-foreground">Delivered At</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatDateTime(tracking?.deliveredAt || order.deliveredAt)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style jsx>{`
        .font-inter {
          font-family: var(--font-inter), sans-serif;
        }
      `}</style>
    </div>
  );
}

function friendlyPaymentMethod(method?: string | null): string {
  if (!method) return "Not available";
  return method.replace(/_/g, " ").split(" ").map(s => s[0]?.toUpperCase() + s.slice(1).toLowerCase()).join(" ");
}

function friendlyPaymentStatus(status?: string | null): string {
  if (!status) return "Not available";
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "PENDING":
    case "PENDING_PAYMENT":
      return "Pending";
    case "SUCCESS":
    case "PAID":
      return "Paid";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    default:
      return status.replace(/_/g, " ");
  }
}