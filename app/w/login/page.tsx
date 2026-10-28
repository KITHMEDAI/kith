import LoginForm from '@/components/workspace/LoginForm';
import { FIELD_MAP, type FieldKey } from '@/lib/workspace/fields';

export const metadata = { title: 'Sign in' };

export default function LoginPage({ searchParams }: { searchParams: { error?: string; deleted?: string; signedout?: string; mode?: string; field?: string } }) {
  const notice = searchParams.deleted ? 'Your account and everything in it has been deleted.'
    : searchParams.signedout === 'all' ? 'You are signed out on every device.'
    : undefined;
  // From a landing page's "Start free": open on sign-up and remember the field for onboarding.
  const field = searchParams.field && FIELD_MAP[searchParams.field as FieldKey] ? searchParams.field : undefined;
  return <LoginForm linkError={searchParams.error === 'link'} notice={notice} initialMode={searchParams.mode === 'signup' ? 'signup' : 'signin'} field={field} />;
}
