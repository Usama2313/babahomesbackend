import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Camera, Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";
import { countryCityMap } from "../utils/constants";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

    const [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      country: "",
      city: "",
      profilePicture: "",
      logoUrl: ""
    });

  const countries = Object.keys(countryCityMap);
  const cities = form.country ? countryCityMap[form.country] : [];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/auth/me");
        setForm({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          country: res.data.country || "",
          city: res.data.city || "",
          profilePicture: res.data.profilePicture || "",
          logoUrl: res.data.logoUrl || ""
        });

        // Update local storage user data to keep navbar in sync
        const storedUser = JSON.parse(localStorage.getItem("babaUser") || "{}");
        localStorage.setItem("babaUser", JSON.stringify({ ...storedUser, ...res.data }));
      } catch (error) {
        toast.error("Failed to load profile.");
        if (error.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setForm({ ...form, profilePicture: reader.result });
      };
      reader.onerror = () => {
        toast.error("Failed to read image file.");
      };
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo size must be less than 5MB");
        return;
      }
      
      const formData = new FormData();
      formData.append("logo", file);
      
      try {
        setLoading(true);
        const res = await API.post("/auth/upload/logo", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        setForm({ ...form, logoUrl: res.data.logoUrl });
        toast.success("Logo uploaded successfully");
      } catch (error) {
        toast.error("Failed to upload logo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await API.put("/auth/profile", form);
      toast.success(res.data.message || "Profile updated successfully!");

      // Update local storage
      const storedUser = JSON.parse(localStorage.getItem("babaUser") || "{}");
      localStorage.setItem("babaUser", JSON.stringify({ ...storedUser, ...form, profilePicture: form.profilePicture }));

      // Trigger a storage event manually so Navbar updates
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating profile.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="pageMessage">
        <div className="loaderSpinner"></div>
        <p>Loading Profile...</p>
      </div>
    );
  }

  return (
    <>
      <div className="profileLayout">
        <motion.div
          className="profileContainer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="profileHeader">
            <button className="backBtnIcon" onClick={() => navigate("/")}>
              <ArrowLeft size={20} />
            </button>
            <h2>My Profile</h2>
          </div>

          <div className="profileContent">
            <div className="profileSidebar">
              <div className="avatarWrapper">
                {form.profilePicture ? (
                  <img src={form.profilePicture} alt="Profile" className="profileAvatarImg" />
                ) : (
                  <div className="profileAvatarFallback">
                    {form.name ? form.name.charAt(0).toUpperCase() : <User size={40} />}
                  </div>
                )}
                <label className="uploadOverlay">
                  <Camera size={20} />
                  <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                </label>
              </div>
              <h3>{form.name || "User"}</h3>
              <p>{form.email}</p>
            </div>

            <div className="profileForm">
              <h3>Personal Information</h3>

              <div className="formGrid">
                <div className="formGroup">
                  <label><User size={16} /> Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="formGroup">
                  <label><Mail size={16} /> Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    readOnly
                    className="readOnlyInput"
                  />
                </div>
                <div className="formGroup">
                  <label><Phone size={16} /> Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <h3 className="sectionTitle">Location</h3>
              <div className="formGrid">
                <div className="formGroup">
                  <label><MapPin size={16} /> Country</label>
                  <select
                    value={form.country}
                    onChange={e => setForm({ ...form, country: e.target.value, city: "" })}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="formGroup">
                  <label><MapPin size={16} /> City</label>
                  <select
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    disabled={!form.country}
                  >
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <h3 className="sectionTitle">Company Logo (Watermark)</h3>
              <div className="formGrid">
                <div className="formGroup fullWidth">
                  <label>Logo for Watermarking</label>
                  <div className="logoUploadBox" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>No Logo</span>
                      </div>
                    )}
                    <label style={{ cursor: 'pointer', padding: '8px 16px', background: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
                      Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                    </label>
                  </div>
                </div>
              </div>

              <div className="formActions">
                <button
                  className="continueBtn"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : <><Save size={18} /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ProfilePage;
