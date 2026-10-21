import AskPanel from '@/components/workspace/AskPanel';

export const metadata = { title: 'Ask your notes' };

export default function AskPage({ searchParams }: { searchParams: { q?: string } }) {
  return <AskPanel initialQuestion={searchParams.q ?? ''} />;
}
