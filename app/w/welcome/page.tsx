import type { Metadata } from 'next';
import { HomeLanding } from '@/components/workspace/Landing';

// Shown at "/" to logged-out visitors (middleware rewrites / → /w/welcome).
export const metadata: Metadata = {
  title: { absolute: 'Kith Workspace: talk for two minutes, get the note' },
  description: 'AI notes for shift work, care, construction, hospitality and meetings. Speak or type; Kith writes a structured note in your format.',
  robots: { index: true, follow: true },
};

export default function WelcomePage() {
  return <HomeLanding />;
}
