import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import RequireRole from './components/RequireRole';
import CreateEventPage from './features/organizer-dashboard/CreateEventPage';
import ScanPage from './features/organizer-dashboard/ScanPage';
import DiscoverPage from './features/events/DiscoverPage';
import EventDetailPage from './features/events/EventDetailPage';
import MyTicketsPage from './features/tickets/MyTicketsPage';
import VenuesBrowsePage from './features/venues/VenuesBrowsePage';
import VenueDetailPage from './features/venues/VenueDetailPage';
import LoginPage from './features/auth/LoginPage';
import AdminOrganizersPage from './features/admin/AdminOrganizersPage';

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/organizer/events/new" element={<CreateEventPage />} />
        <Route path="/organizer/events/:id/scan" element={<ScanPage />} />
        <Route path="/me/tickets" element={<MyTicketsPage />} />
        <Route path="/venues" element={<VenuesBrowsePage />} />
        <Route path="/venues/:id" element={<VenueDetailPage />} />
        <Route
          path="/admin/organizers"
          element={
            <RequireRole role="admin">
              <AdminOrganizersPage />
            </RequireRole>
          }
        />
      </Routes>
    </>
  );
}
