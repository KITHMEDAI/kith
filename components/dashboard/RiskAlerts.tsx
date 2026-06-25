'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials, getPatientAvatarColor, getRiskBgColor } from '@/lib/utils';
import type { Patient } from '@/types';

export default function RiskAlerts({ patients }: { patients: Patient[] }) {
  const flagged = patients.filter(p => ['high', 'critical'].includes(p.risk_level));

  if (!flagged.length) {
    return (
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Risk Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">✓ No high-risk patients this week</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-100 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4" /> Risk Alerts
          <Badge variant="danger" className="ml-auto">{flagged.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {flagged.map(p => (
          <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-3 rounded-xl bg-red-50 p-3 hover:bg-red-100 transition-colors">
            <div className={cn('flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold', getPatientAvatarColor(p.display_name))}>
              {getInitials(p.display_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.display_name}</p>
              <p className="text-xs text-muted-foreground">{p.diagnosis?.slice(0,2).join(', ')}</p>
            </div>
            <Badge className={getRiskBgColor(p.risk_level)}>{p.risk_level}</Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
