import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import SocialIcons from "./components/SocialIcons";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import HomePage from "./pages/HomePage";
import PropertyDetails from "./pages/PropertyDetails";
import AuthPage from "./pages/AuthPage";
import RegisterPage from "./pages/RegisterPage";
import PostProperty from "./pages/PostProperty";
import MessagesPage from "./pages/MessagesPage";

import ProfilePage from "./pages/ProfilePage";
import AdvertisePage from "./pages/AdvertisePage";
import MyProperties from "./pages/MyProperties";
import EditProperty from "./pages/EditProperty";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Styles
import "./App.css";

function App() {
  const [open, setOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("babaToken"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("babaUser") || "{}"));
  const location = useLocation();

  // Update token/user state when storage changes (e.g. after login)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("babaToken"));
      setUser(JSON.parse(localStorage.getItem("babaUser") || "{}"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Sync state manually after navigation if needed
  useEffect(() => {
    setToken(localStorage.getItem("babaToken"));
    setUser(JSON.parse(localStorage.getItem("babaUser") || "{}"));
    setOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Hide Navbar on PostProperty page to match design
  const showNavbar = location.pathname !== "/post-property" && !location.pathname.startsWith("/edit-property");

  return (
    <>
      <Toaster position="top-right" />
      {showNavbar && (
        <Navbar
          token={token}
          user={user}
          open={open}
          setOpen={setOpen}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
        />
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/advertise" element={<AdvertisePage />} />
        <Route path="/my-properties" element={
          <ProtectedRoute>
            <MyProperties />
          </ProtectedRoute>
        } />
        <Route path="/post-property" element={
          <ProtectedRoute>
            <PostProperty />
          </ProtectedRoute>
        } />
        <Route path="/edit-property/:id" element={
          <ProtectedRoute>
            <EditProperty />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
        <SocialIcons />
    </>
  );
}

export default App;