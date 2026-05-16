"use client"
import React, { useMemo, useState } from 'react';
import GenericSection from './GenericSection';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export default function ArtisansSection(props: any) {
  const router = useRouter();
  const { users = [], usersLoading = false, overview, overviewLoading } = props;
  const [selectedArtisan, setSelectedArtisan] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter for Artisans
  const artisans = users.filter((u: any) => u.role === 'ARTISAN');

  const rows = artisans.map((u: any) => {
    const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
    const statusLabel = u.status || (u.isActive !== undefined ? (u.isActive ? 'Active' : 'Inactive') : '—');
    const shopName = u.artisanProfile?.shopName || '—';
    return {
      id: u.id || u._id || 'N/A',
      name,
      owner: shopName,
      status: statusLabel,
      updated: u.updatedAt || u.createdAt ? new Date(u.updatedAt || u.createdAt).toLocaleString() : 'N/A',
      raw: u,
    };
  });

  const displayRows = usersLoading
    ? [{ id: '—', name: 'Loading artisans…', owner: '—', status: '—', updated: '—' }]
    : rows.length
      ? rows
      : [{ id: '—', name: 'No artisans found', owner: '—', status: '—', updated: '—' }];

  // Real metrics from overview + local filtered artisans
  const metrics = useMemo(() => {
    const loading = overviewLoading || usersLoading;
    const dash = overview;
    const byRole = (dash?.users || []) as { key: string; count?: number }[];
    const totalArtisans = loading ? '…' : (byRole.find((r) => r.key === 'ARTISAN')?.count ?? artisans.length);
    const activeArtisans = loading ? '…' : (dash?.counts?.activeArtisans ?? artisans.filter((u: any) => u.status === 'ACTIVE' || u.isActive).length);
    const withShop = artisans.filter((u: any) => u.artisanProfile?.shopName).length;

    return [
      { label: 'Total Artisans', value: String(totalArtisans), description: 'Registered artisan accounts' },
      { label: 'Active Artisans', value: String(activeArtisans), description: 'Status = ACTIVE' },
      { label: 'With Shop Profile', value: String(loading ? '…' : withShop), description: 'Have a named artisan shop' },
    ];
  }, [overview, overviewLoading, artisans, usersLoading]);

  const handleViewDetails = (row: any) => {
    if (row.id === '—') return;
    setSelectedArtisan(row.raw || row);
    setIsDrawerOpen(true);
  };

  const handleOpenFullRecord = () => {
    if (selectedArtisan?.id) {
      router.push(`/admin/users/${selectedArtisan.id}`);
      setIsDrawerOpen(false);
    }
  };

  return (
    <>
      <GenericSection
        {...props}
        title="Artisans"
        description={props.sectionDescriptions?.Artisans}
        placeholderRows={displayRows}
        loading={usersLoading}
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
              Artisan Overview
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedArtisan ? (
              <div className="space-y-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Artisan ID</p>
                  <p className="mt-1 font-medium">{selectedArtisan.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Name</p>
                  <p className="mt-1 font-medium">{`${selectedArtisan.firstName || ''} ${selectedArtisan.lastName || ''}`.trim()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Shop Name</p>
                  <p className="mt-1 font-medium">{selectedArtisan.artisanProfile?.shopName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Region</p>
                  <p className="mt-1 font-medium">{selectedArtisan.artisanProfile?.region || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Email</p>
                  <p className="mt-1 font-medium">{selectedArtisan.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Status</p>
                  <p className="mt-1 font-medium">{selectedArtisan.status}</p>
                </div>
              </div>
            ) : <p className="text-center text-[#85786d]">No artisan selected.</p>}
          </div>
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button onClick={handleOpenFullRecord} className="w-full bg-[#3E2723] text-white hover:opacity-90">Open Full Record</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
