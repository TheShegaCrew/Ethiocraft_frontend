"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const txRef = searchParams.get("tx_ref");

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
          Payment Successful!
        </h1>
        <p className="text-muted-foreground mb-2">
          Your order has been placed and payment confirmed. Thank you for shopping with EthioCraft!
        </p>
        {orderId && (
          <div className="bg-muted/50 rounded-xl p-4 my-6 w-full">
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <p className="text-lg font-bold text-primary font-mono break-all">{orderId}</p>
          </div>
        )}
        {txRef && (
          <p className="text-xs text-muted-foreground mb-6">
            Transaction Ref: <span className="font-mono">{txRef}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {orderId && (
            <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-medium">
              <Link href={`/customer/orders/${orderId}`}>Track Your Order</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="flex-1 border-border h-12 font-medium">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
          Payment Failed
        </h1>
        <p className="text-muted-foreground mb-6">
          Unfortunately, we were unable to process your payment. Your order has been saved — you can retry payment or contact support.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mb-6">
            Order ID: <span className="font-mono">{orderId}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-medium">
            <Link href="/cart/checkout">Retry Checkout</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-border h-12 font-medium">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
          Payment Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          We could not locate a payment matching this transaction. If you believe this is an error, please contact our support team.
        </p>
        <Button asChild variant="outline" className="border-border h-12 font-medium">
          <Link href="/products">Go to Shop</Link>
        </Button>
      </div>
    );
  }

  // No status param — generic landing
  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <AlertTriangle className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
        Order Status Unknown
      </h1>
      <p className="text-muted-foreground mb-6">
        We couldn&apos;t determine your order status. Please check your order history or contact support.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-medium">
          <Link href="/customer/dashboard">My Orders</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 border-border h-12 font-medium">
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutConfirmationPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          }
        >
          <ConfirmationContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
