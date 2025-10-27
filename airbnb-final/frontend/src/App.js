import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

// pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Property from "./pages/Property";
import Bookings from "./pages/Bookings";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerProperties from "./pages/OwnerProperties";
import OwnerRequests from "./pages/OwnerRequests";

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Not Found</div>;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/property/:id" element={<Property />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/properties" element={<OwnerProperties />} />
        <Route path="/owner/requests" element={<OwnerRequests />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
