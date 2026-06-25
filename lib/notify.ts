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

export interface NotifyParams {
  to: { email?: string; phone?: string; whatsapp?: string };
  subject: string;
  message: string;
  channels: ('email' | 'sms' | 'whatsapp')[];
}

export async function sendNotification({ to, subject, message, channels }: NotifyParams) {
  const results: { email?: boolean; sms?: boolean; whatsapp?: boolean } = {};

  if (channels.includes('email') && to.email) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@kith.in',
        to: to.email,
        subject,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${message.replace(/\n/g, '<br/>')}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <p style="font-size:11px;color:#9ca3af;margin:0">Sent by Kith · Your clinical workspace · All data encrypted</p>
          </div>
        `,
        text: message,
      });
      results.email = true;
    } catch (err) {
      console.error('[Kith] Email send failed:', err);
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
