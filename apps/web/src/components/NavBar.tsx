import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">
        Econnect
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/venues">Venues</Link>
        {user ? (
          <>
            <Link to="/me/tickets">My Tickets</Link>
            {user.role === 'organizer' && (
              <Link to="/organizer/events/new">Create Event</Link>
            )}
            {user.role === 'admin' && <Link to="/admin/organizers">Admin</Link>}
            <button onClick={logout} className="text-gray-500">
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </div>
    </nav>
  );
}
