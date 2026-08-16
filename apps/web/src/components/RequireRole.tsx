import { Navigate } from 'react-router-dom';
import type { UserRole } from '@econnect/shared-types';
import { useAuth } from '../lib/auth-context';

interface Props {
  role: UserRole;
  children: React.ReactNode;
}

// A convenience for the UI only — the actual security boundary is the
// backend's requireRole middleware. This just avoids showing a logged-out
// or wrong-role user a page that would immediately 401/403 anyway.
export default function RequireRole({ role, children }: Props) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        You don't have access to this page.
      </div>
    );
  }
  return <>{children}</>;
}
