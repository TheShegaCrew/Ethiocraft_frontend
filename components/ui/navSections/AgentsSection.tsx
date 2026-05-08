"use client"
import React, { useState, useEffect } from 'react';
import GenericSection from './GenericSection';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AgentsSection(props: any) {
  const router = useRouter();
  const { users = [], usersLoading = false } = props;
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiFetch('/admin/agents/metrics');
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const json = await res.json();
        const data = json.data;

        setMetrics([
          { label: 'Total Agents', value: data.totalAgents, description: 'Registered verification agents' },
          { label: 'Active vs Inactive', value: `${data.activeAgents} / ${data.inactiveAgents}`, description: 'Account status overview' },
          { label: 'Avg Completion Rate', value: `${data.avgCompletionRate}%`, description: 'Successfully verified vs assigned' },
          { label: 'Avg Task Time', value: `${data.avgTaskTimeHours}h`, description: 'Mean time to review a sample' },
        ]);
      } catch (err) {
        console.error('Error fetching agent metrics:', err);
      }
    };
    fetchMetrics();
  }, []);

  // Filter for Agents
  const agents = users.filter((u: any) => u.role === 'VERIFICATION_AGENT');

  const rows = agents.map((u: any) => {
    const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
    const statusLabel = u.status || (u.isActive !== undefined ? (u.isActive ? 'Active' : 'Inactive') : '—');

    return {
      id: u.id || u._id || 'N/A',
      name: name,
      owner: u.email || '—',
      status: statusLabel,
      updated: u.updatedAt || u.createdAt ? new Date(u.updatedAt || u.createdAt).toLocaleString() : 'N/A',
      raw: u
    };
  });

  const displayRows = usersLoading
    ? [{ id: '—', name: 'Loading agents…', owner: '—', status: '—', updated: '—' }]
    : rows.length
      ? rows
      : [{ id: '—', name: 'No agents found', owner: '—', status: '—', updated: '—' }];

  const handleViewDetails = (row: any) => {
    if (row.id === '—') return;
    setSelectedAgent(row.raw || row);
    setIsDrawerOpen(true);
  };

  const handleOpenFullRecord = () => {
    if (selectedAgent?.id) {
      router.push(`/admin/users/${selectedAgent.id}`);
      setIsDrawerOpen(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/admin/agents/new');
  };

  return (
    <>
      <GenericSection
        {...props}
        title="Agents"
        description={props.sectionDescriptions?.Agents}
        placeholderRows={displayRows}
        loading={usersLoading}
        showFeedback={props.showFeedback}
        setActiveNav={props.setActiveNav}
        onViewDetails={handleViewDetails}
        metrics={metrics.length > 0 ? metrics : undefined}
        isPlaceholder={false}
        onCreateNew={handleCreateNew}
      />

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="fixed bottom-0 right-0 top-0 mt-0 h-full w-full max-w-md rounded-none border-l border-[#e8dece] bg-[#fffdf9]">
          <DrawerHeader className="flex items-center justify-between border-b border-[#e8dece] p-6">
            <DrawerTitle className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
              Agent Overview
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedAgent ? (
              <div className="space-y-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Agent ID</p>
                  <p className="mt-1 font-medium">{selectedAgent.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Name</p>
                  <p className="mt-1 font-medium">{`${selectedAgent.firstName || ''} ${selectedAgent.lastName || ''}`.trim()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Email</p>
                  <p className="mt-1 font-medium">{selectedAgent.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Role</p>
                  <p className="mt-1 font-medium">Verification Agent</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Status</p>
                  <p className="mt-1 font-medium">{selectedAgent.status}</p>
                </div>
              </div>
            ) : <p className="text-center text-[#85786d]">No agent selected.</p>}
          </div>
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button onClick={handleOpenFullRecord} className="w-full bg-[#3E2723] text-white hover:opacity-90">Open Full Record</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
