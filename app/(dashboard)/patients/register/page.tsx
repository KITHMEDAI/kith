// This route is no longer used — patients are added via the inline panel on /patients
import { redirect } from 'next/navigation';
export default function RegisterPatientPage() {
  redirect('/patients');
}
