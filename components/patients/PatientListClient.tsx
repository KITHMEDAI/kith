'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, UserPlus, ChevronRight, Upload } from 'lucide-react';
import LiveSyncControl from './LiveSyncControl';
import PatientFormPanel from './PatientFormPanel';
import { getInitials } from '@/lib/utils';
import type { Patient } from '@/types';

function age(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}

export default function PatientListClient({ patients: initial }: { patients: Patient[] }) {
  const router = useRouter();
  const [patients, setPatients]   = useState<Patient[]>(initial);
  const [search, setSearch]       = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Pick up fresh data when the server component re-renders (e.g. after a sync)
  useEffect(() => { setPatients(initial); }, [initial]);

  const active = patients.filter(p => p.status !== 'discharged');
  const filtered = active.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.display_name.toLowerCase().includes(q);
    return matchSearch;
  });

  function handlePatientAdded(newPatient: Patient) {
    setPatients(prev => [newPatient, ...prev]);
    setShowAddPanel(false);
    router.refresh();
  }

  return (
    <>
      {showAddPanel && (
        <PatientFormPanel
          onClose={() => setShowAddPanel(false)}
          onSaved={(p) => handlePatientAdded(p as Patient)}
        />
      )}

      <div className="page-enter space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Patients</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{active.length} active patients</p>
          </div>
          <div className="flex items-center gap-2">
            <LiveSyncControl onSynced={() => router.refresh()} />
            <Link
              href="/patients/import"
              className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-white px-3.5 py-2 text-[13px] font-medium text-violet-700 hover:bg-violet-50 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" /> Import from file
            </Link>
            <button
              onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add patient
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
            <input type="text" placeholder="Search patients…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-white/40 bg-white/60 backdrop-blur-md pl-8 pr-3 text-[13px] placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500" />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No patients found</p>
            <button
              onClick={() => setShowAddPanel(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add first patient
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
            {/* Table head */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr_80px] gap-4 px-5 py-2.5 border-b border-purple-200/50 bg-amber-50/50">
              {['Patient', 'Age / Gender', 'Diagnosis', ''].map(h => (
                <span key={h} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">{h}</span>
              ))}
            </div>
            {/* Rows */}
            {filtered.map((p, i) => (
              <Link key={p.id} href={`/patients/${p.id}`}
                className={`grid grid-cols-[2fr_1fr_1.5fr_80px] gap-4 items-center px-5 py-3.5 hover:bg-amber-50/50 transition-colors ${i < filtered.length - 1 ? 'border-b border-purple-200/30' : ''}`}>
                {/* Name + initials */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/70">
                    {getInitials(p.display_name)}
                  </div>
                  <span className="text-[13px] font-medium text-foreground truncate">{p.display_name}</span>
                </div>
                {/* Age */}
                <span className="text-[13px] text-muted-foreground">
                  {age(p.date_of_birth) ? `${age(p.date_of_birth)} yr` : '—'}
                  {p.gender ? ` · ${p.gender.charAt(0).toUpperCase()}` : ''}
                </span>
                {/* Diagnosis */}
                <div className="flex flex-wrap gap-1">
                  {(p.diagnosis || []).slice(0, 2).map(d => (
                    <span key={d} className="text-[10px] font-medium bg-muted text-foreground/70 px-1.5 py-0.5 rounded">{d}</span>
                  ))}
                  {(p.diagnosis || []).length > 2 && (
                    <span className="text-[10px] text-muted-foreground/80">+{p.diagnosis.length - 2}</span>
                  )}
                </div>
                {/* Arrow */}
                <div className="flex justify-end">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
