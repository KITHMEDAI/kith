import { redirect } from 'next/navigation';
import { TrendingUp, TrendingDown, Users, FileText, Clock, Activity } from 'lucide-react';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export default async function InsightsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!therapist) redirect('/register');

  // Use service role for analytics — avoids RLS silently zeroing counts
  const service = createServiceRoleClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo  = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

  // Parallel queries
  const [
    { data: thisMonthSessions },
    { data: lastMonthSessions },
    { count: activePatients },
    { count: lastMonthPatients },
    { count: totalNotes },
    { count: lastMonthNotes },
    { data: allPatients },
    { data: appointments },
    { data: sessionDurations },
  ] = await Promise.all([
    service
      .from('sessions')
      .select('id, started_at, ended_at')
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .gte('started_at', thirtyDaysAgo.toISOString()),

    service
      .from('sessions')
      .select('id')
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .gte('started_at', sixtyDaysAgo.toISOString())
      .lt('started_at', thirtyDaysAgo.toISOString()),

    service
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('status', 'active'),

    service
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('status', 'active')
      .lt('created_at', thirtyDaysAgo.toISOString()),

    service
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .not('soap_note', 'is', null)
      .gte('started_at', thirtyDaysAgo.toISOString()),

    service
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .not('soap_note', 'is', null)
      .gte('started_at', sixtyDaysAgo.toISOString())
      .lt('started_at', thirtyDaysAgo.toISOString()),

    service
      .from('patients')
      .select('id, diagnosis')
      .eq('therapist_id', therapist.id)
      .eq('status', 'active'),

    service
      .from('appointments')
      .select('modality')
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .gte('scheduled_at', thirtyDaysAgo.toISOString()),

    service
      .from('sessions')
      .select('started_at, ended_at')
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .not('ended_at', 'is', null)
      .gte('started_at', thirtyDaysAgo.toISOString()),
  ]);

  // ── Compute stats ─────────────────────────────────────────────────────────────
  const sessionsThisMonth = thisMonthSessions?.length ?? 0;
  const sessionsLastMonth = lastMonthSessions?.length ?? 0;
  const sessionDelta = sessionsThisMonth - sessionsLastMonth;

  const patientsNow  = activePatients ?? 0;
  const patientsDelta = patientsNow - (lastMonthPatients ?? 0);

  const notesNow   = totalNotes ?? 0;
  const notesDelta = notesNow - (lastMonthNotes ?? 0);

  // Average session duration in minutes
  let avgDurationMin = 0;
  if (sessionDurations && sessionDurations.length > 0) {
    const totalMs = sessionDurations.reduce((sum, s) => {
      if (!s.ended_at || !s.started_at) return sum;
      return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime());
    }, 0);
    avgDurationMin = Math.round(totalMs / sessionDurations.length / 60000);
  }

  // ── Session trend — split last 30 days into 4 weekly buckets ─────────────────
  const weeks = [0, 0, 0, 0];
  (thisMonthSessions || []).forEach(s => {
    const daysAgo = Math.floor((now.getTime() - new Date(s.started_at).getTime()) / 86400000);
    const bucket  = Math.min(3, Math.floor(daysAgo / 7));
    weeks[bucket]++;
  });
  const sessionTrend = [
    { label: 'Week 1', count: weeks[3] },
    { label: 'Week 2', count: weeks[2] },
    { label: 'Week 3', count: weeks[1] },
    { label: 'Week 4', count: weeks[0] },
  ];
  const trendMax = Math.max(...sessionTrend.map(t => t.count), 1);

  // ── Top diagnoses ─────────────────────────────────────────────────────────────
  const diagCounts: Record<string, number> = {};
  (allPatients || []).forEach(p => {
    ((p.diagnosis as string[]) || []).forEach(d => {
      diagCounts[d] = (diagCounts[d] || 0) + 1;
    });
  });
  const topDiagnoses = Object.entries(diagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // ── Modality split ────────────────────────────────────────────────────────────
  const modalityCounts: Record<string, number> = {};
  (appointments || []).forEach(a => {
    const m = (a.modality as string) || 'in_person';
    modalityCounts[m] = (modalityCounts[m] || 0) + 1;
  });
  const totalAppts = Object.values(modalityCounts).reduce((a, b) => a + b, 0);
  const modalitySplit = Object.entries(modalityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type: type.replace('_', ' '),
      count,
      pct: totalAppts ? Math.round((count / totalAppts) * 100) : 0,
    }));

  // ── Stat cards config ─────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Sessions this month',
      value: String(sessionsThisMonth),
      change: sessionDelta >= 0 ? `+${sessionDelta}` : String(sessionDelta),
      up: sessionDelta >= 0,
      icon: Activity,
    },
    {
      label: 'Active patients',
      value: String(patientsNow),
      change: patientsDelta >= 0 ? `+${patientsDelta}` : String(patientsDelta),
      up: patientsDelta >= 0,
      icon: Users,
    },
    {
      label: 'Notes generated',
      value: String(notesNow),
      change: notesDelta >= 0 ? `+${notesDelta}` : String(notesDelta),
      up: notesDelta >= 0,
      icon: FileText,
    },
    {
      label: 'Avg session duration',
      value: avgDurationMin > 0 ? `${avgDurationMin} min` : '—',
      change: avgDurationMin > 0 ? 'this month' : 'no data yet',
      up: true,
      icon: Clock,
    },
  ];

  return (
    <div className="page-enter space-y-5 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Insights</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Last 30 days · {sessionsThisMonth} session{sessionsThisMonth !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ label, value, change, up, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
                <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${up ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {change} vs last month
                </div>
              </div>
              <div className="rounded-md bg-muted p-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">

        {/* Session trend */}
        <div className="col-span-2 rounded-lg border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Sessions completed — last 4 weeks</h2>
          {sessionsThisMonth === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No sessions in the last 30 days
            </div>
          ) : (
            <div className="flex items-end gap-4 h-32">
              {sessionTrend.map(t => {
                const pct = (t.count / trendMax) * 100;
                return (
                  <div key={t.label} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{t.count}</span>
                    <div className="w-full rounded-t-sm bg-violet-100 relative" style={{ height: '80px' }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-sm bg-violet-500 transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{t.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {sessionsThisMonth} sessions this month
            {sessionDelta !== 0 ? ` · ${sessionDelta > 0 ? 'up' : 'down'} ${Math.abs(sessionDelta)} from last month` : ' · same as last month'}
          </p>
        </div>

        {/* Session modality */}
        <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Session modality</h2>
          {modalitySplit.length === 0 ? (
            <p className="text-xs text-muted-foreground">No completed appointments yet</p>
          ) : (
            modalitySplit.map(({ type, count: _c, pct }) => (
              <div key={type} className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-16 rounded-full bg-slate-100">
                    <div className="h-1 rounded-full bg-slate-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{pct}%</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top diagnoses */}
      <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4">Top diagnoses in caseload</h2>
        {topDiagnoses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No diagnosis data yet — add diagnoses to patient profiles to see this.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {topDiagnoses.map(({ name, count }) => (
              <div key={name} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">{name}</span>
                <span className="text-xs font-semibold text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
