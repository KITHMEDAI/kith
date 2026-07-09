'use client';

import { useState, useRef } from 'react';
import { X, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import type { Appointment } from '@/types';

interface Props { appointment: Appointment; onClose: () => void; onRescheduled: (a: Appointment) => void; }

export default function RescheduleModal({ appointment, onClose, onRescheduled }: Props) {
  const patient = appointment.patient as { display_name: string; email?: string; phone?: string; whatsapp_number?: string } | undefined;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  // WhatsApp deprioritized for now — sandbox-only until Twilio's business
  // verification is approved. Email is the only notification channel.
  const channels = ['email'];
  const [isVoice, setIsVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported. Use Chrome.'); return; }
    const r = new SR();
    r.lang = 'en-IN';
    r.continuous = false;
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setMessage(text);
      setListening(false);
    };
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  const handleSubmit = async () => {
    if (!date || !time) { setError('Please select a new date and time'); return; }
    setLoading(true); setError('');
    try {
      const newDateTime = new Date(`${date}T${time}`).toISOString();
      const res = await fetch('/api/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointment.id, new_datetime: newDateTime, reason, message, channels }),
      });
      const data = await res.json();
      if (res.status === 409) {
        const c = data.conflict;
        throw new Error(c ? `That time overlaps ${c.conflictsWith}. Pick another slot.` : 'That time is already booked.');
      }
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Reschedule failed');
      onRescheduled(data.appointment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setLoading(false);
    }
  };

  const defaultMsg = patient ? `Hi ${patient.display_name}, your appointment on ${format(new Date(appointment.scheduled_at), 'dd MMM')} has been rescheduled${date && time ? ` to ${format(new Date(`${date}T${time}`), 'dd MMM, h:mm a')}` : ''}. Please confirm.` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Reschedule Appointment</h2>
            <p className="text-xs text-muted-foreground">{patient?.display_name} · Currently {format(new Date(appointment.scheduled_at), 'dd MMM, h:mm a')}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <CardContent className="p-6 space-y-5">
          {/* New date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>New date <span className="text-red-500">*</span></Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-1.5">
              <Label>New time <span className="text-red-500">*</span></Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input placeholder="e.g. Doctor unavailable" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Message to patient</Label>
              <button type="button" onClick={toggleVoice}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${listening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {listening ? <><MicOff className="h-3 w-3" /> Stop</> : <><Mic className="h-3 w-3" /> Speak</>}
              </button>
            </div>
            <Textarea
              placeholder={defaultMsg || 'Type or speak your message…'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending…' : `Reschedule & Notify`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
