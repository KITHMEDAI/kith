import { requirePageProfile } from '@/lib/workspace/server';
import ProfileForm from '@/components/workspace/ProfileForm';

export const metadata = { title: 'Profile' };

export default async function AccountPage() {
  const { profile: p } = await requirePageProfile();
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold">Profile &amp; field</h1>
      <p className="mt-1 text-sm text-slate-500">Changing your field changes how new notes are written.</p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProfileForm
          mode="account"
          initial={{
            name: p.name, email: p.email, phone: p.phone ?? '', field: p.field,
            field_custom: p.field_custom ?? '', note_preferences: p.note_preferences ?? '',
          }}
        />
      </div>
    </div>
  );
}
