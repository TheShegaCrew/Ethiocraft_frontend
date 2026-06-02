"use client"
import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDollarSign,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  PackageCheck,
  Send,
  Truck,
  Wallet,
} from 'lucide-react';

type TabKey = 'Payments' | 'Customer' | 'Address' | 'Activity';
type OrderStatus = 'PAID' | 'PENDING' | 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type Payment = {
  id: string;
  provider: 'CHAPA';
  status: 'SUCCESS' | 'PENDING';
  amount: number;
  txRef: string;
  paidAt: string;
  checkoutReference: string;
  failureReason?: string;
  payload: Record<string, string | number | boolean | null>;
};

const tabs: TabKey[] = ['Payments', 'Customer', 'Address', 'Activity'];

const order = {
  id: 'cmnbjwngt0000wsktk7kfta3i',
  currency: 'ETB',
  createdAt: '2026-02-06 09:15',
  paidAt: '2026-02-06 09:22',
  updatedAt: '2026-02-06 11:04',
  status: 'PAID' as OrderStatus,
  total: 1600,
  subtotal: 1450,
  shipping: 150,
  tax: 0,
};

const items = [
  {
    id: 'IT-1',
    name: 'Handwoven Mesob Basket',
    slug: 'handwoven-mesob-basket',
    artisanName: 'Marta Woven Craft',
    unitPrice: 1450,
    quantity: 1,
    thumbnail:
      'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=900&q=80',
  },
];

const paymentsInitial: Payment[] = [
  {
    id: 'PMT-1',
    provider: 'CHAPA',
    status: 'SUCCESS',
    amount: 1600,
    txRef: 'CHAPA-X8SK-001',
    paidAt: '2026-02-06 09:22',
    checkoutReference: 'CHK-2418-AB9',
    payload: {
      amount: 1600,
      currency: 'ETB',
      method: 'card',
      processorStatus: 'success',
      customerEmail: 'samuel.kassa@mail.com',
    },
  },
  {
    id: 'PMT-2',
    provider: 'CHAPA',
    status: 'PENDING',
    amount: 1600,
    txRef: 'CHAPA-X8SK-000',
    paidAt: '2026-02-06 09:18',
    checkoutReference: 'CHK-2418-AB1',
    failureReason: 'Customer left checkout before authentication.',
    payload: {
      amount: 1600,
      currency: 'ETB',
      method: 'card',
      processorStatus: 'pending',
      retryAllowed: true,
    },
  },
];

const customer = {
  name: 'Samuel Kassa',
  email: 'samuel.kassa@mail.com',
  phone: '+251 91 334 9087',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  joinedAt: '2025-07-12',
  totalOrders: 18,
};

const shippingAddress = {
  recipient: 'Samuel Kassa',
  phone: '+251 91 334 9087',
  region: 'Addis Ababa',
  city: 'Bole',
  woreda: '03',
  lines: ['Bole Medhanialem', 'Near Edna Mall'],
};

const activityLog = [
  'Order created at 2026-02-06 09:15',
  'Payment SUCCESS via CHAPA at 2026-02-06 09:22',
  'Order marked as PAID',
  'Pending payment attempt detected and tracked for risk review',
];

function statusBadge(status: OrderStatus) {
  if (status === 'PAID' || status === 'PROCESSING') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'PENDING' || status === 'PENDING_PAYMENT') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (status === 'SHIPPED') return 'bg-sky-50 text-sky-700 border-sky-100';
  if (status === 'DELIVERED') return 'bg-emerald-100/50 text-emerald-800 border-emerald-200';
  return 'bg-rose-50 text-rose-700 border-rose-100';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('Payments');
  const params = useParams();
  const orderId = params?.id as string | undefined;

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [payments, setPayments] = useState<Payment[]>(paymentsInitial);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(paymentsInitial[0].id ?? null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasPendingAfterSuccess = useMemo(
    () => payments.some((p) => p.status === 'SUCCESS') && payments.some((p) => p.status === 'PENDING'),
    [payments],
  );

  const paymentAttempts = payments.length;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2300);
  };

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      setLoading(true);
      setError(null);
      try {
        const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';
        const res = await fetch(`${base}/orders/${orderId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Fetch failed (${res.status}): ${text}`);
        }
        const json = await res.json();
        const payload = json?.data ?? json;
        setOrderData(payload);
        if (payload?.payments) setPayments(payload.payments as Payment[]);
        if (payload?.status) setStatus(payload.status as OrderStatus);
        setExpandedPaymentId((payload?.payments && payload.payments[0]?.id) ?? paymentsInitial[0]?.id ?? null);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const updateStatus = async (newStatus: OrderStatus) => {
    try {
      setLoading(true);
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1';

      const res = await fetch(`${base}/orders/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || `Update failed (${res.status})`);
      }

      setStatus(newStatus);
      showToast(`Order marked as ${newStatus.toLowerCase()}`);
    } catch (err: any) {
      let errorMessage = err?.message ?? 'Failed to update order status';
      try {
        const parsed = JSON.parse(errorMessage);
        errorMessage = parsed.message || errorMessage;
      } catch (e) {
        // Not JSON
      }
      showToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const markProcessing = () => {
    if (status !== 'PAID') return showToast('Order must be PAID to start processing');
    updateStatus('PROCESSING');
  };

  const markShipped = () => {
    if (status !== 'PROCESSING') return showToast('Order must be PROCESSING before shipping');
    updateStatus('SHIPPED');
  };

  const markDelivered = () => {
    if (status !== 'SHIPPED') return showToast('Order must be SHIPPED before delivery');
    updateStatus('DELIVERED');
  };

  const handleCancelClick = () => {
    if (!['PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(status)) return showToast('Cannot cancel in current state');
    setShowCancelConfirm(true);
  };

  const handleRefundClick = () => {
    const hasSuccessPayment = payments.some((p) => p.status === 'SUCCESS');
    if (!hasSuccessPayment) return showToast('No successful payment to refund');
    setShowRefundConfirm(true);
  };

  const riskAlerts = [
    paymentAttempts > 1 ? 'Multiple payment attempts detected' : '',
    hasPendingAfterSuccess ? 'Pending payment exists after successful transaction' : '',
    status === 'PAID' ? 'Shipment update missing for paid order' : '',
  ].filter(Boolean);

  const currentOrder = orderData ?? order;
  const currentItems = orderData?.items ?? items;
  const currentCustomer = orderData?.customer ?? customer;
  const currentShipping = orderData?.shippingAddress ?? shippingAddress;
  const currentActivity = orderData?.activityLog ?? activityLog;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] text-[#1C1C1C]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C6A75E] border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Loading Order Details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-[#1C1C1C] font-sans overflow-x-hidden relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#EAE5D9] px-6 py-5 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-1" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
              Order Management
            </p>
            <h1 className="text-2xl md:text-3xl tracking-tight text-[#2D2620]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>
              {currentOrder.id}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusBadge(status)}`}>
                {status}
              </span>
              <span className="inline-flex items-center px-3 py-1 bg-[#FBFaf8] border border-[#EAE5D9] rounded-full text-[11px] font-bold text-[#766A5D] uppercase tracking-wider">
                {currentOrder.currency}
              </span>
              <div className="h-4 w-[1px] bg-[#EAE5D9] mx-1 hidden sm:block" />
              <div className="flex gap-4 text-[11px] font-medium text-[#8B7F72] uppercase tracking-wider">
                <span>Created: {currentOrder.createdAt}</span>
                <span>Paid: {currentOrder.paidAt}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-0.5">Total Amount</p>
              <p className="text-2xl font-bold text-[#3E2723] leading-none">{currentOrder.totalAmount} <span className="text-sm">ETB</span></p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={markProcessing} className="px-4 py-2 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] hover:text-[#3E2723] transition-all shadow-sm">
                Mark Processing
              </button>
              <button onClick={markShipped} className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm">
                Mark Shipped
              </button>
              <button onClick={markDelivered} className="px-4 py-2 bg-sky-50 border border-sky-100 rounded-xl text-xs font-bold text-sky-700 hover:bg-sky-100 transition-all shadow-sm">
                Mark Delivered
              </button>
              <button onClick={handleCancelClick} className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-sm">
                Cancel
              </button>
              {/* <button onClick={handleRefundClick} className="px-4 py-2 bg-[#3E2723] text-white rounded-xl text-xs font-bold hover:bg-[#2A1A17] transition-all shadow-lg shadow-[#3E2723]/10">
                Refund
              </button> */}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-7">
            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                Order Items
              </h2>
              <div className="space-y-4">
                {currentItems.map((item) => (
                  <div key={item.id} className="group relative rounded-2xl border border-[#F0EBE0] bg-[#FBFaf8]/50 p-5 transition-all hover:bg-white hover:border-[#C6A75E]/30 hover:shadow-md">
                    <div className="flex items-start gap-6">
                      <div className="h-24 w-24 rounded-2xl border border-[#EAE5D9] overflow-hidden bg-white shadow-sm flex-shrink-0">
                        <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-lg font-bold text-[#2D2620] truncate group-hover:text-[#3E2723] transition-colors">{item.name}</p>
                            <p className="mt-1 text-xs font-semibold text-[#8B7F72] uppercase tracking-wider">
                              Artisan: <span className="text-[#3E2723]">{item.artisan?.firstName ? `${item.artisan.firstName} ${item.artisan.lastName ?? ''}` : item.artisanName}</span>
                            </p>
                          </div>
                          <a href={`/products/${item.slug}`} className="p-2 text-[#A39B8F] hover:text-[#C6A75E] hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#EAE5D9]">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[#F0EBE0] pt-4">
                          <div className="flex gap-6">
                            <div>
                              <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-0.5">Unit Price</p>
                              <p className="text-sm font-bold text-[#5C5449]">{item.unitPrice} <span className="text-[10px]">ETB</span></p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-0.5">Quantity</p>
                              <p className="text-sm font-bold text-[#5C5449]">{item.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-0.5">Line Total</p>
                            <p className="text-lg font-bold text-[#C6A75E] leading-none">{item.unitPrice * item.quantity} <span className="text-xs">ETB</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                Fulfillment Timeline
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Order Created', time: currentOrder.createdAt, done: true, icon: CircleDollarSign, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                  { label: 'Payment Completed', time: currentOrder.paidAt, done: true, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                  { label: 'Shipped', time: status === 'SHIPPED' || status === 'DELIVERED' ? '2026-02-06 11:05' : 'Pending', done: status === 'SHIPPED' || status === 'DELIVERED', icon: Truck, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
                  { label: 'Delivered', time: status === 'DELIVERED' ? '2026-02-07 14:40' : 'Pending', done: status === 'DELIVERED', icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-100/50", border: "border-emerald-200" },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className={`p-4 rounded-2xl border ${step.border} bg-white shadow-sm transition-transform hover:-translate-y-1 duration-300`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-xl ${step.bg} ${step.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#8B7F72] uppercase tracking-wider mb-0.5">{step.label}</p>
                        <p className="text-xs font-bold text-[#2D2620]">{step.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden min-h-[400px]">
              <div className="mb-6 flex flex-wrap gap-6 border-b border-[#F0EBE0]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`relative pb-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-[#3E2723]' : 'text-[#A39B8F] hover:text-[#3E2723]'}`}>
                    {tab}
                    {activeTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#C6A75E] rounded-full" />}
                  </button>
                ))}
              </div>

              {activeTab === 'Payments' && (
                <div className="space-y-3">
                  {hasPendingAfterSuccess && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-medium">Multiple payment attempts detected</p>
                      <p className="text-xs">Pending payment exists after successful transaction.</p>
                    </div>
                  )}

                  <div className="bg-[#FBFaf8] rounded-2xl border border-[#EAE5D9] overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1.3fr_1fr_0.6fr] bg-white border-b border-[#EAE5D9] px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#A39B8F]">
                      <span>Provider</span>
                      <span>Status</span>
                      <span>Amount</span>
                      <span>Reference</span>
                      <span>Timestamp</span>
                      <span />
                    </div>
                    {payments.map((payment) => (
                      <div key={payment.id} className="group transition-colors hover:bg-white border-b last:border-b-0 border-[#F0EBE0]">
                        <button
                          className="grid w-full grid-cols-[1fr_1fr_1fr_1.3fr_1fr_0.6fr] items-center px-6 py-5 text-left text-sm font-medium"
                          onClick={() => setExpandedPaymentId((prev) => (prev === payment.id ? null : payment.id))}
                        >
                          <span className="text-[#5C5449] font-bold">{payment.provider}</span>
                          <span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${payment.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                              {payment.status}
                            </span>
                          </span>
                          <span className="font-bold text-[#2D2620]">{payment.amount} ETB</span>
                          <span className="text-[#8B7F72] text-xs font-mono">{payment.txRef}</span>
                          <span className="text-[#8B7F72] text-xs font-medium">{payment.paidAt}</span>
                          <ChevronDown className={`h-4 w-4 text-[#A39B8F] group-hover:text-[#3E2723] transition-transform duration-300 ${expandedPaymentId === payment.id ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedPaymentId === payment.id && (
                          <div className="bg-white border-t border-[#F0EBE0] px-6 py-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="p-4 bg-[#FBFaf8] rounded-xl border border-[#EAE5D9]">
                                <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Checkout Reference</p>
                                <p className="text-xs font-mono font-bold text-[#3E2723]">{payment.checkoutReference}</p>
                              </div>
                              {payment.failureReason && (
                                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-1">Failure Reason</p>
                                  <p className="text-xs font-semibold text-rose-700">{payment.failureReason}</p>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-2">Raw Payload Response</p>
                            <pre className="overflow-auto rounded-xl border border-[#EAE5D9] bg-[#1C1C1C] p-4 text-[11px] font-mono text-[#EAE5D9] leading-relaxed scrollbar-hide">{JSON.stringify(payment.payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Customer' && (
                <div className="rounded-2xl border border-neutral-200 p-4 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <p><span className="text-[#7a6f65]">Name:</span> {currentCustomer.firstName} {currentCustomer.lastName}</p>
                    <p><span className="text-[#7a6f65]">Email:</span> {currentCustomer.email}</p>
                    <p><span className="text-[#7a6f65]">Phone:</span> {currentCustomer.phone}</p>
                    <p><span className="text-[#7a6f65]">Role:</span> {currentCustomer.role}</p>
                    <p><span className="text-[#7a6f65]">Status:</span> {currentCustomer.status}</p>
                    <p><span className="text-[#7a6f65]">Joined:</span> {currentCustomer.createdAt}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                    <button className="rounded-lg border border-neutral-200 px-3 py-2" onClick={() => showToast('Customer profile opened')}>View full profile</button>
                    <button className="rounded-lg border border-neutral-200 px-3 py-2" onClick={() => showToast('Message panel opened')}>Message customer</button>
                    <button className="rounded-lg border border-neutral-200 px-3 py-2" onClick={() => showToast('Order history opened')}>View order history</button>
                  </div>
                </div>
              )}

              {activeTab === 'Address' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="p-6 bg-[#FBFaf8] rounded-2xl border border-[#EAE5D9]">
                    <h3 className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-4">Recipient Details</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-[#3E2723] text-white rounded-2xl flex items-center justify-center font-bold text-lg">
                        {currentShipping?.recipient?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#2D2620]">{currentShipping.recipient}</p>
                        <p className="text-sm font-medium text-[#766A5D]">{currentShipping.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 border-t border-[#F0EBE0] pt-6">
                      <div>
                        <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Region</p>
                        <p className="text-sm font-bold text-[#2D2620]">{currentShipping.region}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">City</p>
                        <p className="text-sm font-bold text-[#2D2620]">{currentShipping.city}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Woreda</p>
                        <p className="text-sm font-bold text-[#2D2620]">{currentShipping.woreda}</p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-white rounded-xl border border-[#EAE5D9]">
                      <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-2">Street Address</p>
                      <p className="text-sm font-medium text-[#5C5449] leading-relaxed">{currentShipping.line1}</p>
                      {currentShipping.line2 && <p className="text-sm font-medium text-[#5C5449] leading-relaxed mt-1">{currentShipping.line2}</p>}
                    </div>

                    <button className="mt-6 flex items-center gap-2 text-[11px] font-bold text-[#C6A75E] uppercase tracking-widest hover:text-[#3E2723] transition-colors" onClick={() => showToast('Map integration placeholder')}>
                      <MapPin className="h-4 w-4" /> View on Digital Map
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Activity' && (
                <div className="py-2 animate-in fade-in duration-500">
                  <ol className="space-y-6 border-l-2 border-[#F0EBE0] ml-3 pl-8 text-sm">
                    {currentActivity.map((entry, i) => (
                      <li key={i} className="relative group">
                        <span className="absolute -left-[37px] top-1 h-4 w-4 rounded-full bg-white border-2 border-[#C6A75E] shadow-sm group-hover:scale-125 transition-transform" />
                        <div className="p-4 bg-[#FBFaf8] rounded-xl border border-[#F0EBE0] group-hover:bg-white group-hover:border-[#C6A75E]/30 transition-all">
                          <p className="font-bold text-[#2D2620] mb-1">{entry.split(' at ')[0]}</p>
                          <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest">
                            {entry.split(' at ')[1] || 'Timestamp Unavailable'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </article>
          </section>

          <aside className="space-y-6 xl:col-span-5">
            <div className="space-y-6 xl:sticky xl:top-6">


              <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                  Payment Summary
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium text-[#766A5D]">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#2D2620]">{currentOrder.subtotalAmount} ETB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-[#766A5D]">
                    <span>Shipping Fee</span>
                    <span className="font-bold text-[#2D2620]">{currentOrder.shippingFee} ETB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-[#766A5D]">
                    <span>Estimated Tax</span>
                    <span className="font-bold text-[#2D2620]">{currentOrder.taxAmount} ETB</span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-[#F0EBE0] flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Total Payable</p>
                      <p className="text-3xl font-bold text-[#3E2723] leading-none tracking-tight">{currentOrder.totalAmount} <span className="text-sm">ETB</span></p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CircleDollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm overflow-hidden">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                  Customer Information
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#EAE5D9] text-[#766A5D] rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
                    {(currentCustomer?.firstName?.[0] || currentCustomer?.name?.[0] || 'C')}
                    {(currentCustomer?.lastName?.[0] || '')}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2D2620]">{currentCustomer.firstName} {currentCustomer.lastName}</p>
                    <p className="text-xs font-semibold text-[#C6A75E] uppercase tracking-widest">{currentCustomer.role}</p>
                  </div>
                </div>

                <div className="space-y-4 bg-[#FBFaf8] p-4 rounded-2xl border border-[#F0EBE0]">
                  <div>
                    <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Email Address</p>
                    <p className="text-sm font-bold text-[#2D2620]">{currentCustomer.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-sm font-bold text-[#2D2620]">{currentCustomer.phone}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-[#F0EBE0] pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Total Orders</p>
                      <p className="text-sm font-bold text-[#2D2620]">{currentCustomer.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1">Customer Since</p>
                      <p className="text-sm font-bold text-[#2D2620]">{currentCustomer.createdAt}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button onClick={() => showToast('Profile opened')} className="flex-1 py-2.5 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] transition-all">
                    View Profile
                  </button>
                  <button onClick={() => showToast('Message sent')} className="flex-1 py-2.5 bg-white border border-[#EAE5D9] rounded-xl text-xs font-bold text-[#766A5D] hover:bg-[#FBFaf8] flex items-center justify-center gap-2 transition-all">
                    <Send className="h-3 w-3" /> Message
                  </button>
                </div>
              </article>

              {riskAlerts.length > 0 && (
                <article className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.08em] text-amber-700" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Risk Indicators</p>
                  <div className="mt-3 space-y-2 text-xs text-amber-800">
                    {riskAlerts.map((alert) => (
                      <p key={alert} className="rounded-lg bg-white/70 px-3 py-2">{alert}</p>
                    ))}
                  </div>
                </article>
              )}

              <article className="rounded-3xl border border-[#EAE5D9] bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A39B8F] mb-6 flex items-center gap-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A75E]" />
                  Quick Insights
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Items", value: "1", icon: PackageCheck },
                    { label: "Artisans", value: "1", icon: ExternalLink },
                    { label: "Attempts", value: "2", icon: Clock },
                    { label: "Value", value: "1600", icon: Wallet },
                  ].map((insight, i) => (
                    <div key={i} className="p-4 bg-[#FBFaf8] rounded-2xl border border-[#F0EBE0] transition-all hover:bg-white hover:border-[#C6A75E]/30 group">
                      <p className="text-[10px] font-bold text-[#A39B8F] uppercase tracking-widest mb-1 group-hover:text-[#C6A75E] transition-colors">{insight.label}</p>
                      <p className="text-lg font-bold text-[#2D2620]">{insight.value}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </aside>
        </div>
      </main>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[#EAE5D9] w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#2D2620] mb-2" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>Cancel Order</h3>
            <p className="text-sm font-medium text-[#766A5D] mb-8 leading-relaxed">This will mark the order as cancelled and stop the fulfillment workflow. This action is tracked in the audit log.</p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowCancelConfirm(false)}
                className="px-6 py-3 text-xs font-bold text-[#A39B8F] uppercase tracking-widest hover:text-[#3E2723] transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => { setShowCancelConfirm(false); updateStatus('CANCELLED'); }}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowRefundConfirm(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-[#EAE5D9] w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#2D2620] mb-2" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif', textTransform: 'uppercase' }}>Issue Refund</h3>
            <p className="text-sm font-medium text-[#766A5D] mb-8 leading-relaxed">You are about to refund <span className="text-[#3E2723] font-bold">{currentOrder.totalAmount} ETB</span> to <span className="text-[#3E2723] font-bold">{currentCustomer.firstName}</span> via CHAPA.</p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowRefundConfirm(false)}
                className="px-6 py-3 text-xs font-bold text-[#A39B8F] uppercase tracking-widest hover:text-[#3E2723] transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => { setShowRefundConfirm(false); showToast('Refund request submitted'); }}
                className="px-6 py-3 bg-[#3E2723] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2A1A17] shadow-lg shadow-[#3E2723]/20 transition-all active:scale-95"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border border-[#EAE5D9] bg-white text-[#2D2620]">
            <CheckCircle2 className="w-5 h-5 text-[#C6A75E]" />
            <p className="text-sm font-bold tracking-tight">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
}