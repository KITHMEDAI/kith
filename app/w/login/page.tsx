import LoginForm from '@/components/workspace/LoginForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage({ searchParams }: { searchParams: { error?: string; deleted?: string; signedout?: string } }) {
  const notice = searchParams.deleted ? 'Your account and everything in it has been deleted.'
    : searchParams.signedout === 'all' ? 'You are signed out on every device.'
    : undefined;
  return <LoginForm linkError={searchParams.error === 'link'} notice={notice} />;
}
