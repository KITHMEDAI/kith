import { Resend } from 'resend';
import twilio from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build');
const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// WhatsApp numbers must be in E.164 format: +919876543210
// Twilio WhatsApp sender: set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886 (Sandbox)
// or your approved WhatsApp Business number in production.
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// `message` is therapist-authored (or the caller's default text) and gets
// interpolated straight into the email HTML — escape it first so a message
// containing "<script>" or a stray tag can't inject markup into what the
// patient's mail client renders.
function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface NotifyParams {
  to: { email?: string; phone?: string; whatsapp?: string };
  subject: string;
  message: string;
  channels: ('email' | 'sms' | 'whatsapp')[];
  /** Attaches a calendar invite (.ics) to the email — patients get a native
   *  "Add to Calendar" / RSVP prompt in Gmail/Outlook instead of just reading
   *  a sentence with the time in it. */
  icsAttachment?: { filename: string; content: string; contentType: string };
}

export async function sendNotification({ to, subject, message, channels, icsAttachment }: NotifyParams) {
  const results: { email?: boolean; sms?: boolean; whatsapp?: boolean } = {};

  if (channels.includes('email') && to.email) {
    try {
      // resend.emails.send() does NOT throw on API-level failures (bad
      // domain, invalid recipient, rate limit, etc.) — it resolves with
      // { data: null, error: {...} }. Only network-level failures throw.
      // Previously this was never checked, so every Resend-side rejection
      // was silently reported as a successful send.
      const { data, error } = await resend.emails.send({
        from: `Kith <${process.env.RESEND_FROM_EMAIL || 'noreply@kith.in'}>`,
        to: to.email,
        subject,
        html: `
          <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:32px 28px">
            <div style="display:flex;align-items:center;gap:8px;margin:0 0 24px">
              <img src="https://kith.space/kith-logo-email.png" width="22" height="22" alt="Kith" style="display:block" />
              <span style="font-size:14px;font-weight:700;letter-spacing:0.02em;color:#7c3aed">KITH</span>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.65;color:#1e1b3a">${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
            <p style="margin:24px 0 0;padding-top:14px;border-top:1px solid #ece6ff;font-size:11px;color:#9992ad">Sent via Kith on behalf of your therapist.</p>
          </div>
        `,
        text: message,
        ...(icsAttachment ? { attachments: [icsAttachment] } : {}),
      });
      if (error) {
        console.error('[Kith] Email send rejected by Resend:', JSON.stringify(error));
        results.email = false;
      } else {
        console.log(`[Kith] Email sent via Resend, id=${data?.id}`);
        results.email = true;
      }
    } catch (err) {
      console.error('[Kith] Email send threw:', err);
      results.email = false;
    }
  }

  if (channels.includes('sms') && to.phone && twilioClient) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to.phone,
      });
      results.sms = true;
    } catch (err) {
      console.error('[Kith] SMS send failed:', err);
      results.sms = false;
    }
  }

  // WhatsApp via Twilio WhatsApp Business API
  if (channels.includes('whatsapp') && to.whatsapp && twilioClient) {
    try {
      const whatsappTo = to.whatsapp.startsWith('whatsapp:')
        ? to.whatsapp
        : `whatsapp:${to.whatsapp}`;
      await twilioClient.messages.create({
        body: message,
        from: WHATSAPP_FROM,
        to: whatsappTo,
      });
      results.whatsapp = true;
    } catch (err) {
      console.error('[Kith] WhatsApp send failed:', err);
      results.whatsapp = false;
    }
  }

  return results;
}

export async function sendRescheduleNotification(params: {
  patient: {
    email?: string | null;
    phone?: string | null;
    whatsapp_number?: string | null;
    display_name: string;
  };
  oldTime: string;
  newTime: string;
  message?: string;
  channels: ('email' | 'sms' | 'whatsapp')[];
  icsAttachment?: { filename: string; content: string; contentType: string };
}) {
  const defaultMessage = `Hi ${params.patient.display_name}, your appointment has been rescheduled from ${new Date(params.oldTime).toLocaleString('en-IN')} to ${new Date(params.newTime).toLocaleString('en-IN')}. Please reply to confirm.`;

  return sendNotification({
    to: {
      email: params.patient.email || undefined,
      phone: params.patient.phone || undefined,
      whatsapp: params.patient.whatsapp_number || params.patient.phone || undefined,
    },
    subject: 'Appointment Rescheduled — Kith',
    message: params.message || defaultMessage,
    channels: params.channels,
    icsAttachment: params.icsAttachment,
  });
}

export async function sendReminder(params: {
  patient: { email?: string | null; phone?: string | null; display_name: string };
  appointmentTime: string;
  therapistName: string;
  type: '24h' | '1h';
}) {
  const timeStr = new Date(params.appointmentTime).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const message =
    params.type === '24h'
      ? `Reminder: You have an appointment with ${params.therapistName} tomorrow at ${timeStr}.`
      : `Reminder: Your appointment with ${params.therapistName} starts in 1 hour (${timeStr}).`;

  return sendNotification({
    to: {
      email: params.patient.email || undefined,
      phone: params.patient.phone || undefined,
    },
    subject: `Appointment Reminder — ${params.therapistName}`,
    message,
    channels: params.type === '24h' ? ['email', 'sms'] : ['sms'],
  });
}
