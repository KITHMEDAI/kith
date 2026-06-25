'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRiskBgColor } from '@/lib/utils';
import type { Session } from '@/types';

export default function RecentNotes({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) {
    return (
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">No notes generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Notes</CardTitle>
        <Link href="/notes" className="text-xs text-teal-600 hover:underline flex items-center gap-0.5">View all <ChevronRight className="h-3 w-3" /></Link>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {sessions.slice(0, 3).map(s => {
          const patient = s.patient as { display_name: string } | undefined;
          return (
            <Link key={s.id} href={`/notes/${s.id}`} className="flex items-start gap-3 rounded-xl p-3 hover:bg-muted transition-colors">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-violet-50 text-violet-600 mt-0.5">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{patient?.display_name || 'Patient'}</p>
                  {s.risk_flags && <Badge className={`text-[10px] ${getRiskBgColor(s.risk_flags.level)}`}>{s.risk_flags.level}</Badge>}
                </div>
                {s.session_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.session_summary}</p>
                )}
                {(s.key_points?.length ?? 0) > 0 && !s.session_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.key_points?.[0]}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {format(new Date(s.started_at), 'dd MMM yyyy')} · Session #{s.session_number}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-none mt-1" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
