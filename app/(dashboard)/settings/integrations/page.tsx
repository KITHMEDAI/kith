'use client';

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Calendar, MessageSquare, Mail, CheckCircle2, XCircle, ExternalLink, Loader2, Link2, Globe, Phone, Lock } from 'lucide-react';

const BOOKING_LABELS: Record<string, { name: string; color: string; needsUrl: boolean }> = {
  calendly:        { name: 'Calendly',           color: '#006BFF', needsUrl: true },
  practo:          { name: 'Practo',             color: '#5DB85D', needsUrl: true },
  acuity:          { name: 'Acuity Scheduling',  color: '#7B61FF', needsUrl: true },
  google_calendar: { name: 'Google Calendar',    color: '#4285F4', needsUrl: false },
  whatsapp:        { name: 'WhatsApp',           color: '#25D366', needsUrl: false },
  phone:           { name: 'Phone / Manual',     color: '#6B7280', needsUrl: false },
  website:         { name: 'My Website',         color: '#F97316', needsUrl: true },
  other:           { name: 'Other',              color: '#94A3B8', needsUrl: false },
};

export default function IntegrationsPage() {
  const supabase = createClientSupabaseClient();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calLoading, setCalLoading]               = useState(false);
  const [bookingSource, setBookingSource]         = useState('');
  const [bookingUrl, setBookingUrl]               = useState('');
  const [editingUrl, setEditingUrl]               = useState(false);
  const [newUrl, setNewUrl]                       = useState('');
  const [savingUrl, setSavingUrl]                 = useState(false);
  const [pageLoading, setPageLoading]             = useState(true);
  const [calendarSyncUnlocked, setCalendarSyncUnlocked] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('therapists')
        .select('google_calendar_vault_secret_id, booking_source, booking_url')
        .eq('user_id', user!.id)
        .single();
      setCalendarConnected(!!data?.google_calendar_vault_secret_id);
      const d = data as Record<string,unknown> | null;
      setBookingSource(d?.booking_source as string || 'phone');
      setBookingUrl(d?.booking_url as string || '');
      setPageLoading(false);
    }
    check();
    fetch('/api/me/entitlements')
      .then(r => r.ok ? r.json() : null)
      .then(e => { if (e) setCalendarSyncUnlocked(e.calendarSync); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function connectGoogleCalendar() {
    setCalLoading(true);
    const res = await fetch('/api/google-calendar/auth-url');
    if (res.ok) { const { url } = await res.json(); window.location.href = url; }
    else setCalLoading(false);
  }

  async function disconnectGoogleCalendar() {
    setCalLoading(true);
    await fetch('/api/google-calendar/disconnect', { method: 'POST' });
    setCalendarConnected(false);
    setCalLoading(false);
  }

  async function saveBookingUrl() {
    setSavingUrl(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_url: newUrl }),
    });
    setBookingUrl(newUrl);
    setEditingUrl(false);
    setSavingUrl(false);
  }

  const bookingMeta = BOOKING_LABELS[bookingSource] || BOOKING_LABELS.other;

  if (pageLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-violet-500"/></div>;
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect external services to extend Kith</p>
      </div>

      {/* Booking source */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${bookingMeta.color}18` }}>
            {bookingSource === 'google_calendar' ? <Calendar className="h-5 w-5" style={{ color: bookingMeta.color }}/>
              : bookingSource === 'whatsapp' ? <MessageSquare className="h-5 w-5" style={{ color: bookingMeta.color }}/>
              : bookingSource === 'phone' ? <Phone className="h-5 w-5" style={{ color: bookingMeta.color }}/>
              : bookingSource === 'website' ? <Globe className="h-5 w-5" style={{ color: bookingMeta.color }}/>
              : <Link2 className="h-5 w-5" style={{ color: bookingMeta.color }}/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">Booking source</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${bookingMeta.color}18`, color: bookingMeta.color }}>{bookingMeta.name}</span>
            </div>
            {bookingMeta.needsUrl ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your booking URL — patients use this to schedule sessions</p>
                {editingUrl ? (
                  <div className="flex gap-2">
                    <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." className="flex-1 rounded-lg border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"/>
                    <button onClick={saveBookingUrl} disabled={savingUrl} className="px-3 py-1.5 rounded-lg bg-violet-600 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                      {savingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : 'Save'}
                    </button>
                    <button onClick={() => setEditingUrl(false)} className="px-3 py-1.5 rounded-lg border border-input text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <code className="text-xs bg-muted px-2.5 py-1 rounded text-foreground truncate max-w-xs">{bookingUrl || 'Not set'}</code>
                    <button onClick={() => { setNewUrl(bookingUrl); setEditingUrl(true); }} className="text-xs text-violet-600 hover:text-violet-700">Edit</button>
                    {bookingUrl && <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ExternalLink className="h-3 w-3"/> Open</a>}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {bookingSource === 'phone' && 'Patients call or walk in to book — no URL needed.'}
                {bookingSource === 'whatsapp' && 'Patients message you on WhatsApp to book sessions.'}
                {bookingSource === 'google_calendar' && 'Booking managed via Google Calendar sharing.'}
                {bookingSource === 'other' && 'Custom booking process.'}
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-2">Change your booking source in Settings → Profile</p>
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#4285F4]/10">
            <Calendar className="h-5 w-5 text-[#4285F4]"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">Google Calendar</h3>
              {calendarConnected
                ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5"/> Connected</span>
                : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5"/> Not connected</span>}
            </div>
            <p className="text-sm text-muted-foreground">Import appointments from your Google Calendar into Kith. Read-only — Kith never writes to or edits your calendar.</p>
            {!calendarConnected && !calendarSyncUnlocked && (
              <a href="/settings/billing" className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700">
                <Lock className="h-3 w-3" /> Requires Pro or higher — view plans
              </a>
            )}
          </div>
          {!calendarConnected && !calendarSyncUnlocked ? (
            <a href="/settings/billing"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 bg-muted text-muted-foreground hover:bg-violet-50 hover:text-violet-700 transition-colors">
              <Lock className="h-3.5 w-3.5"/> Upgrade
            </a>
          ) : (
            <button onClick={calendarConnected ? disconnectGoogleCalendar : connectGoogleCalendar} disabled={calLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors disabled:opacity-50 ${calendarConnected ? 'bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-50' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
              {calLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <ExternalLink className="h-3.5 w-3.5"/>}
              {calendarConnected ? 'Disconnect' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#25D366]/10">
            <MessageSquare className="h-5 w-5 text-[#25D366]"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">WhatsApp Business (Twilio)</h3>
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Pro plan</span>
            </div>
            <p className="text-sm text-muted-foreground">Send appointment reminders and rescheduling messages via WhatsApp.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env.local file</p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">Via .env config</span>
        </div>
      </div>

      {/* Email */}
      <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-50">
            <Mail className="h-5 w-5 text-violet-500"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">Transactional Email (Resend)</h3>
            <p className="text-sm text-muted-foreground">Session confirmations, reschedule notifications, and homework reminders.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Configure RESEND_API_KEY in your .env.local file</p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">Via .env config</span>
        </div>
      </div>

      <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-xs text-violet-700">
        🔒 All OAuth tokens are encrypted in Supabase Vault — never stored in plain text. Third-party integrations only receive minimum required data.
      </div>
    </div>
  );
}
