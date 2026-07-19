'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Save, Loader2, Upload, Mail, Phone,
  Calendar, Clock, Users, Shield,
  CheckCircle, TrendingUp, Edit3, ExternalLink, BadgeCheck, X as XIcon, MapPin,
  Sparkles, ArrowUpRight, AlertTriangle,
} from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import DeleteAccountModal from '@/components/settings/DeleteAccountModal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  display_name: string;
  designation: string;
  license_number: string;
  license_council: string;
  clinic_name: string;
  clinic_address: string;
  phone: string;
  email: string;
  specializations: string[];
  bio: string;
  timezone: string;
  avatar_url: string | null;
  subscription_plan?: 'free' | 'pro' | 'ultra' | 'clinic';
  subscription_status?: string;
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', ultra: 'Ultra', clinic: 'Clinic' };

// Compact plan card — the only always-visible upgrade path outside the
// dedicated billing page; feature-gated screens (booking, integrations,
// session cap) each also link to /settings/billing at the point of friction.
function PlanCard({ plan, status }: { plan?: string; status?: string }) {
  const effective = status === 'active' ? (plan || 'free') : 'free';
  const isFree = effective === 'free';
  return (
    <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
      style={{
        background: isFree ? '#0f172a' : 'linear-gradient(135deg,#2a1454,#0f172a)',
        border: isFree ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(139,92,246,0.35)',
      }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
          <Sparkles className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white">
            {PLAN_LABEL[effective] || 'Free'} plan
          </p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {isFree ? 'Upgrade for online sessions, more capacity, and patient messaging' : 'Manage billing, usage, and plan changes'}
          </p>
        </div>
      </div>
      <a href="/settings/billing"
        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-all hover:scale-[1.02] shrink-0"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
        {isFree ? 'Upgrade plan' : 'Manage plan'} <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

interface Stats {
  total_sessions: number;
  total_hours: number;
  total_patients: number;
  upcoming_this_month: number;
  member_since: string;
}

const SPECIALIZATIONS = [
  'CBT', 'DBT', 'EMDR', 'ACT', 'Psychodynamic', 'Trauma-focused',
  'Couples Therapy', 'Child & Adolescent', 'Geriatric', 'Addiction',
  'Grief & Loss', 'OCD', 'Eating Disorders', 'Anxiety', 'Depression',
];

// ── Clinic address autocomplete ───────────────────────────────────────────────
interface NominatimResult { address: { city?: string; town?: string; state?: string } }

function ClinicAddressField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = (q: string) => {
    if (q.length < 3) { setSuggestions([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&limit=6&format=json&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await r.json();
        const labels = data
          .map(d => [d.address.city || d.address.town, d.address.state].filter(Boolean).join(', '))
          .filter((v, i, a) => v && a.indexOf(v) === i) as string[];
        setSuggestions(labels);
        setOpen(true);
      } catch { /* ignore */ }
    }, 350);
  };

  return (
    <div className="relative">
      <label className="block text-xs text-slate-400 mb-1.5">Location</label>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); lookup(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Koramangala, Bengaluru"
        autoComplete="off"
        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none transition-all disabled:opacity-60"
        style={{
          background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
          border: disabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.15)',
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
          {suggestions.map(s => (
            <button key={s} type="button" onMouseDown={() => { onChange(s); setOpen(false); setSuggestions([]); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10 transition-colors text-left">
              <MapPin className="h-3.5 w-3.5 text-slate-500 flex-none" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Google Calendar card ──────────────────────────────────────────────────────
function GoogleCalendarCard() {
  const supabase = createClientSupabaseClient();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    // Check from URL param first (returned from OAuth)
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google_calendar') {
      setConnected(true);
      window.history.replaceState({}, '', '/settings');
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.from('therapists').select('google_calendar_vault_secret_id').eq('user_id', user.id).single()
        .then(({ data }) => { setConnected(!!data?.google_calendar_vault_secret_id); setLoading(false); });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    setActionLoading(true); setConnectError('');
    try {
      const res = await fetch('/api/google-calendar/auth-url');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      // Previously failed silently here — button looked "dummy" if Google
      // wasn't configured or the plan didn't unlock it, with zero feedback.
      setConnectError(typeof data.error === 'string' ? data.error : 'Could not start Google Calendar connection. Try again.');
    } catch {
      setConnectError('Could not reach Kith — check your connection and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const disconnect = async () => {
    setActionLoading(true);
    await fetch('/api/google-calendar/disconnect', { method: 'POST' });
    setConnected(false);
    setActionLoading(false);
  };

  return (
    <div className="rounded-2xl p-5"
      style={{ background: connected ? 'linear-gradient(135deg,#0a2010 0%,#0f172a 100%)' : '#0f172a', border: connected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Google Calendar colour icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#4285F420' }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4" opacity="0.15"/>
              <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5"/>
              <rect x="8" y="2" width="2" height="4" rx="1" fill="#4285F4"/>
              <rect x="14" y="2" width="2" height="4" rx="1" fill="#4285F4"/>
              <text x="8" y="18" fontSize="7" fill="#EA4335" fontWeight="bold">31</text>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white">Google Calendar</p>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {loading ? 'Checking…' : connected ? 'Connected — your calendar events appear as appointments automatically' : 'Import appointments from your Google Calendar'}
            </p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500"/>
        ) : connected ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
              <BadgeCheck className="h-3.5 w-3.5"/> Connected
            </div>
            <button onClick={disconnect} disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <XIcon className="h-3.5 w-3.5"/>} Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connect} disabled={actionLoading}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#4285F4' }}>
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ExternalLink className="h-4 w-4"/>}
            Connect
          </button>
        )}
      </div>

      {connectError && (
        <p className="mt-3 text-[12px] text-red-400">{connectError}</p>
      )}

      {connected && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {['Appointments auto-synced', 'Video meeting links detected', 'Creates a Meet link only for sessions you book online'].map(f => (
            <div key={f} className="flex items-center gap-2 text-[12px] text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5 flex-none"/>{f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const fileRef   = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({
    display_name: '', designation: '', license_number: '', license_council: '',
    clinic_name: '', clinic_address: '', phone: '', email: '', specializations: [], bio: '',
    timezone: 'Asia/Kolkata', avatar_url: null,
  });
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editMode, setEditMode]     = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(({ profile: p, stats: s }) => {
        if (p) {
          setProfile(p);
          if (p.avatar_url) setAvatarPreview(p.avatar_url);
        }
        if (s) setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true); setEditMode(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file (JPG, PNG, or WebP).'); return; }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB — please use a photo under 10 MB.`);
      return;
    }
    setUploadError(null);

    // Show local preview immediately for snappy UX
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Use the server-returned URL (has cache-bust timestamp)
      setProfile(p => ({ ...p, avatar_url: data.avatar_url }));
      setAvatarPreview(data.avatar_url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  function toggleSpec(s: string) {
    setProfile(p => ({
      ...p,
      specializations: p.specializations.includes(s)
        ? p.specializations.filter(x => x !== s)
        : [...p.specializations, s],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0f1a27' }}>
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  const initials     = profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';

  const field = (key: keyof Profile, label: string, placeholder: string, colSpan = 1) => (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input
        value={(profile[key] as string) || ''}
        onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
        disabled={!editMode}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none transition-all disabled:opacity-60"
        style={{
          background: editMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          border: editMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', background: '#0b0f1a' }}>

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,#160b38 0%,#0d1f3a 100%)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-start gap-6">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-2xl overflow-hidden flex items-center justify-center text-3xl font-bold"
              style={{
                background: avatarPreview ? 'transparent' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                boxShadow: '0 0 0 3px rgba(139,92,246,0.3)',
              }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                : initials}
            </div>

            {/* Upload overlay */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110"
              style={{ background: '#7c3aed', border: '2px solid #0b0f1a', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
              title="Upload photo">
              {uploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                : <Upload className="h-3.5 w-3.5 text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Upload error */}
          {uploadError && (
            <div className="mt-2 text-xs text-red-400 bg-red-900/30 border border-red-800/40 rounded-lg px-3 py-2 max-w-xs">
              {uploadError}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">{profile.display_name || 'Your Name'}</h1>
                <p className="text-[15px] text-purple-300 mt-0.5">{profile.designation || 'Designation'}</p>
                {profile.license_number && (
                  <p className="text-[12px] text-slate-400 mt-1">{profile.license_council} · {profile.license_number}</p>
                )}
              </div>
              <button
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-all hover:scale-[1.02] shrink-0"
                style={{
                  background: editMode ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  boxShadow: editMode ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                }}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : saved ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Saved</>
                  : editMode ? <><Save className="h-3.5 w-3.5" /> Save</>
                  : <><Edit3 className="h-3.5 w-3.5" /> Edit profile</>}
              </button>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {profile.email && (
                <span className="flex items-center gap-1.5 text-[13px] text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1.5 text-[13px] text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {profile.phone}
                </span>
              )}
              {profile.clinic_name && (
                <span className="flex items-center gap-1.5 text-[13px] text-slate-400">
                  <Shield className="h-3.5 w-3.5 text-slate-400" /> {profile.clinic_name}
                </span>
              )}
            </div>

            {/* Specializations */}
            {profile.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.specializations.map(s => (
                  <span key={s} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd' }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Plan & billing ─────────────────────────────────────────────────── */}
      <PlanCard plan={profile.subscription_plan} status={profile.subscription_status} />

      {/* ── Google Calendar ────────────────────────────────────────────────── */}
      <GoogleCalendarCard />

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Calendar className="h-5 w-5" />, label: 'Sessions completed', value: stats?.total_sessions ?? 0, color: '#3b82f6' },
          { icon: <Clock className="h-5 w-5" />, label: 'Hours of therapy', value: stats?.total_hours ?? 0, color: '#8b5cf6' },
          { icon: <Users className="h-5 w-5" />, label: 'Total patients', value: stats?.total_patients ?? 0, color: '#10b981' },
          { icon: <TrendingUp className="h-5 w-5" />, label: 'Sessions this month', value: stats?.upcoming_this_month ?? 0, color: '#f59e0b' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${color}20`, color }}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
              <p className="text-[12px] text-slate-400 mt-0.5 leading-snug">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit form ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 space-y-5"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Practice details</h2>
          {!editMode && (
            <button onClick={() => setEditMode(true)}
              className="text-[12px] text-purple-400 hover:text-purple-300 transition-colors">
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('display_name',    'Full name',          'Dr. Priya Sharma')}
          {field('designation',     'Designation',        'Clinical Psychologist')}
          {field('license_number',  'License number',     'RCI/MH/12345')}
          {field('license_council', 'Licensing council',  'Rehabilitation Council of India')}
          {field('clinic_name',     'Clinic / Practice',  'MindBridge Wellness')}
          {field('phone',           'Phone',              '+91 98765 43210')}
          {field('email',           'Email',              'you@clinic.in')}
          {field('timezone',        'Timezone',           'Asia/Kolkata')}
          <ClinicAddressField
            value={(profile as unknown as Record<string,string>).clinic_address || ''}
            onChange={v => setProfile(p => ({ ...p, clinic_address: v }))}
            disabled={!editMode}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Professional bio</label>
          <textarea
            value={profile.bio || ''}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            disabled={!editMode}
            rows={3}
            placeholder="Brief professional biography…"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-700 resize-none focus:outline-none transition-all disabled:opacity-60"
            style={{
              background: editMode ? '#1e293b' : '#141c2b',
              border: editMode ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </div>

        {/* Specializations */}
        {editMode && (
          <div>
            <label className="block text-xs text-slate-400 mb-2">Specializations</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map(s => (
                <button key={s} type="button" onClick={() => toggleSpec(s)}
                  className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors"
                  style={{
                    background: profile.specializations.includes(s) ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                    border: profile.specializations.includes(s) ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: profile.specializations.includes(s) ? '#c4b5fd' : '#64748b',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {editMode && (
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={() => setEditMode(false)}
              className="rounded-xl px-5 py-2.5 text-[14px] text-slate-400 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Compliance note */}
      <div className="rounded-xl px-5 py-3.5 text-[12px] text-teal-400 flex items-center gap-2"
        style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
        <Shield className="h-4 w-4 shrink-0" />
        Profile data is encrypted in transit and at rest, aligned with the DPDP Act 2023. License information is never shared with third parties.
      </div>

      {/* Danger zone */}
      <div className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-red-300">Delete account</p>
            <p className="text-[12px] text-red-400/70">Permanently deletes your account and all patient data. Cannot be undone.</p>
          </div>
        </div>
        <button onClick={() => setShowDeleteModal(true)}
          className="flex-none rounded-lg px-3.5 py-2 text-[13px] font-semibold text-red-300 hover:text-white hover:bg-red-500/80 transition-colors"
          style={{ border: '1px solid rgba(239,68,68,0.4)' }}>
          Delete my account
        </button>
      </div>

      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
    </div>
  );
}
