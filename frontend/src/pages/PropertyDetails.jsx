import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Bed, Bath, Maximize, CalendarDays, Key, Building2, User,
  CheckCircle, Info, ArrowLeft, Phone, Mail, Share2, Heart,
  ShieldCheck, Droplets, Zap, Users, Car, Home, CloudRain, Wifi,
  MessageSquare, Send, Video, Loader2
} from "lucide-react";
import API from "../api";
import toast from "react-hot-toast";
import { fallbackProperties } from "../utils/constants";
import ChatWindow from "../components/ChatWindow";

const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
};
const getAmenityIcon = (name) => {
  const map = {
    'Lift': <Building2 size={20} />,
    'Internet Services': <Wifi size={20} />,
    'Air Conditioner': <Zap size={20} />,
    'Club House': <Users size={20} />,
    'Intercom': <Phone size={20} />,
    'Swimming Pool': <Droplets size={20} />,
    'Children Play Area': <Users size={20} />,
    'Fire Safety': <ShieldCheck size={20} />,
    'Servant Room': <User size={20} />,
    'Shopping Center': <Building2 size={20} />,
    'Gas Pipeline': <Zap size={20} />,
    'Park': <Home size={20} />,
    'Rain Water Harvesting': <CloudRain size={20} />,
    'Sewage Treatment Plant': <Droplets size={20} />,
    'House Keeping': <User size={20} />,
    'Power Backup': <Zap size={20} />,
    'Visitor Parking': <Car size={20} />
  };
  return map[name] || <CheckCircle size={20} />;
};

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("babaUser") || "{}");
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem("babaWishlist");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleWishlist = () => {
    const propertyId = property.id || property._id;
    const newWishlist = wishlist.includes(propertyId)
      ? wishlist.filter(id => id !== propertyId)
      : [...wishlist, propertyId];

    setWishlist(newWishlist);
    localStorage.setItem("babaWishlist", JSON.stringify(newWishlist));

    if (newWishlist.includes(propertyId)) {
      toast.success("Added to wishlist!");
    } else {
      toast.success("Removed from wishlist!");
    }
  };

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const res = await API.get(`/properties/${id}`);
        const prop = res.data;
        setProperty(prop);
        // If the property already has a generated video, use it
        if (prop.generatedVideo) {
          setGeneratedVideo(prop.generatedVideo);
        }
      } catch (err) {
        console.error('Failed to load property', err);
        toast.error('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    loadProperty();
  }, [id]);

  useEffect(() => {
    if (property) {
      const gallery = typeof property.gallery === 'string' ? JSON.parse(property.gallery) : (property.gallery || []);
      const images = gallery.filter(item => typeof item === 'string' && !item.startsWith('data:video'));
      const initial = images.length > 0 ? images[0] : (property.image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80");
      setActiveMedia(initial);
    }
  }, [property]);

  // State declarations (must be before any early returns)
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [activeMedia, setActiveMedia] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [videoSaveStatus, setVideoSaveStatus] = useState(''); // 'saving' | 'saved' | 'error'

  if (loading) return <div className="pageMessage">Loading details...</div>;
  if (!property) return <div className="pageMessage">Property not found.</div>;

  const safeParse = (data, fallback) => {
    try {
      return typeof data === 'string' ? JSON.parse(data) : (data || fallback);
    } catch {
      return fallback;
    }
  };

  const gallery = safeParse(property.gallery, []);
  const amenities = safeParse(property.amenities, []);
  const preferredTenants = safeParse(property.preferredTenants, []);
  const schedule = safeParse(property.schedule, { availableDays: [], timeSlot: '' });

  const images = gallery.filter(item => typeof item === 'string' && !item.startsWith('data:video'));
  const videos = gallery.filter(item => typeof item === 'string' && item.startsWith('data:video'));

  // Convert Images to Video handler
  const handleConvertImagesToVideo = async () => {
    if (images.length === 0) {
      toast.error('No images to convert.');
      return;
    }
    setIsConverting(true);
    setVideoSaveStatus('');
    console.log('Starting video conversion process...');
    try {
      // Helper: load image element
      const loadImg = src => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => {
          console.warn('Failed to load image for canvas (skipping):', src, err);
          resolve(null); // skip failed images
        };
        img.src = src;
      });

      // Use a compressed canvas (max 640px wide) to keep file size small enough for DB
      const TARGET_WIDTH = 640;

      // Load all images first
      const loadedImages = (await Promise.all(images.map(loadImg))).filter(Boolean);
      if (loadedImages.length === 0) {
        toast.error('Could not load any images.');
        setIsConverting(false);
        return;
      }

      const firstImg = loadedImages[0];
      const aspectRatio = firstImg.naturalHeight / firstImg.naturalWidth;
      const canvasW = Math.min(TARGET_WIDTH, firstImg.naturalWidth || TARGET_WIDTH);
      const canvasH = Math.round(canvasW * (aspectRatio || 0.75));

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      // Pick best supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';

      const recorderOptions = mimeType ? { mimeType } : {};
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, recorderOptions);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const stopPromise = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start(100); // collect chunks every 100ms

      // Draw each image for 2 seconds
      for (const img of loadedImages) {
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        await new Promise(r => setTimeout(r, 2000));
      }

      recorder.stop();
      await stopPromise;

      if (chunks.length === 0) {
        toast.error('No video data recorded. Try a different browser.');
        setIsConverting(false);
        return;
      }

      const videoBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
      // Show preview immediately with object URL
      const previewUrl = URL.createObjectURL(videoBlob);
      setGeneratedVideo(previewUrl);
      toast.success('Video created! Saving to database...');
      setVideoSaveStatus('saving');

      // Convert to base64 and save to DB
      const reader = new FileReader();
      reader.readAsDataURL(videoBlob);
      reader.onloadend = async () => {
        const base64data = reader.result;
        try {
          const uploadRes = await API.post(
            `/properties/${id}/generated-video-base64`,
            { videoData: base64data },
            { skipToast: true }
          );
          if (uploadRes.data && uploadRes.data.videoUrl) {
            // Replace preview URL with persisted base64 data URI
            setGeneratedVideo(uploadRes.data.videoUrl);
            setProperty(prev => ({ ...prev, generatedVideo: uploadRes.data.videoUrl }));
            setVideoSaveStatus('saved');
            toast.success('Video saved! It will appear on every reload.');
          } else {
            setVideoSaveStatus('error');
            toast.error('Video created but could not save to database.');
          }
        } catch (e) {
          console.error('Base64 upload failed', e);
          setVideoSaveStatus('error');
          toast.error('Video created but save failed: ' + (e.response?.data?.message || e.message));
        }
      };
      reader.onerror = () => {
        setVideoSaveStatus('error');
        toast.error('Failed to encode video for saving.');
      };
    } catch (err) {
      console.error('Error during video conversion:', err);
      toast.error('Failed to convert images to video.');
      setVideoSaveStatus('error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="premiumDetailsContainer">
      <div className="pd-header-nav">
        <Link to="/" className="pd-back"><ArrowLeft size={18} /> Back to Search</Link>
        <div className="pd-actions">
          <button
            className="pd-icon-btn"
            onClick={async () => {
              const url = window.location.href;
              const propertyTitle = property.title || `${property.bhkType || ''} ${property.apartmentType || property.type || 'Property'} in ${property.locality || property.city}`;
              const text = `Check out this property on Baba Homs: ${propertyTitle}`;

              if (navigator.share) {
                try {
                  await navigator.share({
                    title: 'Baba Homs Property',
                    text: text,
                    url: url
                  });
                  return;
                } catch (err) {
                  // Silently fail if user cancelled or system error
                  if (err.name !== 'AbortError') console.error("Share failed", err);
                }
              }

              // Fallback for desktop or failed navigator.share
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied to clipboard!");
                setTimeout(() => {
                  if (window.confirm("Would you like to share this on WhatsApp?")) {
                    window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, '_blank');
                  }
                }, 400);
              } catch (err) {
                window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, '_blank');
              }
            }}
          >
            <Share2 size={18} /> Share
          </button>
          <button
            className={`pd-icon-btn ${wishlist.includes(property.id || property._id) ? 'active' : ''}`}
            onClick={toggleWishlist}
          >
            <Heart size={18} fill={wishlist.includes(property.id || property._id) ? "#ef4444" : "none"} color={wishlist.includes(property.id || property._id) ? "#ef4444" : "currentColor"} />
            {wishlist.includes(property.id || property._id) ? ' Saved' : ' Save'}
          </button>
        </div>
      </div>

      <div className="pd-hero-gallery">
        <div className="pd-main-media small-scale">
          {activeMedia ? (
            activeMedia.startsWith('data:video') || activeMedia.startsWith('blob:') ? (
              <video src={activeMedia} controls className="main-video-player" />
            ) : (
              <img src={activeMedia} alt="Property Main" key={activeMedia} />
            )
          ) : (
            <div className="pd-media-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f0f0', color: '#666' }}>No Image Available</div>
          )}
        </div>
        <div className="pd-side-gallery all-visible">
          {images.map((item, idx) => (
            <div
              key={idx}
              className={`pd-side-media ${activeMedia === item ? 'active' : ''}`}
              onClick={() => setActiveMedia(item)}
            >
              <img src={item} alt={`Gallery ${idx}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Convert to Video button — always visible so user can regenerate */}
      <div className="convert-video-section" style={{ marginTop: '12px', marginBottom: '24px', textAlign: 'left', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {isConverting ? (
          <button className="convertBtn" disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', opacity: 0.7, cursor: 'not-allowed', fontWeight: '600' }}>
            <Loader2 size={18} className="animate-spin" /> Creating video...
          </button>
        ) : (
          <button className="convertBtn" onClick={handleConvertImagesToVideo} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}>
            <Video size={18} /> {generatedVideo ? 'Regenerate Video' : 'Convert Images to Video'}
          </button>
        )}
        {videoSaveStatus === 'saving' && <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: 500 }}>⏳ Saving to database...</span>}
        {videoSaveStatus === 'saved' && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>✅ Saved – video will persist after reload</span>}
        {videoSaveStatus === 'error' && <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 500 }}>⚠️ Video shown locally but not saved to DB</span>}
      </div>

      {/* Generated AI Video Display */}
      {(generatedVideo || property?.generatedVideo) && (
        <div className="pd-video-tour-section small-player" style={{ padding: '0 20px', marginBottom: '30px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Video size={20} /> AI Generated Property Video</h2>
          <div className="pd-video-container-small" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: '#000' }}>
            <video
              key={generatedVideo || property.generatedVideo}
              src={generatedVideo || property.generatedVideo}
              controls
              controlsList="nodownload"
              style={{ width: '100%', display: 'block', maxHeight: '480px', borderRadius: '8px' }}
            />
          </div>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>This video is generated from property images. Use the share button above to share this property.</p>
        </div>
      )}

      {videos.length > 0 && (
        <div className="pd-video-tour-section small-player">
          <h2><Video size={20} /> Video Tour</h2>
          <div className="pd-video-container-small">
            <video src={videos[0]} controls />
          </div>
        </div>
      )}
      <div className="pd-layout">
        <div className="pd-main-content">
          <div className="pd-title-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="pd-badge">{property.adType || 'Rent'}</span>
              <span className="pd-views-count" style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '500' }}>
                <Users size={16} /> {property.views || 0} views
              </span>
            </div>
            <h1>{property.title || `${property.bhkType || ''} ${property.apartmentType || property.type || 'Property'} in ${property.locality || property.city || ''}`}</h1>
            <p className="pd-address"><MapPin size={18} /> {property.address || `${property.locality || ''}, ${property.city || ''}, ${property.country || ''}`}</p>
          </div>

          <div className="pd-quick-stats">
            <div className="pd-stat">
              <Bed size={24} />
              <div>
                <strong>{property.bhkType || (property.bedrooms ? property.bedrooms + ' Beds' : 'N/A')}</strong>
                <span>Bedrooms</span>
              </div>
            </div>
            <div className="pd-stat">
              <Bath size={24} />
              <div>
                <strong>{property.bathrooms || 'N/A'}</strong>
                <span>Bathrooms</span>
              </div>
            </div>
            <div className="pd-stat">
              <Maximize size={24} />
              <div>
                <strong>{property.builtUpArea || property.area || 'N/A'} Sq.ft</strong>
                <span>Area</span>
              </div>
            </div>
            <div className="pd-stat">
              <Building2 size={24} />
              <div>
                <strong>{property.furnishing || 'N/A'}</strong>
                <span>Furnishing</span>
              </div>
            </div>
          </div>

          <div className="pd-section">
            <h2>About this Property</h2>
            <p className="pd-desc">{property.description || 'A beautiful property located in a prime locality with great access to all city amenities.'}</p>

            <div className="pd-details-grid">
              <div className="pd-detail-item"><span>Property Age:</span> {property.propertyAge || 'N/A'}</div>
              <div className="pd-detail-item"><span>Possession Status:</span> {property.possessionStatus || 'N/A'}</div>
              <div className="pd-detail-item"><span>Facing:</span> {property.facing || 'N/A'}</div>
              <div className="pd-detail-item"><span>Floor No:</span> {property.floorNo || 'N/A'} of {property.totalFloors || 'N/A'}</div>
              <div className="pd-detail-item"><span>Balconies:</span> {property.balconies || '0'}</div>
              <div className="pd-detail-item"><span>Water Supply:</span> {property.waterSupply || 'N/A'}</div>
              <div className="pd-detail-item"><span>Parking:</span> {property.parking || 'N/A'}</div>
            </div>
          </div>

          <div className="pd-section">
            <h2>Rules & Preferences</h2>
            <div className="pd-rules-grid">
              <div className="pd-rule">
                <CheckCircle size={18} color="#4caf50" />
                <span>Preferred: {preferredTenants.length > 0 ? preferredTenants.join(', ') : 'Anyone'}</span>
              </div>
              <div className="pd-rule">
                {property.availableFor ? <CheckCircle size={18} color="#4caf50" /> : <Info size={18} color="#f44336" />}
                <span>Available For: {property.availableFor || 'All'}</span>
              </div>
              <div className="pd-rule">
                {property.petAllowed === 'Yes' ? <CheckCircle size={18} color="#4caf50" /> : <Info size={18} color="#f44336" />}
                <span>Pets {property.petAllowed === 'Yes' ? 'Allowed' : 'Not Allowed'}</span>
              </div>
              <div className="pd-rule">
                {property.nonVeg === 'Yes' ? <CheckCircle size={18} color="#4caf50" /> : <Info size={18} color="#f44336" />}
                <span>Non-Veg {property.nonVeg === 'Yes' ? 'Allowed' : 'Not Allowed'}</span>
              </div>
              <div className="pd-rule">
                {property.gym === 'Yes' ? <CheckCircle size={18} color="#4caf50" /> : <Info size={18} color="#f44336" />}
                <span>Gym {property.gym === 'Yes' ? 'Available' : 'Not Available'}</span>
              </div>
              <div className="pd-rule">
                {property.gatedSecurity === 'Yes' ? <CheckCircle size={18} color="#4caf50" /> : <Info size={18} color="#f44336" />}
                <span>Gated Security {property.gatedSecurity === 'Yes' ? 'Yes' : 'No'}</span>
              </div>
              <div className="pd-rule">
                <CheckCircle size={18} color="#4caf50" />
                <span>Furnishing: {property.furnishing || 'N/A'}</span>
              </div>
              <div className="pd-rule">
                <CheckCircle size={18} color="#4caf50" />
                <span>Parking: {property.parking || 'N/A'}</span>
              </div>
            </div>
          </div>

          {amenities.length > 0 && (
            <div className="pd-section">
              <h2>Amenities ({amenities.length})</h2>
              <div className="pd-amenities-grid">
                {amenities.map(a => (
                  <div key={a} className="pd-amenity">
                    {getAmenityIcon(a)}
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pd-section">
            <h2>Availability & Schedule</h2>
            <div className="pd-schedule-box">
              <div className="pd-sch-item">
                <CalendarDays size={20} />
                <div>
                  <strong>Available From</strong>
                  <p>{property.availableFrom || 'Immediately'}</p>
                </div>
              </div>
              <div className="pd-sch-item">
                <Key size={20} />
                <div>
                  <strong>Who will show property?</strong>
                  <p>{property.showProperty || 'Agent'}</p>
                </div>
              </div>
              <div className="pd-sch-item">
                <Info size={20} />
                <div>
                  <strong>Property Condition</strong>
                  <p>{property.propertyCondition || 'N/A'}</p>
                </div>
              </div>
              {schedule.availableDays && schedule.availableDays.length > 0 && (
                <div className="pd-sch-item">
                  <User size={20} />
                  <div>
                    <strong>Viewing Schedule</strong>
                    <p>
                      {schedule.availableDays.join(', ')}
                      {schedule.startTime && schedule.endTime ? ` from ${formatTime12Hour(schedule.startTime)} to ${formatTime12Hour(schedule.endTime)}` : (schedule.timeSlot ? ` (${schedule.timeSlot})` : '')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pd-sidebar">
          <motion.div
            className="pd-price-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="pd-price-header">
              <h2>{property.currency || '₹'} {Number(property.price || property.rentAmount || 0).toLocaleString()}<span> {property.adType === 'Buy' ? '' : '/ month'}</span></h2>
              {property.rentNegotiable && <span className="pd-negotiable">Negotiable</span>}
            </div>

            <div className="pd-price-breakdown">
              <div className="pd-pb-row">
                <span>Security Deposit</span>
                <strong>{property.currency || '₹'} {Number(property.securityDeposit || 0).toLocaleString()}</strong>
              </div>
              <div className="pd-pb-row">
                <span>Maintenance</span>
                <strong>{property.maintenanceAmount ? `${property.currency || '₹'} ${property.maintenanceAmount}` : (property.maintenanceType || 'Included')}</strong>
              </div>
            </div>

            <div className="pd-contact-box">
              {currentUser?.id === property.owner ? (
                <button className="pd-chat-btn-premium" disabled style={{ opacity: 0.7, cursor: "not-allowed" }}>
                  <MessageSquare size={18} />
                  Your Property
                </button>
              ) : (
                <button
                  className="pd-chat-btn-premium"
                  onClick={async () => {
                    let targetId = property.owner;
                    let targetName = property.ownerDetails?.name || 'Agent';
                    if (property.ownerDetails?.role === 'Property Seller') {
                      try {
                        const res = await API.get("/auth/company-user");
                        if (res.data) {
                          targetId = res.data.id;
                          targetName = res.data.name;
                        }
                      } catch (err) { console.error("Could not find company user"); }
                    }
                    navigate(`/messages?propertyId=${property.id}&ownerId=${targetId}&propertyTitle=${encodeURIComponent(property.title || '')}&ownerName=${encodeURIComponent(targetName)}`);
                  }}
                >
                  <MessageSquare size={18} />
                  {property.ownerDetails?.role === 'Property Seller' ? 'Chat with Admin' : 'Chat with Agent'}
                </button>
              )}
            </div>

            <div className="pd-owner-info">
              <div className="pd-owner-avatar">
                {property.ownerDetails?.profilePicture ? (
                  <img src={property.ownerDetails.profilePicture} alt="Owner" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div>
                <strong>Listed by {property.ownerDetails?.name || 'Owner'}</strong>
                <p>Respond usually within 1 hour</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
