import { notFound } from 'next/navigation';
import CopilotClient from '@/components/copilot/CopilotClient';

// Local-only founder tool (see lib/copilot/guard.ts). Never served in production.
export const metadata = { title: 'Call copilot', robots: { index: false, follow: false } };

export default function CopilotPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <CopilotClient />;
}
