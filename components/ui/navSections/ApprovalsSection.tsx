"use client"
import React, { useState, useEffect } from 'react';
import GenericSection from './GenericSection';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function ApprovalsSection(props: any) {
  const router = useRouter();
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingSamples = async () => {
      try {
        const res = await apiFetch('/admin/samples/pending?limit=20');
        if (!res.ok) throw new Error('Failed to fetch pending samples');
        const json = await res.json();
        
        if (json.data && Array.isArray(json.data.items)) {
          setSamples(json.data.items);
        } else if (json.data && Array.isArray(json.data)) {
          setSamples(json.data);
        }
      } catch (err) {
        console.error('Error fetching pending samples:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingSamples();
  }, []);

  const rows = samples.map((s: any) => ({
    id: s.id,
    name: s.title || 'Untitled Sample',
    owner: s.artisan ? `${s.artisan.firstName || ''} ${s.artisan.lastName || ''}`.trim() : 'Unknown Artisan',
    status: s.status || 'PENDING',
    updated: s.updatedAt ? new Date(s.updatedAt).toLocaleString() : 'N/A',
  }));

  const displayRows = loading
    ? [{ id: '—', name: 'Loading pending samples…', owner: '—', status: '—', updated: '—' }]
    : rows.length
    ? rows
    : [{ id: '—', name: 'No samples awaiting approval', owner: '—', status: '—', updated: '—' }];

  const handleViewDetails = (row: any) => {
    if (row.id === '—') return;
    router.push(`/admin/sample/${row.id}`);
  };

  const metrics = [
    { label: 'Total Pending', value: samples.length, description: 'Samples currently awaiting admin review' },
    { label: 'High Priority', value: samples.filter(s => {
      const diff = Date.now() - new Date(s.createdAt).getTime();
      return diff > 48 * 60 * 60 * 1000;
    }).length, description: 'Samples pending for more than 48 hours' },
    { label: 'Today', value: samples.filter(s => {
      const today = new Date().toDateString();
      return new Date(s.createdAt).toDateString() === today;
    }).length, description: 'Samples submitted today' },
  ];

  return (
    <GenericSection 
      {...props} 
      title="Sample Approvals" 
      description="Review and approve product samples submitted by artisans." 
      placeholderRows={displayRows}
      loading={loading}
      onViewDetails={handleViewDetails}
      isPlaceholder={false}
      metrics={metrics}
    />
  );
}
