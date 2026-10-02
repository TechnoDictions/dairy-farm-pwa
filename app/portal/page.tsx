import { redirect } from 'next/navigation';

export default function PortalIndex() {
  // Redirect to admin dashboard as default for portal root
  redirect('/portal/admin/dashboard');
}
