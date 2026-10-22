/**
 * lib/workspace/mail.ts
 *
 * Account emails for Kith Workspace (sign-up and password-reset codes), sent
 * with Resend. Only the recipient's email address leaves our systems.
 */
import { Resend } from 'resend';

export const wrapEmail = (inner: string) => `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="font-size:20px;font-weight:700;margin:0 0 24px">Kith</p>${inner}</div>`;

/** Sends one email. Returns false if Resend reported an error. */
export async function sendMail(to: string, mail: { subject: string; text: string; html: string }): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `Kith <${process.env.RESEND_FROM_EMAIL || 'noreply@kith.space'}>`,
    to,
    ...mail,
  });
  return !error;
}

/** A one-time code email ("Enter this code to …"). */
export function codeEmail(code: string, purpose: string) {
  return {
    subject: `${code} is your Kith code`,
    text: `Your Kith Workspace code is ${code}\n\nEnter it to ${purpose}. It expires in 1 hour. If you didn't ask for it, ignore this email.`,
    html: wrapEmail(`<p style="font-size:15px;line-height:1.5;margin:0 0 16px">Enter this code to ${purpose}:</p>
      <p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:0 0 24px">${code}</p>
      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0">It expires in 1 hour. If you didn't ask for it, you can ignore this email.</p>`),
  };
}
