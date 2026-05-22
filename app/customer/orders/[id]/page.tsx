"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Footer } from "@/components/shared/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  fetchOrderById,
  fetchOrderTracking,
  type ApiOrder,
  type ApiOrderTracking,
  type ApiOrderTrackingEvent,
} from "@/lib/api";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from '@/components/ui/skeleton'

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

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function statusClass(status?: string | null): string {
  const normalized = status?.toUpperCase() ?? "";
  switch (normalized) {
    case "DELIVERED":
      return "bg-primary text-primary-foreground";
    case "SHIPPED":
    case "IN_TRANSIT":
      return "bg-secondary text-secondary-foreground";
    case "PROCESSING":
    case "PAID":
    case "PENDING_PAYMENT":
      return "bg-muted text-muted-foreground";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-border text-foreground";
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

      if (!token) {
        setIsLoading(false);
        setError("Please sign in to view your order details.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [orderData, trackingData] = await Promise.all([
          fetchOrderById(orderId, token),
          fetchOrderTracking(orderId, token),
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
  }, [orderId, token]);

  const trackingEvents = useMemo(() => {
    const events = tracking?.events || [];
    return [...events].sort((a: ApiOrderTrackingEvent, b: ApiOrderTrackingEvent) => {
      const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
      const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [tracking]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
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
        <div className="container mx-auto px-4 pt-28 md:pt-32 pb-12">
          <div className="mb-6">
            <Link href="/customer/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Link>
          </div>

          {isLoading ? (
              <Card className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-48 w-full" />
                </div>
              </Card>
          ) : error ? (
            <Card className="p-6 border-red-200 bg-red-50">
              <h1 className="text-lg font-semibold text-red-700">Unable to load order</h1>
              <p className="text-sm text-red-600 mt-2">{error}</p>
              {!token && (
                <Link href="/login" className="inline-block mt-4">
                  <Button>Sign in</Button>
                </Link>
              )}
            </Card>
          ) : !order ? (
            <Card className="p-6">
              <p className="text-muted-foreground">Order not found.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold">Order {order.id}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Placed on {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <Badge className={statusClass(order.status)}>{order.status}</Badge>
              </div>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Subtotal: </span>
                    {formatMoney(order.subtotalAmount, order.currency)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Shipping: </span>
                    {formatMoney(order.shippingFee, order.currency)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold">
                      {formatMoney(order.totalAmount, order.currency)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Payment Method: </span>
                    {order.paymentMethod || "Not available"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Payment Status: </span>
                    {order.paymentStatus || "Not available"}
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Items</h2>
                <div className="space-y-4">
                  {order.items?.length ? (
                    order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">{item.product.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Qty {item.quantity} · Unit {formatMoney(item.unitPrice, order.currency)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatMoney(item.lineTotal, order.currency)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No order items available.</p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Shipping & Delivery</h2>
                <div className="space-y-2 text-sm">
                  <p>{formatAddress(order)}</p>
                  <p>
                    <span className="text-muted-foreground">Estimated Delivery: </span>
                    {formatDateTime(
                      tracking?.estimatedDeliveryDate || order.estimatedDeliveryDate
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Delivered At: </span>
                    {formatDateTime(tracking?.deliveredAt || order.deliveredAt)}
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Tracking Timeline</h2>
                <div className="mb-4 text-sm text-muted-foreground">
                  <p>Shipment Status: {tracking?.shipmentStatus || order.status}</p>
                  {tracking?.carrier && <p>Carrier: {tracking.carrier}</p>}
                  {tracking?.trackingNumber && <p>Tracking Number: {tracking.trackingNumber}</p>}
                </div>
                {trackingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tracking updates available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {trackingEvents.map((event, index) => (
                      <div key={event.id || `${event.status}-${index}`} className="border-l-2 border-border pl-4">
                        <p className="font-medium">{event.status}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(event.timestamp || event.createdAt)}
                        </p>
                        {(event.description || event.note || event.location) && (
                          <p className="text-sm mt-1 text-muted-foreground">
                            {[event.description, event.note, event.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
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
