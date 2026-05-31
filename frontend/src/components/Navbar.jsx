import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Menu, X, Heart, User, ChevronDown, List,
  MessageSquare, Settings, LogOut, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/Logo of Baba Homes.jpeg";

const Navbar = ({ token, user, open, setOpen, activeDropdown, setActiveDropdown }) => {
  const navRef = useRef(null);

  const closeMobile = () => setOpen(false);

  const dropdowns = [
    { title: "Buy", items: ["Residential Apartment", "Independent House", "Villa", "Plot"] },
    { title: "Rent", items: ["Apartment", "House/Villa", "PG/Hostel", "Flatmates"] },
    { title: "Commercial", items: ["Office Space", "Shop/Showroom", "Warehouse", "Industrial"] }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setActiveDropdown]);

  return (
    <nav className={`navbar ${activeDropdown ? 'nav-active' : ''}`} ref={navRef}>
      <div className="nav-glass-bg"></div>
      {/* Logo */}
      <Link to="/" className="navLogo" onClick={closeMobile}>
        <div className="logoIcon" style={{ background: '#fff', borderRadius: '50%', padding: '2px' }}>
          <img src={logo} alt="Baba Homs Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
        </div>
        <div className="logoText">
          <strong>Baba Homs</strong>
          <span>Premium Real Estate</span>
        </div>
      </Link>


      {/* Desktop Links */}
      <div className="navCenter">
        {/* Navigation links removed as per request */}
      </div>

      {/* Desktop Actions */}
      <div className="navRight">
        <Link to="/advertise" className="navAdvBtn" onClick={closeMobile}>Advertise with us</Link>
        {user?.role !== 'Property Finder' && (
          <a
            href="https://wa.me/+97332271249"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobile}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              color: '#1a1a2e',
              borderRadius: '8px',
              padding: '5px 12px',
              textDecoration: 'none',
              lineHeight: 1.2,
              border: '2px solid #fff',
              minWidth: '130px'
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: '#333', textTransform: 'uppercase' }}>WHATSAPP</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '0.5px' }}>+97332271249</span>
          </a>
        )}

        {token ? (
          <div className="navUser">
            <button
              className="navUserBtn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(activeDropdown === "user" ? null : "user");
              }}
            >
              <div className="navAvatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />
                )}
              </div>
              <span>{user?.name || "Account"}</span>
              <ChevronDown size={13} />
            </button>

            <AnimatePresence>
              {activeDropdown === "user" && (
                <motion.div
                  className="navProfileMenu"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(user?.role === 'Admin' || user?.role === 'Company') && (
                    <Link to="/admin" onClick={() => setActiveDropdown(null)} style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#92400e' }}>
                      <Shield size={15} /> Admin Panel
                    </Link>
                  )}
                  <Link to="/my-properties" onClick={() => setActiveDropdown(null)}>
                    <List size={15} /> My Properties
                  </Link>
                  <Link to="/messages" onClick={() => setActiveDropdown(null)}>
                    <MessageSquare size={15} /> Messages
                  </Link>
                  <a href="https://wa.me/919849787154" target="_blank" rel="noopener noreferrer" onClick={() => setActiveDropdown(null)}>
                    <MessageSquare size={15} /> Chat on WhatsApp
                  </a>
                  <Link to="/profile" onClick={() => setActiveDropdown(null)}>
                    <User size={15} /> Profile
                  </Link>
                  <button onClick={() => { localStorage.clear(); window.location.href = "/"; }}>
                    <LogOut size={15} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="navAuthBtns">
            <Link to="/login" className="navLoginBtn" onClick={closeMobile}>Login</Link>
            <Link to="/register" className="navRegisterBtn" onClick={closeMobile}>Register</Link>
          </div>
        )}
      </div>

      {/* Mobile Hamburger */}
      <button className="navHamburger" onClick={() => setOpen(!open)}>
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="navMobileMenu"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.25 }}
          >
            <div className="mobileMenuInner">
              <Link to="/advertise" className="navAdvBtn" onClick={closeMobile}>Advertise with us</Link>
              {/* Navigation links removed as per request */}
              <hr className="mobileDivider" />
              {user?.role !== 'Property Finder' && (
                <Link to="/post-property" className="mobileSellBtn" onClick={closeMobile}>
                  Sell or Rent Property
                </Link>
              )}
              {token ? (
                <div className="mobileUserSection">
                  {(user?.role === 'Admin' || user?.role === 'Company') && (
                    <Link to="/admin" onClick={closeMobile} style={{ color: '#ffd400' }}>Admin Panel</Link>
                  )}
                  <Link to="/profile" onClick={closeMobile}>My Profile</Link>
                  <Link to="/messages" onClick={closeMobile}>Messages</Link>
                  <Link to="/my-properties" onClick={closeMobile}>My Properties</Link>
                  <a href="https://wa.me/919849787154" target="_blank" rel="noopener noreferrer" onClick={closeMobile}>
                    Chat on WhatsApp
                  </a>
                  <button onClick={() => { localStorage.clear(); window.location.href = "/"; }}>
                    Logout
                  </button>
                </div>
              ) : (
                <div className="mobileAuthBtns">
                  <Link to="/login" onClick={closeMobile}>Login</Link>
                  <Link to="/register" onClick={closeMobile} className="mobileRegBtn">Register</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </nav >
  );
};

export default Navbar;
