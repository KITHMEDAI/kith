'use client';

import { Users, Activity, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardStats } from '@/types';

interface Props { stats: DashboardStats; }

export default function StatsGrid({ stats }: Props) {
  // Only exact, real counts are shown — no estimated/derived clinical metrics.
  const items = [
    { label: 'Patients this month', value: stats.patientsThisMonth, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sessions today', value: stats.sessionsToday, icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Notes generated', value: stats.notesGenerated, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="border-border shadow-none hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
              </div>
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
