import LoginForm from '@/components/workspace/LoginForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return <LoginForm linkError={searchParams.error === 'link'} />;
}
