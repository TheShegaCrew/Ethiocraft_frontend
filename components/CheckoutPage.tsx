'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, CreditCard, CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createOrderApi, initializePaymentApi, createUserAddress, fetchUserAddresses } from '@/lib/api'

type CheckoutStep = 'shipping' | 'payment' | 'review'

const checkoutFormSchema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number is required')
    .regex(/^[+0-9\s-]+$/, 'Please enter a valid phone number'),
  fullName: z.string().min(2, 'Full name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  region: z.string().min(2, 'Region is required'),
  postalCode: z.string().optional(),
  shippingMethod: z.enum(['standard', 'express']),
})

type CheckoutFormData = z.infer<typeof checkoutFormSchema>

export default function CheckoutPage() {
  const { items: cartItems, cartTotal, clearCart } = useCart()
  const { role } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  const [matchedAddress, setMatchedAddress] = useState<any | null>(null)
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null)

  const {
    register,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    mode: 'onBlur',
    defaultValues: {
      phone: '',
      fullName: '',
      address: '',
      city: 'Hawassa',
      region: 'SNNPR',
      postalCode: '',
      shippingMethod: 'standard',
    },
  })

  useEffect(() => {
    if (!role) {
      router.push('/auth/login?redirect=/cart/checkout')
    }
  }, [role, router])

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Redirecting to login...</p>
      </div>
    )
  }


  const formData = watch()
  const steps = [
    { id: 'shipping', label: 'Shipping', icon: MapPin },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'review', label: 'Review', icon: CheckCircle },
  ] as const

  const shippingCost = formData.shippingMethod === 'express' ? 450 : 150
  const orderData = useMemo(() => {
    const subtotal = cartTotal
    const total = subtotal + shippingCost
    const items = cartItems.map((item) => ({ name: item.name, qty: item.quantity, price: item.price }))
    return { subtotal, shipping: shippingCost, total, items }
  }, [cartItems, cartTotal, shippingCost])

  const isCartEmpty = cartItems.length === 0

  const handleNext = async () => {
    if (isCartEmpty) return
    if (currentStep === 'shipping') {
      const isValid = await trigger(['phone', 'fullName', 'address', 'city', 'region', 'shippingMethod'])
      if (!isValid) return
      // Try to find a saved address that matches the entered details and prompt the user
      try {
        const values = getValues()
        const normalize = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
        const existing = await fetchUserAddresses()
        const match = existing.find((a) =>
          normalize(a.recipientName) === normalize(values.fullName) &&
          normalize(a.phone) === normalize(values.phone) &&
          normalize(a.region) === normalize(values.region) &&
          normalize(a.city) === normalize(values.city) &&
          normalize(a.line1) === normalize(values.address) &&
          normalize(a.postalCode) === normalize(values.postalCode)
        )

        if (match) {
          setMatchedAddress(match)
          return
        }
      } catch (e) {
        // ignore fetch errors and proceed to payment
      }

      setCurrentStep('payment')
    } else if (currentStep === 'payment') {
      setCurrentStep('review')
    }
  }

  const handlePrev = () => {
    if (currentStep === 'payment') setCurrentStep('shipping')
    else if (currentStep === 'review') setCurrentStep('payment')
  }

  const handlePlaceOrder = async () => {
    if (isCartEmpty) {
      setPaymentError('Your cart is empty. Add items before placing an order.')
      return
    }

    const isValid = await trigger()
    if (!isValid) {
      setPaymentError('Please complete all required fields.')
      setCurrentStep('shipping')
      return
    }

    setIsProcessing(true)
    setPaymentError('')

    try {
      const values = getValues()
      let savedAddress = null

      if (chosenAddressId) {
        // user already chose a saved address earlier
        savedAddress = { id: chosenAddressId }
      } else if (matchedAddress) {
        savedAddress = matchedAddress
      } else {
        // No chosen or matched address: create one
        savedAddress = await createUserAddress({
          recipientName: values.fullName,
          phone: values.phone,
          region: values.region,
          city: values.city,
          line1: values.address,
          postalCode: values.postalCode || undefined,
          isDefault: false,
        })
      }

      // Step 2: Create the real order in the database
      const orderItems = cartItems.map((item) => ({
        productId: String(item.id),
        quantity: item.quantity,
      }))

      const newOrder = await createOrderApi({
        addressId: savedAddress.id,
        items: orderItems,
      })

      // Step 3: Initialize Chapa payment and get the hosted checkout URL
      const paymentResponse = await initializePaymentApi(newOrder.id, 'CHAPA')

      if (!paymentResponse.checkoutUrl) {
        throw new Error('No checkout URL returned from payment provider.')
      }

      // Step 4: Clear local cart and redirect to Chapa's secure hosted payment page
      await clearCart()
      window.location.href = paymentResponse.checkoutUrl
    } catch (error: any) {
      console.error('[Checkout] Error:', error)
      setPaymentError(
        error?.message || 'An error occurred while placing your order. Please try again.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-serif font-bold text-foreground">Checkout</h1>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const stepIndex = steps.findIndex((s) => s.id === step.id)
              const currentIndex = steps.findIndex((s) => s.id === currentStep)
              const isCompleted = stepIndex < currentIndex
              const isCurrent = stepIndex === currentIndex

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-colors ${
                      isCompleted || isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? '✓' : stepIndex + 1}
                  </div>
                  <span
                    className={`ml-3 font-medium text-sm ${
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 mx-4 h-1 rounded-full transition-colors ${
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Panel: Form */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {currentStep === 'shipping' && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
                  Shipping Information
                </h2>

                <div className="space-y-6">
                  {/* Contact Section */}
                  <div className="border-b border-border pb-6">
                    <h3 className="font-medium text-foreground mb-4">Contact Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        {...register('phone')}
                        placeholder="+251 900 123 456"
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address Section */}
                  <div className="border-b border-border pb-6">
                    <h3 className="font-medium text-foreground mb-4">Delivery Address</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          {...register('fullName')}
                          placeholder="Abebe Bekele"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {errors.fullName && (
                          <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Street Address / Kebele
                        </label>
                        <input
                          type="text"
                          {...register('address')}
                          placeholder="Kebele 04, House No. 12"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {errors.address && (
                          <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Region
                          </label>
                          <input
                            type="text"
                            {...register('region')}
                            placeholder="Sidama"
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          {errors.region && (
                            <p className="mt-1 text-xs text-red-600">{errors.region.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            {...register('city')}
                            placeholder="Hawassa"
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          {errors.city && (
                            <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Postal Code (optional)
                          </label>
                          <input
                            type="text"
                            {...register('postalCode')}
                            placeholder="1000"
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Method */}
                  <div>
                    <h3 className="font-medium text-foreground mb-4">Shipping Method</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'standard', label: 'Standard Delivery (3-5 days)', price: 150 },
                        { id: 'express', label: 'Express Delivery (1-2 days)', price: 450 },
                      ].map((method) => (
                        <label
                          key={method.id}
                          className="flex items-center p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          style={{
                            borderColor:
                              formData.shippingMethod === method.id ? 'var(--primary)' : '',
                          }}
                        >
                          <input
                            type="radio"
                            {...register('shippingMethod')}
                            value={method.id}
                            className="w-4 h-4 text-primary"
                          />
                          <div className="ml-4 grow">
                            <p className="font-medium text-foreground">{method.label}</p>
                          </div>
                          <span className="text-primary font-semibold">ETB {method.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {matchedAddress && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                    <p className="font-medium">We found a saved address that matches what you entered:</p>
                    <div className="mt-2 text-sm text-foreground">
                      <p className="font-semibold">{matchedAddress.recipientName}</p>
                      <p>{matchedAddress.line1}{matchedAddress.line2 ? `, ${matchedAddress.line2}` : ''}</p>
                      <p>{matchedAddress.city}, {matchedAddress.region} {matchedAddress.postalCode || ''}</p>
                      <p className="text-sm text-muted-foreground">{matchedAddress.phone}</p>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button
                        onClick={() => {
                          setChosenAddressId(matchedAddress.id)
                          setMatchedAddress(null)
                          setCurrentStep('payment')
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Use saved address
                      </Button>
                      <Button
                        onClick={() => {
                          setMatchedAddress(null)
                          setCurrentStep('payment')
                        }}
                        className="bg-white border border-border"
                      >
                        Use new address
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleNext}
                  disabled={isCartEmpty}
                  className="w-full mt-8 bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-medium"
                >
                  Continue to Payment
                </Button>
                {isCartEmpty && (
                  <p className="mt-3 text-sm text-muted-foreground text-center">
                    Your cart is empty.{' '}
                    <Link href="/products" className="text-primary underline">
                      Browse products
                    </Link>{' '}
                    to continue.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 'payment' && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Payment</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  You will be securely redirected to Chapa to complete your payment.
                </p>

                {/* Chapa Info Card */}
                <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg">
                      C
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        Chapa — Secure Hosted Payment
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cards, bank transfers &amp; mobile money
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>
                      Your payment details are entered directly on Chapa&apos;s secure page.
                      EthioCraft never sees your card information.
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handlePrev}
                    variant="outline"
                    className="flex-1 border-border h-12 font-medium"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={isCartEmpty}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-medium"
                  >
                    Review Order
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 'review' && (
              <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <h2 className="text-2xl font-serif font-bold text-foreground">
                  Review Your Order
                </h2>

                {/* Items */}
                <div className="border-b border-border pb-6">
                  <h3 className="font-medium text-foreground mb-4">
                    Order Items ({cartItems.length})
                  </h3>
                  <div className="space-y-2">
                    {orderData.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.name}{' '}
                          <span className="text-muted-foreground">× {item.qty}</span>
                        </span>
                        <span className="text-foreground font-medium">
                          ETB {(item.price * item.qty).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border-b border-border pb-6">
                  <h3 className="font-medium text-foreground mb-3">Shipping Address</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">{formData.fullName}</p>
                    <p>{formData.address}</p>
                    <p>
                      {formData.city}, {formData.region} {formData.postalCode}
                    </p>
                    <p>{formData.phone}</p>
                  </div>
                  <Button
                    onClick={() => setCurrentStep('shipping')}
                    variant="outline"
                    className="mt-3 border-border text-xs h-8 px-3"
                  >
                    Edit
                  </Button>
                </div>

                {/* Payment Method */}
                <div className="border-b border-border pb-6">
                  <h3 className="font-medium text-foreground mb-3">Payment</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
                      C
                    </div>
                    <span className="font-medium text-foreground">Chapa Hosted Payment</span>
                    <ShieldCheck className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                </div>

                {/* Delivery estimate */}
                <div className="border-b border-border pb-6">
                  <h3 className="font-medium text-foreground mb-3">Delivery</h3>
                  <p className="text-sm text-muted-foreground">
                    {formData.shippingMethod === 'express'
                      ? 'Express Delivery — Estimated 1-2 business days'
                      : 'Standard Delivery — Estimated 3-5 business days'}
                  </p>
                </div>

                {paymentError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{paymentError}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handlePrev}
                    variant="outline"
                    className="flex-1 border-border h-12 font-medium"
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || isCartEmpty}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-medium"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Pay with Chapa
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  By placing this order you agree to EthioCraft&apos;s terms. You will be
                  redirected to Chapa&apos;s secure page to complete payment.
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Order Summary (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-serif font-bold text-foreground">Order Summary</h3>

              <div className="space-y-3 pb-6 border-b border-border max-h-64 overflow-y-auto">
                {orderData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground truncate">
                      {item.name} ×{item.qty}
                    </span>
                    <span className="text-foreground font-medium shrink-0">
                      ETB {(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
                {isCartEmpty && (
                  <p className="text-sm text-muted-foreground italic">No items in cart.</p>
                )}
              </div>

              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground font-medium">
                    ETB {orderData.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground font-medium">
                    ETB {orderData.shipping.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-foreground font-medium">Total</span>
                <span className="text-2xl font-bold text-primary">
                  ETB {orderData.total.toLocaleString()}
                </span>
              </div>

              {/* Security badge */}
              <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground border-t border-border">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <span>Secured by Chapa. Your payment is encrypted and safe.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}