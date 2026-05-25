"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { useRouter } from 'next/navigation';
import { Inbox, X } from 'lucide-react';

type Customer = {
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: any;
};

type Order = {
  id: string;
  customer?: Customer | string;
  amount?: string;
  status?: string;
  date?: string;
  [key: string]: any;
};

interface Props {
  containerHeight: number;
  rowHeight: number;
  setDetailsOrder?: (o: Order | null) => void;
  setActiveNav: (s: string) => void;
  showFeedback: (m: string) => void;
  baseUrl?: string;
  bearerToken?: string;
  initialOrders?: Order[];
  fetchFromApi?: boolean;
}

function statusClass(status?: string) {
  if (!status) return 'bg-sky-50 text-sky-700';
  const s = String(status).toLowerCase();
  if (/paid|success|complete|deliv|fulfilled/.test(s)) return 'bg-emerald-50 text-emerald-700';
  if (/process|pending|waiting/.test(s)) return 'bg-amber-50 text-amber-700';
  return 'bg-sky-50 text-sky-700';
}

export default function RecentOrders({ containerHeight, rowHeight, setDetailsOrder, setActiveNav, showFeedback, initialOrders = [] }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders || []);
  const [visibleStart, setVisibleStart] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sort orders by time (most recent first)
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [orders]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const visibleCount = useMemo(() => Math.ceil(containerHeight / rowHeight) + 2, [containerHeight, rowHeight]);
  const visibleOrders = useMemo(() => sortedOrders.slice(visibleStart, Math.min(visibleStart + visibleCount, sortedOrders.length)), [sortedOrders, visibleStart, visibleCount]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
    if (setDetailsOrder) setDetailsOrder(order);
  };

  return (
    <>
      <article className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_8px_24px_rgba(62,39,35,0.05)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
            Recent Orders
          </h2>
          <button className="text-sm text-[#6c6157] transition hover:text-[#3E2723]" onClick={() => { setActiveNav('Orders'); showFeedback('Opened Orders section'); }}>
            View all
          </button>
        </div>
       
        <div className="overflow-hidden rounded-2xl border border-[#ece2d3]">
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_0.7fr] gap-4 bg-[#f8f4ec] px-4 py-3 text-xs uppercase tracking-[0.08em] text-[#7e7268]">
            <span className="truncate">Order ID</span>
            <span className="truncate">Customer</span>
            <span className="truncate">Amount</span>
            <span className="truncate">Status</span>
            <span className="truncate">Date</span>
            <span className="truncate text-center">Action</span>
          </div>
          <div className="relative overflow-y-auto divide-y divide-[#f1e8da]" style={{ height: `${containerHeight}px` }} onScroll={(event) => {
            const next = Math.floor(event.currentTarget.scrollTop / rowHeight);
            if (next !== visibleStart) setVisibleStart(next);
          }}>
            {sortedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 text-center h-full">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f1e9da] mb-3">
                  <Inbox className="h-8 w-8 text-[#81756b]" />
                </div>
                <h3 className="text-base font-semibold text-[#3E2723]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>No Recent Orders</h3>
                <p className="mt-1 max-w-xs text-xs text-[#85786d]">
                  There are no orders to display for this period.
                </p>
              </div>
            ) : (
              <div style={{ height: `${sortedOrders.length * rowHeight}px`, position: 'relative' }}>
                {visibleOrders.map((order: any, idx: number) => {
                  const index = visibleStart + idx;
                  const customerName = typeof order.customer === 'string' ? order.customer : (order.customer ? `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || order.customer?.email || '' : '');
                  const amount = order.totalAmount ?? order.amount ?? order.subtotalAmount ?? '—';
                  
                  return (
                    <div key={order.id} className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_0.7fr] gap-4 items-center px-4 text-sm transition hover:bg-[#fcf8f0]" style={{ position: 'absolute', top: `${index * rowHeight}px`, left: 0, right: 0, height: `${rowHeight}px`, fontFamily: 'Inter, sans-serif' }}>
                      <span className="min-w-0 truncate font-medium text-[#3E2723]">{order.id}</span>
                      <span className="min-w-0 truncate" title={customerName}>{customerName}</span>
                      <span className="min-w-0 truncate">{amount}{order.currency ? ` ${order.currency}` : ''}</span>
                      <span className="min-w-0">
                        <span className={`inline-block max-w-full truncate rounded-full px-2 py-1 text-xs ${statusClass(order.status)}`}>{order.status}</span>
                      </span>
                      <span className="min-w-0 truncate text-[#72665d]">{new Date(order.createdAt || order.date).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>View</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </article>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="fixed bottom-0 right-0 top-0 mt-0 h-full w-full max-w-md rounded-none border-l border-[#e8dece] bg-[#fffdf9]">
          <DrawerHeader className="flex items-center justify-between border-b border-[#e8dece] p-6">
            <DrawerTitle className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
              Order Overview
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedOrder ? (
              <div className="space-y-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Order ID</p>
                  <p className="mt-1 font-medium">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Customer</p>
                  <p className="mt-1 font-medium">{typeof selectedOrder.customer === 'string' ? selectedOrder.customer : `${selectedOrder.customer?.firstName || ''} ${selectedOrder.customer?.lastName || ''}`.trim() || selectedOrder.customer?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Amount</p>
                  <p className="mt-1 font-medium">{selectedOrder.totalAmount ?? selectedOrder.amount ?? 'N/A'}{selectedOrder.currency ? ` ${selectedOrder.currency}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Status</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Date</p>
                  <p className="mt-1 font-medium">{new Date(selectedOrder.createdAt || selectedOrder.date || 0).toLocaleString()}</p>
                </div>
              </div>
            ) : <p className="text-center text-[#85786d]">No order selected.</p>}
          </div>
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button 
              onClick={() => { 
                if (selectedOrder?.id) {
                  router.push(`/admin/orders/${selectedOrder.id}`);
                  setIsDrawerOpen(false);
                }
              }} 
              className="w-full bg-[#3E2723] text-white hover:opacity-90"
            >
              Open Full Record
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

