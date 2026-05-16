"use client"
import React, { useEffect, useMemo, useState } from 'react';
import GenericSection from './GenericSection';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ProductsSection(props: any) {
  const { overview, overviewLoading } = props;
  const [products, setProducts] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Fetch both draft pipeline (admin) and published marketplace products in parallel
    Promise.all([
      apiFetch('/verifications/products/drafts?page=1&limit=50').then((r) => r.ok ? r.json() : { data: { items: [] } }),
      apiFetch('/marketplace/products?limit=50').then((r) => r.ok ? r.json() : { data: { items: [] } }),
    ])
      .then(([draftsJson, publishedJson]) => {
        if (cancelled) return;
        const drafts: any[] = draftsJson?.data?.items ?? draftsJson?.data ?? [];
        const published: any[] = publishedJson?.data?.items ?? [];
        setProducts([...drafts, ...published]);
      })
      .catch((err) => {
        console.error('Failed to fetch products', err);
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const rows = (products || []).map((p: any, idx: number) => ({
    id: p?.id ?? p?._id ?? `unknown-${idx + 1}`,
    name: p?.title ?? p?.name ?? '—',
    owner: p?.artisan ? `${p.artisan.firstName ?? ''} ${p.artisan.lastName ?? ''}`.trim() : (p?.owner ?? '—'),
    status: p?.status ?? '—',
    updated: p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—',
  }));

  const placeholderRows = loading
    ? [{ id: '—', name: 'Loading products…', owner: '—', status: '—', updated: '—' }]
    : rows.length
    ? rows
    : [{ id: '—', name: 'No products found', owner: '—', status: '—', updated: '—' }];

  // Real metrics from overview products breakdown
  const metrics = useMemo(() => {
    const isLoading = loading || overviewLoading;
    const productRows = (overview?.products || []) as { key: string; count?: number }[];
    const total = isLoading ? '…' : (productRows.reduce((s: number, r: any) => s + (Number(r.count) || 0), 0) || (products?.length ?? 0));
    const published = isLoading ? '…' : (productRows.find((r) => r.key === 'PUBLISHED')?.count ?? (products || []).filter((p: any) => p.status === 'PUBLISHED').length);
    const pending = isLoading ? '…' : (productRows.find((r) => r.key === 'ADMIN_REVIEW' || r.key === 'PENDING')?.count ?? (products || []).filter((p: any) => ['ADMIN_REVIEW', 'PENDING'].includes(p.status)).length);

    return [
      { label: 'Total Products', value: String(total), description: 'All products across all statuses' },
      { label: 'Published', value: String(published), description: 'Live on marketplace' },
      { label: 'Pending Review', value: String(pending), description: 'Awaiting admin approval' },
    ];
  }, [overview, overviewLoading, products, loading]);

  const handleViewDetails = (productRow: any) => {
    setSelectedProduct(productRow);
    setIsDrawerOpen(true);
  };

  const handleOpenFullRecord = () => {
    if (selectedProduct?.id) {
      router.push(`/admin/products/${selectedProduct.id}`);
      setIsDrawerOpen(false);
    }
  };

  return (
    <>
      <GenericSection
        title="Products"
        description={props.sectionDescriptions?.Products}
        placeholderRows={placeholderRows}
        loading={loading}
        showFeedback={props.showFeedback}
        setActiveNav={props.setActiveNav}
        onViewDetails={handleViewDetails}
        metrics={metrics}
        isPlaceholder={false}
      />

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="fixed bottom-0 right-0 top-0 mt-0 h-full w-full max-w-md rounded-none border-l border-[#e8dece] bg-[#fffdf9]">
          <DrawerHeader className="flex items-center justify-between border-b border-[#e8dece] p-6">
            <DrawerTitle className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
              Product Details
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedProduct ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Product ID</p>
                  <p className="mt-1 font-medium">{selectedProduct.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Name</p>
                  <p className="mt-1 font-medium">{selectedProduct.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Owner</p>
                  <p className="mt-1 font-medium">{selectedProduct.owner}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Status</p>
                  <p className="mt-1 font-medium">{selectedProduct.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Last Updated</p>
                  <p className="mt-1 font-medium">{selectedProduct.updated}</p>
                </div>
              </div>
            ) : <p>No product selected.</p>}
          </div>
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button onClick={handleOpenFullRecord} className="w-full bg-[#3E2723] text-white hover:opacity-90">Open Full Record</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
