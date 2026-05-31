import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Zap, Share2, Phone, Mail, Building2,
  LayoutDashboard, Video, MapPin, Globe, Rocket,
  Camera, Users, Send, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';

import logo from "../assets/Logo of Baba Homes.jpeg";

const AdvertisePage = () => {
  const platforms = [
    { name: 'TikTok', color: '#000000', icon: <Video size={20} /> },
    { name: 'Instagram', color: '#E4405F', icon: <Camera size={20} /> },
    { name: 'YouTube', color: '#FF0000', icon: <Video size={20} /> },
    { name: 'Threads', color: '#000000', icon: <Share2 size={20} /> },
    { name: 'Trends', color: '#000000', icon: <Zap size={20} /> },
    { name: 'Twitter (X)', color: '#1DA1F2', icon: <Send size={20} /> },
    { name: 'Facebook', color: '#1877F2', icon: <Users size={20} /> },
    { name: 'Snapchat', color: '#FFFC00', icon: <Zap size={20} />, textColor: '#000' },
    { name: 'LinkedIn', color: '#0077B5', icon: <Building2 size={20} /> },
    { name: 'Telegram', color: '#26A5E4', icon: <Send size={20} /> },
    { name: 'WhatsApp', color: '#25D366', icon: <MessageSquare size={20} /> }
  ];

  return (
    <div className="advertise-premium-3d">
      <div className="adv-background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>

      <div className="pd-header-nav container">
        <Link to="/" className="pd-back-glass">
          <ArrowLeft size={20} /> Back to Search
        </Link>
      </div>

      <div className="adv-hero-glass container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-3d-card"
        >
          <div className="floating-elements">
            <Rocket className="float-icon fi-1" size={40} />
            <Globe className="float-icon fi-2" size={32} />
          </div>
          <img src={logo} alt="BabaHoms" className="adv-logo-3d" style={{ borderRadius: '20px' }} />
          <h1 className="adv-title-3d">DOMINATE THE <span>DIGITAL SPACE</span></h1>
          <div className="cr-badge">GLOBAL ADVERTISING NETWORK</div>
          <p className="adv-subtitle-3d">We broadcast your properties across a massive social ecosystem. From viral TikToks to premium Instagram showcases.</p>
        </motion.div>
      </div>

      <div className="adv-content-3d container">
        <div className="platforms-3d-section">
          <h3 className="section-label">OUR ADVERTISING ECOSYSTEM</h3>
          <div className="platforms-grid-new">
            {platforms.map((p) => (
              <motion.div
                key={p.name}
                whileHover={{ scale: 1.05, y: -5 }}
                className="platform-card-new"
                style={{ '--platform-color': p.color }}
              >
                <div className="platform-icon-wrap" style={{ background: p.color, color: p.textColor || '#fff' }}>
                  {p.icon}
                </div>
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{p.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="adv-grid-3d">
          <motion.div whileHover={{ y: -10 }} className="glass-card-3d gold">
            <div className="card-top">
              <Zap size={32} />
              <div className="price-bubble">PREMIUM</div>
            </div>
            <h3>Viral Marketing</h3>
            <p>High-impact video production and targeted placement on TikTok, Trends, and Instagram Reels. We make your property go viral.</p>
          </motion.div>

          <motion.div whileHover={{ y: -10 }} className="glass-card-3d blue">
            <div className="card-top">
              <Share2 size={32} />
              <div className="price-bubble free">FREE</div>
            </div>
            <h3>Omnichannel Synergy</h3>
            <p>Every property listed on Baba Homs is automatically distributed across our massive organic network at zero cost to you.</p>
          </motion.div>
        </div>

        <div className="services-3d-grid">
          {[
            { t: 'High-Impact Video', d: 'Professional drone and 4K property walkthroughs.', i: <Video /> },
            { t: 'AI Targeting', d: 'We use AI to find buyers interested in your specific area.', i: <Rocket /> },
            { t: 'Web Presence', d: 'Dedicated landing pages for premium developments.', i: <LayoutDashboard /> },
            { t: 'Social Dominance', d: 'Active management across all 10+ social platforms.', i: <Share2 /> }
          ].map((s, idx) => (
            <motion.div key={idx} whileHover={{ scale: 1.02 }} className="service-card-3d">
              <div className="s-icon-3d">{s.i}</div>
              <div className="s-text-3d">
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="contact-3d-footer">
          <div className="c-box-3d" onClick={() => window.open('https://wa.me/97332261349', '_blank')}>
            <Phone size={24} />
            <div className="c-info-3d">
              <span>WhatsApp for Business</span>
              <strong>  +973 3226 1349</strong>
            </div>
          </div>
          <div className="c-box-3d" onClick={() => window.location.href = 'mailto:marketing@babahoms.com'}>
            <Mail size={24} />
            <div className="c-info-3d">
              <span>Email Inquiries</span>
              <strong>   marketing@babahoms.com</strong>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdvertisePage;

