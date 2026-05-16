"use client"
import React, { useState, useEffect, useMemo } from 'react';
import GenericSection from './GenericSection';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function SamplesSection(props: any) {
  const router = useRouter();
  const { overview, overviewLoading } = props;
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await apiFetch('/admin/products/samples');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setSamples(json.data);
        } else if (json.data?.items && Array.isArray(json.data.items)) {
          setSamples(json.data.items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, []);

  const rows = samples.map((s: any) => ({
    id: s.id,
    name: s.title || 'Untitled',
    owner: s.artisan ? `${s.artisan.firstName || ''} ${s.artisan.lastName || ''}`.trim() : 'Unknown',
    status: s.status || 'Unknown',
    updated: s.updatedAt ? new Date(s.updatedAt).toLocaleString() : 'N/A',
  }));

  const placeholderRows = loading
    ? [{ id: '—', name: 'Loading samples…', owner: '—', status: '—', updated: '—' }]
    : rows.length
    ? rows
    : [{ id: '—', name: 'No samples available', owner: '—', status: '—', updated: '—' }];

  // Real metrics derived from local samples list + overview counts
  const metrics = useMemo(() => {
    const isLoading = loading || overviewLoading;
    const pending = isLoading ? '…' : (overview?.counts?.pendingSamples ?? samples.filter((s: any) => s.status === 'PENDING').length);
    const total = isLoading ? '…' : samples.length;
    const approved = isLoading ? '…' : samples.filter((s: any) => s.status === 'APPROVED' || s.status === 'VERIFIED').length;

    return [
      { label: 'Total Samples', value: String(total), description: 'All submitted samples' },
      { label: 'Pending Review', value: String(pending), description: 'Awaiting admin decision' },
      { label: 'Approved', value: String(approved), description: 'Approved / Verified' },
    ];
  }, [samples, loading, overview, overviewLoading]);

  const handleViewDetails = (row: any) => {
    if (row.id === '—') return;
    setSelectedSample(row);
    setIsDrawerOpen(true);
  };

  const handleOpenFullRecord = () => {
    if (selectedSample?.id) {
      router.push(`/admin/sample/${selectedSample.id}`);
      setIsDrawerOpen(false);
    }
  };

  return (
    <>
      <GenericSection
        {...props}
        title="Samples"
        description={props.sectionDescriptions?.Samples}
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
              Sample Overview
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedSample ? (
              <div className="space-y-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Sample ID</p>
                  <p className="mt-1 font-medium">{selectedSample.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Title</p>
                  <p className="mt-1 font-medium">{selectedSample.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Artisan</p>
                  <p className="mt-1 font-medium">{selectedSample.owner}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Status</p>
                  <p className="mt-1 font-medium">{selectedSample.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Last Activity</p>
                  <p className="mt-1 font-medium">{selectedSample.updated}</p>
                </div>
              </div>
            ) : <p className="text-center text-[#85786d]">No sample selected.</p>}
          </div>
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button onClick={handleOpenFullRecord} className="w-full bg-[#3E2723] text-white hover:opacity-90">Open Full Record</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
