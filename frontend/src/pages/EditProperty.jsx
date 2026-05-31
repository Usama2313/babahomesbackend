import { useState, useEffect } from "react";
import { applyImageWatermark, applyVideoWatermark } from "../utils/watermark";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  X, Users, BriefcaseBusiness, Phone, ShieldCheck, Star, Share2,
  ArrowLeft, ArrowRight, Map, Search, MapPin, Building2,
  LayoutDashboard, Image as ImageIcon, Calendar, Wifi,
  Droplets, Zap, CloudRain, Car, Home, User, Video,
  Plus, Camera, Trash2, Key, Info, CheckCircle, Sparkles, Wand2, Loader2
} from "lucide-react";
import API from "../api";
import { countryCityMap, countryCurrencyMap } from "../utils/constants";

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(true);
  const [step, setStep] = useState(1);
  const [showValidation, setShowValidation] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/properties/${id}`);
        const data = res.data;

        // Parse JSON fields
        const safeParse = (d, fb) => {
          try { return typeof d === 'string' ? JSON.parse(d) : (d || fb); }
          catch (e) { return fb; }
        };

        setForm({
          ...data,
          possessionStatus: data.possessionStatus || "",
          budget: data.price || data.budget || "",
          amenities: safeParse(data.amenities, []),
          gallery: safeParse(data.gallery, []),
          schedule: safeParse(data.schedule, { availableDays: [], timeSlot: "" })
        });
      } catch (err) {
        toast.error("Failed to load property data");
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const [form, setForm] = useState({
    budget: "",
    possessionStatus: "",
    currency: "₹",
    country: "",
    city: "",
    propertyType: "Residential",
    adType: "Rent",
    apartmentType: "",
    bhkType: "",
    floorNo: "",
    totalFloors: "",
    propertyAge: "",
    facing: "",
    builtUpArea: "",
    locality: "",
    landmark: "",
    rentAmount: "",
    rentType: "Monthly Rent",
    securityDeposit: "",
    availableFrom: "",
    bathrooms: "0",
    balconies: "0",
    waterSupply: "",
    petAllowed: "No",
    gym: "No",
    nonVeg: "No",
    gatedSecurity: "No",
    showProperty: "",
    propertyCondition: "",
    amenities: [],
    description: "",
    image: "",
    gallery: [],
    schedule: {
      availableDays: [],
      timeSlot: ""
    }
  });

  const steps = [
    { id: 1, label: "Property Details", icon: Home },
    { id: 2, label: "Locality Details", icon: MapPin },
    { id: 3, label: "Rental Details", icon: Building2 },
    { id: 4, label: "Amenities", icon: CheckCircle },
    { id: 5, label: "Gallery", icon: ImageIcon },
    { id: 6, label: "Schedule", icon: Calendar },
  ];

  const handleStart = () => {
    if (!form.city) {
      toast.error("Please select a city to start.");
      return;
    }

    // Sync propertyType based on adType
    let updatedPropertyType = form.propertyType;
    if (form.adType === "Projects") updatedPropertyType = "Land/Plot";
    else if (form.adType === "Commercial") updatedPropertyType = "Commercial";

    setForm(prev => ({ ...prev, propertyType: updatedPropertyType }));
    setIsStarted(true);
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, "image/jpeg", 0.7); // 70% quality
        };
      };
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (let file of files) {
      if (file.type.startsWith('video/')) {
        if (file.size > 2 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 2MB limit.`);
          continue;
        }

        const isHorizontal = await new Promise((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(video.videoWidth >= video.videoHeight);
          };
          video.onerror = () => resolve(false);
          video.src = URL.createObjectURL(file);
        });

        if (!isHorizontal) {
          toast.error(`${file.name} is vertical. Please capture videos horizontally.`);
          continue;
        }
        validFiles.push(file);
      } else if (file.type.startsWith('image/')) {
        const isHorizontal = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            window.URL.revokeObjectURL(img.src);
            resolve(img.width >= img.height);
          };
          img.onerror = () => resolve(false);
          img.src = URL.createObjectURL(file);
        });

        if (!isHorizontal) {
          toast.error(`${file.name} is vertical. Please capture photos horizontally.`);
          continue;
        }
        const compressed = await compressImage(file);
        validFiles.push(compressed);
      }
    }

    if (validFiles.length > 0) {
      setForm(prev => ({ ...prev, gallery: [...prev.gallery, ...validFiles] }));
    }
    e.target.value = '';
  };

  const handleNext = () => {
    // Step 1 Validation
    if (step === 1) {
      if (!form.builtUpArea || !form.apartmentType || !form.possessionStatus) {
        toast.error("Please fill all required property details including possession status.");
        return;
      }
      if (parseInt(form.builtUpArea) < 200) {
        setShowValidation(true);
        return;
      }
    }

    // Step 2 Validation
    if (step === 2) {
      if (!form.country || !form.city || !form.locality) {
        toast.error("Please provide country, city and locality details.");
        return;
      }
    }

    // Step 3 Validation
    if (step === 3) {
      if (form.adType === 'Buy') {
        if (!form.budget) {
          toast.error("Please enter the budget amount for Buy listings.");
          return;
        }
      } else {
        if (!form.rentAmount || !form.securityDeposit) {
          toast.error("Please enter rent and security deposit amounts.");
          return;
        }
      }
      if (!form.availableFrom) {
        toast.error("Please select a date for 'Available From'.");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      if (form.availableFrom < today) {
        toast.error("Availability date cannot be in the past.");
        return;
      }
    }

    // Step 4 Validation
    if (step === 4) {
      if (!form.bathrooms || !form.showProperty) {
        toast.error("Please fill bathroom count and 'Who will show property'.");
        return;
      }
    }

    if (step === 6) {
      if (form.schedule.startTime && form.schedule.endTime) {
        if (form.schedule.endTime <= form.schedule.startTime) {
          toast.error("End time must be after start time.");
          return;
        }
      }
    }

    if (step < 6) setStep(step + 1);
    else updateProperty();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const [generatingAI, setGeneratingAI] = useState(false);

  const generateAIDescription = async () => {
    try {
      setGeneratingAI(true);
      const res = await API.post("/properties/generate-description", {
        bhkType: form.bhkType,
        builtUpArea: form.builtUpArea,
        city: form.city,
        locality: form.locality,
        apartmentType: form.apartmentType,
        rentAmount: form.rentAmount,
        amenities: form.amenities
      });
      setForm(prev => ({ ...prev, description: res.data.description }));
      toast.success("AI Description generated!");
    } catch (err) {
      toast.error("Failed to generate AI description.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const updateProperty = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("babaToken");
      const customLogoUrl = currentUser?.logoUrl || null;

      // Convert front image to base64 with watermark
      let mainImageBase64 = form.image;
      if (form.image instanceof File) {
        if (form.image.type.startsWith('image/')) {
          const watermarked = await applyImageWatermark(form.image, customLogoUrl);
          mainImageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(watermarked);
            reader.onload = () => resolve(reader.result);
          });
        } else if (form.image.type.startsWith('video/')) {
          const watermarked = await applyVideoWatermark(form.image, customLogoUrl);
          mainImageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(watermarked);
            reader.onload = () => resolve(reader.result);
          });
        } else {
          mainImageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(form.image);
            reader.onload = () => resolve(reader.result);
          });
        }
      }

      // Convert gallery files to base64 with watermarks applied
      const galleryBase64 = await Promise.all(
        form.gallery.map(async file => {
          if (typeof file === 'string' && file.startsWith('data:')) return file;
          if (file instanceof File && file.type.startsWith('image/')) {
            const watermarked = await applyImageWatermark(file, customLogoUrl);
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(watermarked);
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
            });
          }
          if (file instanceof File && file.type.startsWith('video/')) {
            const watermarked = await applyVideoWatermark(file, customLogoUrl);
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(watermarked);
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
            });
          }
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
          });
        })
      );

      const bhkValue = parseInt(form.bhkType) || 0;
      const generatedTitle = form.title || `${form.bhkType || ''} ${form.apartmentType || 'Property'} in ${form.locality || form.city || ''}`;

      const payload = {
        ...form,
        title: generatedTitle,
        image: mainImageBase64,
        gallery: JSON.stringify(galleryBase64),
        price: Number(form.budget) || 0,
        rentAmount: Number(form.rentAmount) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        maintenanceAmount: Number(form.maintenanceAmount || 0),
        builtUpArea: Number(form.builtUpArea) || 0,
        bathrooms: parseInt(form.bathrooms) || 0,
        balconies: parseInt(form.balconies) || 0,
        bedrooms: bhkValue
      };

      // Ensure we have a main image if gallery exists but main image is empty
      if (!payload.image && payload.gallery && payload.gallery.length > 0) {
        payload.image = payload.gallery[0];
      }

      await API.put(`/properties/${id}`, payload);
      toast.success("Property updated successfully!");
      navigate("/my-properties");
    } catch (err) {
      toast.error("Error posting property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.round(((step - 1) / 6) * 100);

  if (!isStarted) {
    return (
      <div className="postIntroPage">
        <div className="postIntroContent">
          <div className="introLeft">
            <h2>Why Post through us?</h2>
            <div className="featureList">
              <div className="featureItem">
                <div className="featureIcon"><Users size={20} /></div>
                <div>
                  <h4>Faster Tenants</h4>
                  <p>Connect with genuine seekers</p>
                </div>
              </div>
              <div className="featureItem">
                <div className="featureIcon"><BriefcaseBusiness size={20} /></div>
                <div>
                  <h4>10 lac tenants/buyers connections</h4>
                  <p>Wide reach across GCC & South Asia</p>
                </div>
              </div>
            </div>
          </div>

          <div className="introRight">
            <div className="startForm">
              <div className="citySelectRow">
                <select value={form.country} onChange={e => {
                  const country = e.target.value;
                  const currency = countryCurrencyMap[country] || "₹";
                  setForm({ ...form, country, currency, city: "" });
                }}>
                  <option value="">Select Country</option>
                  {Object.keys(countryCityMap).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={!form.country}>
                  <option value="">Select City</option>
                  {(countryCityMap[form.country] || []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="typeSection">
                <p>Property type</p>
                <div className="typeTabs">
                  {["Residential", "Commercial", "Land/Plot"].map(t => (
                    <button
                      key={t}
                      className={form.propertyType === t ? "active" : ""}
                      onClick={() => setForm({ ...form, propertyType: t })}
                    >
                      {t} {t === "Land/Plot" && <span className="newBadge">New</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="adTypeSection">
                <p>Select Property Ad Type</p>
                <div className="adTypes">
                  {["Buy", "Rental", "Projects", "Commercial"].map(a => (
                    <button
                      key={a}
                      className={form.adType === a ? "active" : ""}
                      onClick={() => setForm({ ...form, adType: a })}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="startPostingBtn"
                onClick={handleStart}
                disabled={!form.city || !form.country}
              >
                Start Posting Your Ad For FREE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="postPropertyLayout">
      <div className="postPropertyHeader">
        <div className="headerLeft">
          <Link to="/" className="logo">
            <span className="box"></span>
            <div>
              <h1>Baba Homs</h1>
              <span>Post Your Property</span>
            </div>
          </Link>
        </div>
        <div className="headerRight">
          <button className="previewBtn">Preview</button>
          <button className="closeBtn" onClick={() => navigate("/")}><X size={20} /></button>
        </div>
      </div>

      <div className="progressBarContainer">
        <div className="progressInfo">
          <span>{progress}% Done</span>
          <div className="mainProgressBar">
            <div className="progressFill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="postPropertyBody">
        <aside className="postPropertyLeft">
          {steps.map((s) => (
            <div
              key={s.id}
              className={`sidebarItem ${step === s.id ? "active" : ""} ${step > s.id ? "completed" : ""}`}
              onClick={() => step > s.id && setStep(s.id)}
            >
              <s.icon size={18} />
              <span>{s.label}</span>
              {step > s.id && <CheckCircle size={16} className="checkIcon" />}
            </div>
          ))}
        </aside>

        <main className="postPropertyMain">
          <div className="postPropertyContent">
            {step === 1 && (
              <div className="stepForm">
                <h2>Property Details</h2>
                <div className="formGrid">
                  <div className="formGroup">
                    <label>Apartment Type*</label>
                    <select value={form.apartmentType} onChange={e => setForm({ ...form, apartmentType: e.target.value })}>
                      <option value="">Select</option>
                      <option>Apartment</option>
                      <option>Independent House</option>
                      <option>Villa</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>BHK Type*</label>
                    <select value={form.bhkType} onChange={e => setForm({ ...form, bhkType: e.target.value })}>
                      <option value="">Select</option>
                      <option>Studio</option>
                      <option>1 BHK</option>
                      <option>2 BHK</option>
                      <option>3 BHK</option>
                      <option>4 BHK</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Floor No</label>
                    <input type="number" value={form.floorNo} onChange={e => setForm({ ...form, floorNo: e.target.value })} />
                  </div>
                  <div className="formGroup">
                    <label>Total Floors</label>
                    <input type="number" value={form.totalFloors} onChange={e => setForm({ ...form, totalFloors: e.target.value })} />
                  </div>
                  <div className="formGroup">
                    <label>Property Age</label>
                    <select value={form.propertyAge} onChange={e => setForm({ ...form, propertyAge: e.target.value })}>
                      <option>New</option>
                      <option>1-3 Years</option>
                      <option>3-5 Years</option>
                      <option>5-10 Years</option>
                      <option>10+ Years</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Facing</label>
                    <select value={form.facing} onChange={e => setForm({ ...form, facing: e.target.value })}>
                      <option>North</option>
                      <option>South</option>
                      <option>East</option>
                      <option>West</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Possession Status*</label>
                    <select value={form.possessionStatus} onChange={e => setForm({ ...form, possessionStatus: e.target.value })}>
                      <option value="">Select</option>
                      <option value="Ready to Move">Ready to Move</option>
                      <option value="Under Construction">Under Construction</option>
                      <option value="Resale">Resale</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Built Up Area*</label>
                    <div className="inputWithUnit">
                      <input
                        type="number"
                        value={form.builtUpArea}
                        onChange={e => setForm({ ...form, builtUpArea: e.target.value })}
                        placeholder="Area"
                      />
                      <span>Sq.ft</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="stepForm">
                <h2>Locality Details</h2>
                <div className="formGrid">
                  <div className="formGroup">
                    <label>Country*</label>
                    <select value={form.country} onChange={e => {
                      const country = e.target.value;
                      const currency = countryCurrencyMap[country] || "₹";
                      setForm({ ...form, country, currency, city: "" });
                    }}>
                      <option value="">Select Country</option>
                      {Object.keys(countryCityMap).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>City*</label>
                    <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={!form.country}>
                      <option value="">Select City</option>
                      {(countryCityMap[form.country] || []).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Locality*</label>
                    <input
                      placeholder="Enter locality"
                      value={form.locality}
                      onChange={e => setForm({ ...form, locality: e.target.value })}
                    />
                  </div>
                  <div className="formGroup fullWidth">
                    <label>Landmark / Street*</label>
                    <input
                      placeholder="Enter landmark"
                      value={form.landmark}
                      onChange={e => setForm({ ...form, landmark: e.target.value })}
                    />
                  </div>
                </div>


                <div className="extraLocalityFields">
                  <div className="toggleGroup horizontal">
                    <label>Do you have more similar units/properties available?</label>
                    <div className="btnGroup small">
                      <button className={form.similarUnits === "No" ? "active" : ""} onClick={() => setForm({ ...form, similarUnits: "No" })}>No</button>
                      <button className={form.similarUnits === "Yes" ? "active" : ""} onClick={() => setForm({ ...form, similarUnits: "Yes" })}>Yes</button>
                    </div>
                  </div>

                  <div className="formGroup fullWidth directionTip">
                    <label>Add Directions Tip for your tenants <span className="newBadge">NEW</span></label>
                    <div className="tipInfo">
                      <MapPin size={16} />
                      <p>Don't want calls asking location? Add directions to reach using landmarks</p>
                    </div>
                    <textarea
                      placeholder="Eg. Take the road opposite to Amrita College, take right after 300m..."
                      value={form.directionTip}
                      onChange={e => setForm({ ...form, directionTip: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="stepForm">
                <h2>{form.adType === 'Buy' ? 'Provide budget details about your property' : 'Provide rental details about your property'}</h2>
                <div className="formGrid">
                  <div className="formGroup fullWidth">
                    <label>Property available for</label>
                    <div className="radioGroup">
                      <label><input type="radio" name="availableFor" checked={form.availableFor === 'Rent'} onChange={() => setForm({ ...form, availableFor: 'Rent' })} /> Only rent</label>
                      <label><input type="radio" name="availableFor" checked={form.availableFor === 'Lease'} onChange={() => setForm({ ...form, availableFor: 'Lease' })} /> Only lease</label>
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>{form.adType === 'Buy' ? 'Budget*' : 'Expected Rent*'}</label>
                    <div className="inputWithUnit">
                      <span>{form.currency || "₹"}</span>
                      <input type="number" placeholder="Enter Amount" value={form.adType === 'Buy' ? form.budget : form.rentAmount} onChange={e => {
                        if (form.adType === 'Buy') setForm({ ...form, budget: e.target.value });
                        else setForm({ ...form, rentAmount: e.target.value });
                      }} />
                      <span>/ Month</span>
                    </div>
                    <div className="amountInWords">{form.currency || "₹"} {(form.adType === 'Buy' ? form.budget : form.rentAmount) ? ((form.adType === 'Buy' ? form.budget : form.rentAmount) / 1000).toFixed(2) + ' k' : '0.00 k'}</div>
                  </div>

                  <div className="formGroup">
                    <label>Expected Deposit*</label>
                    <div className="inputWithUnit">
                      <span>{form.currency || "₹"}</span>
                      <input type="number" placeholder="Enter Amount" value={form.securityDeposit} onChange={e => setForm({ ...form, securityDeposit: e.target.value })} />
                    </div>
                    <div className="amountInWords">{form.currency || "₹"} {form.securityDeposit ? (form.securityDeposit / 1000).toFixed(2) + ' k' : '0.00 k'}</div>
                  </div>

                  <div className="formGroup fullWidth">
                    <label className="checkboxLabel">
                      <input type="checkbox" checked={form.rentNegotiable} onChange={e => setForm({ ...form, rentNegotiable: e.target.checked })} />
                      Rent Negotiable
                    </label>
                  </div>

                  <div className="formGroup">
                    <label>Monthly Maintenance</label>
                    <select value={form.maintenanceType} onChange={e => setForm({ ...form, maintenanceType: e.target.value })}>
                      <option>Maintenance Extra</option>
                      <option>Maintenance Included</option>
                    </select>
                  </div>

                  <div className="formGroup">
                    <label>Maintenance Amount*</label>
                    <div className="inputWithUnit">
                      <span>{form.currency || "₹"}</span>
                      <input type="number" placeholder="Amount" value={form.maintenanceAmount} onChange={e => setForm({ ...form, maintenanceAmount: e.target.value })} />
                      <span>/ Month</span>
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Available From*</label>
                    <input type="date" min={new Date().toISOString().split("T")[0]} value={form.availableFrom} onChange={e => setForm({ ...form, availableFrom: e.target.value })} />
                  </div>

                  <div className="formGroup fullWidth">
                    <label>Preferred Tenants*</label>
                    <div className="checkboxGroup">
                      {['Anyone', 'Family', 'Bachelor Female', 'Bachelor Male', 'Company'].map(t => (
                        <label key={t}>
                          <input
                            type="checkbox"
                            checked={form.preferredTenants?.includes(t)}
                            onChange={e => {
                              const tenants = form.preferredTenants || [];
                              if (e.target.checked) setForm({ ...form, preferredTenants: [...tenants, t] });
                              else setForm({ ...form, preferredTenants: tenants.filter(item => item !== t) });
                            }}
                          /> {t}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="formGroup">
                    <label>Furnishing*</label>
                    <select value={form.furnishing} onChange={e => setForm({ ...form, furnishing: e.target.value })}>
                      <option>Fully furnished</option>
                      <option>Semi furnished</option>
                      <option>Unfurnished</option>
                    </select>
                  </div>

                  <div className="formGroup">
                    <label>Parking*</label>
                    <select value={form.parking} onChange={e => setForm({ ...form, parking: e.target.value })}>
                      <option>Car</option>
                      <option>Bike</option>
                      <option>Both</option>
                      <option>None</option>
                    </select>
                  </div>

                  <div className="formGroup fullWidth">
                    <label>Description</label>
                    <div className="ai-generate-wrapper" style={{ marginBottom: '10px' }}>
                      <button
                        type="button"
                        className="ai-magic-btn"
                        onClick={generateAIDescription}
                        disabled={generatingAI}
                      >
                        {generatingAI ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                        {generatingAI ? "Crafting..." : "Magic Generate with AI"}
                      </button>
                    </div>
                    <textarea
                      placeholder="Write a few lines about your property..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="stepForm amenitiesStep">
                <h2 className="stepTitle">Provide additional details about your property to get maximum visibility</h2>

                <div className="formGrid threeCol">
                  <div className="formGroup">
                    <label>Bathroom(s)*</label>
                    <div className="stepper">
                      <button onClick={() => setForm({ ...form, bathrooms: Math.max(0, parseInt(form.bathrooms || 0) - 1).toString() })}>-</button>
                      <span>{form.bathrooms || 0}</span>
                      <button onClick={() => setForm({ ...form, bathrooms: (parseInt(form.bathrooms || 0) + 1).toString() })}>+</button>
                    </div>
                  </div>
                  <div className="formGroup">
                    <label>Balcony</label>
                    <div className="stepper">
                      <button onClick={() => setForm({ ...form, balconies: Math.max(0, parseInt(form.balconies || 0) - 1).toString() })}>-</button>
                      <span>{form.balconies || 0}</span>
                      <button onClick={() => setForm({ ...form, balconies: (parseInt(form.balconies || 0) + 1).toString() })}>+</button>
                    </div>
                  </div>
                  <div className="formGroup">
                    <label>Water Supply</label>
                    <select value={form.waterSupply} onChange={e => setForm({ ...form, waterSupply: e.target.value })}>
                      <option value="">Select</option>
                      <option>Corporation</option>
                      <option>Borewell</option>
                      <option>Both</option>
                    </select>
                  </div>
                </div>

                <div className="binaryTogglesGrid">
                  {[
                    { label: "Pet Allowed*", key: "petAllowed", icon: <Users size={16} /> },
                    { label: "Gym*", key: "gym", icon: <BriefcaseBusiness size={16} /> },
                    { label: "Non-Veg Allowed*", key: "nonVeg", icon: <LayoutDashboard size={16} /> },
                    { label: "Gated Security*", key: "gatedSecurity", icon: <ShieldCheck size={16} /> }
                  ].map(item => (
                    <div key={item.key} className="toggleGroup">
                      <div className="toggleLabel">
                        {item.icon}
                        <label>{item.label}</label>
                      </div>
                      <div className="btnGroup">
                        <button className={form[item.key] === "No" ? "active" : ""} onClick={() => setForm({ ...form, [item.key]: "No" })}>No</button>
                        <button className={form[item.key] === "Yes" ? "active" : ""} onClick={() => setForm({ ...form, [item.key]: "Yes" })}>Yes</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="formGrid twoCol">
                  <div className="formGroup">
                    <label>Who will show the property?*</label>
                    <select value={form.showProperty} onChange={e => setForm({ ...form, showProperty: e.target.value })}>
                      <option value="">Select</option>
                      <option>Self</option>
                      <option>Agent</option>
                      <option>Caretaker</option>
                    </select>
                  </div>
                  <div className="formGroup">
                    <label>Current Property Condition?</label>
                    <select value={form.propertyCondition} onChange={e => setForm({ ...form, propertyCondition: e.target.value })}>
                      <option value="">Select</option>
                      <option>New</option>
                      <option>Resale</option>
                      <option>Under Construction</option>
                    </select>
                  </div>
                </div>

                <div className="amenitiesSection">
                  <h3 className="sectionLabel">Select the available amenities</h3>
                  <div className="amenitiesCheckboxGrid">
                    {[
                      { name: "Lift", icon: <Building2 size={16} /> },
                      { name: "Internet Services", icon: <Wifi size={16} /> },
                      { name: "Air Conditioner", icon: <Home size={16} /> },
                      { name: "Club House", icon: <Users size={16} /> },
                      { name: "Intercom", icon: <Phone size={16} /> },
                      { name: "Swimming Pool", icon: <Droplets size={16} /> },
                      { name: "Children Play Area", icon: <Users size={16} /> },
                      { name: "Fire Safety", icon: <ShieldCheck size={16} /> },
                      { name: "Servant Room", icon: <User size={16} /> },
                      { name: "Shopping Center", icon: <Building2 size={16} /> },
                      { name: "Gas Pipeline", icon: <Zap size={16} /> },
                      { name: "Park", icon: <Map size={16} /> },
                      { name: "Rain Water Harvesting", icon: <CloudRain size={16} /> },
                      { name: "Sewage Treatment Plant", icon: <Droplets size={16} /> },
                      { name: "House Keeping", icon: <User size={16} /> },
                      { name: "Power Backup", icon: <Zap size={16} /> },
                      { name: "Visitor Parking", icon: <Car size={16} /> }
                    ].map(amenity => (
                      <label key={amenity.name} className="amenityCheck">
                        <input
                          type="checkbox"
                          checked={form.amenities.includes(amenity.name)}
                          onChange={e => {
                            const newAmenities = e.target.checked
                              ? [...form.amenities, amenity.name]
                              : form.amenities.filter(a => a !== amenity.name);
                            setForm({ ...form, amenities: newAmenities });
                          }}
                        />
                        <div className="checkContent">
                          {amenity.icon}
                          <span>{amenity.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="stepForm galleryStep">
                <div className="galleryHeader">
                  <h2>Upload photos & videos</h2>
                </div>

                <div className="frontImageSection" style={{ marginBottom: '30px' }}>
                  <h3>Front Image (Main Photo)*</h3>
                  <div className="frontImageUpload">
                    {form.image ? (
                      <div className="frontImagePreview">
                        <img src={form.image instanceof File ? URL.createObjectURL(form.image) : form.image} alt="Front" />
                        <button className="removeFrontBtn" onClick={() => setForm({ ...form, image: "" })}><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="frontImagePlaceholder" style={{ border: '2px dashed #3b82f6', background: '#eff6ff', color: '#1d4ed8', padding: '40px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => document.getElementById('frontInput').click()}>
                        <Camera size={32} style={{ margin: '0 auto 10px', color: '#3b82f6' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Click to Upload Front View</p>
                        <small style={{ color: '#64748b' }}>Supports JPG, PNG (Max 5MB)</small>
                        <input
                          id="frontInput"
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setForm({ ...form, image: e.target.files[0] });
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="uploadContainer">
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
                    <div className="uploadBoxMain" style={{ flex: '1 1 200px' }} onClick={() => document.getElementById('photoInput').click()}>
                      <div className="uploadIconLarge">
                        <ImageIcon size={48} color="#999" />
                      </div>
                      <h3>Add photos to get 5X more responses.</h3>
                      <p>90% tenants contact on properties with photos.</p>
                      <button className="addPhotosBtn">Add Photos</button>
                      <input
                        id="photoInput"
                        type="file"
                        multiple
                        hidden
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>

                    <div className="uploadBoxMain" style={{ flex: '1 1 200px' }} onClick={() => document.getElementById('videoInput').click()}>
                      <div className="uploadIconLarge">
                        <Video size={48} color="#999" />
                      </div>
                      <h3>Add a video walk-through.</h3>
                      <p>Give seekers a virtual tour of your property.</p>
                      <button className="addPhotosBtn">Add Video</button>
                      <input
                        id="videoInput"
                        type="file"
                        multiple
                        hidden
                        accept="video/*"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  <div className="uploadDivider">
                    <span>OR</span>
                  </div>

                  <div className="behalfUpload">
                    <p>We can upload photos on your behalf</p>
                    <small style={{ display: 'block', color: '#ff9800', marginTop: '5px', fontSize: '11px' }}>
                      * Please capture photos & videos horizontally (landscape) using 0.5x zoom to keep sizes in KBs. Max video size is 2MB.
                    </small>
                  </div>
                </div>

                {form.gallery.length > 0 && (
                  <div className="galleryScrollContainer">
                    <div className="galleryPreviewHorizontal">
                      {form.gallery.map((f, i) => (
                        <div key={i} className="galleryItemCard">
                          <div className="filePreview">
                            {(f instanceof File && f.type.startsWith('video/')) || (typeof f === 'string' && f.startsWith('data:video'))
                              ? <video src={f instanceof File ? URL.createObjectURL(f) : f} className="thumbVideo" />
                              : <img src={f instanceof File ? URL.createObjectURL(f) : f} alt={f.name || 'Gallery Image'} className="thumbImg" />
                            }
                          </div>
                          <div className="fileInfo">
                            <span className="fileName">{f instanceof File ? f.name : "Saved Video"}</span>
                            <span className="fileSize">{f instanceof File ? (f.size / 1024).toFixed(1) + " KB" : "---"}</span>
                          </div>
                          <button className="removeFile" onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, idx) => idx !== i) })}>&times;</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="stepForm">
                <h2>Select Schedule</h2>
                <div className="formGrid">
                  <div className="formGroup fullWidth">
                    <label>Availability Days*</label>
                    <div className="checkboxGroup">
                      {['All days', 'Weekdays', 'Weekends'].map(d => (
                        <label key={d}>
                          <input type="checkbox" checked={form.schedule.availableDays.includes(d)} onChange={e => {
                            const days = form.schedule.availableDays;
                            if (e.target.checked) setForm({ ...form, schedule: { ...form.schedule, availableDays: [...days, d] } });
                            else setForm({ ...form, schedule: { ...form.schedule, availableDays: days.filter(i => i !== d) } });
                          }} /> {d}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="formGroup fullWidth">
                    <label>Availability Time*</label>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <input type="time" value={form.schedule.startTime || ""} onChange={e => setForm({ ...form, schedule: { ...form.schedule, startTime: e.target.value } })} style={{ flex: 1 }} />
                      <span>to</span>
                      <input type="time" value={form.schedule.endTime || ""} onChange={e => setForm({ ...form, schedule: { ...form.schedule, endTime: e.target.value } })} style={{ flex: 1 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}


            <div className="helpBanner">
              <div className="helpIcon"><Phone size={18} /></div>
              <p>Don't want to fill all the details? Let us help you!</p>
              <button className="helpBtn">I'm interested</button>
            </div>
          </div>
        </main>

        <aside className="postPropertyRight">
          <div className="promoCard">
            <h3>Get Tenants Faster</h3>
            <p>Subscribe to our owner plans and find Tenants quickly and with ease</p>
            <ul className="promoList">
              <li><ShieldCheck size={16} /> Privacy</li>
              <li><Star size={16} /> Promoted Listing</li>
              <li><Share2 size={16} /> Social Marketing</li>
              <li><Users size={16} /> Price Consultation</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="postPropertyFooter">
        {step > 1 && <button className="backBtn" onClick={handleBack} disabled={loading}><ArrowLeft size={18} /> Back</button>}
        <button className="continueBtn" onClick={handleNext} disabled={loading}>
          {loading ? "Updating..." : (step === 6 ? "Finish" : "Save & Continue")}
          {!loading && step < 6 && <ArrowRight size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {showValidation && (
          <motion.div
            className="modalOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="validationModal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="modalIcon">
                <div className="warningCircle">
                  <Home size={40} color="#ff9800" />
                  <div className="percentIcon">%</div>
                </div>
              </div>
              <p className="modalText">
                <strong>{form.builtUpArea} Sq.ft</strong> is too small for a <strong>{form.bhkType}</strong>, Do You want to recheck this data?
              </p>
              <div className="modalActions">
                <button className="changeBtn" onClick={() => setShowValidation(false)}>I want to change it</button>
                <button className="correctBtn" onClick={() => { setShowValidation(false); setStep(step + 1); }}>The data is correct</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditProperty;
