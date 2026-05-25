"use client"
import React from 'react';
import { Users } from 'lucide-react';

type User = { id?: string; name: string; role: string };

interface Props {
  usersSnapshot: User[];
  setActiveNav: (s: string) => void;
  showFeedback: (m: string) => void;
}

export default function UsersSnapshot({ usersSnapshot, setActiveNav, showFeedback }: Props) {
  return (
    <article className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_6px_20px_rgba(62,39,35,0.04)]">
      <h3 className="text-lg uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
        Users Snapshot
      </h3>
      <div className="mt-4 space-y-3">
        {usersSnapshot.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl border border-dashed border-[#d2c5b0] bg-[#faf7f2]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1e9da] mb-2">
              <Users className="h-5 w-5 text-[#81756b]" />
            </div>
            <h3 className="text-xs font-semibold text-[#3E2723]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>No Users Found</h3>
            <p className="mt-1 max-w-[180px] text-[10px] text-[#7a6f67]">
              No active users currently match the selected criteria.
            </p>
          </div>
        ) : (
          usersSnapshot.map((user) => (
            <div key={user.id || user.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#dccfbd]" />
                <p className="text-sm">{user.name}</p>
              </div>
              <span className="rounded-full bg-[#f5efe2] px-2 py-1 text-[11px] text-[#6f6257]">{user.role}</span>
            </div>
          ))
        )}
      </div>
      <button className="mt-4 text-sm text-[#3E2723] underline underline-offset-4" onClick={() => { setActiveNav('Users'); showFeedback('Opened user management'); }}>
        Manage All
      </button>
    </article>
  );
}
