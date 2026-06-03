import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Building2, BriefcaseBusiness, Users,
  Search, MapPin, Mic, Heart, Share2, Lock
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";
import { countryCityMap, countryCurrencyMap, fallbackProperties } from "../utils/constants";

const HomePage = () => {
  const navigate = useNavigate();

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Buy");
  const getTitle = (tab) => {
    switch (tab) {
      case "Buy":
        return "Buy Available Properties";
      case "Rental":
        return "Rental Available Properties";
      case "ERC":
        return "ERC Available Properties";
      default:
        return `${tab} Available Properties`;
    }
  };
  const displayTitle = getTitle(activeTab);
  // Add possessionStatus, propertyType and budget states
  const [possessionStatus, setPossessionStatus] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [budget, setBudget] = useState("");
  const [properties, setProperties] = useState(fallbackProperties);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);

  const token = localStorage.getItem("babaToken");
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem("babaWishlist");
    return saved ? JSON.parse(saved) : [];
  });
  const countries = Object.keys(countryCityMap);
  const cities = selectedCountry ? countryCityMap[selectedCountry] : [];
  const currentCurrency = selectedCountry ? (countryCurrencyMap[selectedCountry] || "₹") : "₹";

  const fetchProperties = async (pageNum = 1) => {
    try {
      setLoading(true);

      // Build query string
      let query = `/properties?page=${pageNum}&limit=10`;
      if (selectedCountry) query += `&country=${selectedCountry}`;
      if (selectedCity) query += `&city=${selectedCity}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      // Map activeTab to backend filters
      if (activeTab === "Buy") query += `&adType=Buy`;
      else if (activeTab === "Rental") query += `&adType=Rental`;
      else if (activeTab === "Ongoing & Upcoming Projects with EMI") query += `&adType=Ongoing & Upcoming Projects with EMI`;
      else if (activeTab === "Commercial") query += `&adType=Commercial`;
      else if (activeTab === "Sale") query += `&adType=Sale`;
      else if (activeTab === "Open Land") query += `&adType=Openland`;

      // If a specific property type is selected from the dropdown, it overrides or adds to the tab
      if (propertyType) query += `&apartmentType=${propertyType}`;
      // Add possession status filter if set
      if (possessionStatus) query += `&possessionStatus=${encodeURIComponent(possessionStatus)}`;

      // Add budget filter if set
      if (budget) {
        if (activeTab === "Rental") {
          if (budget === "Low Budget") query += `&maxPrice=10000`;
          else if (budget === "Medium Budget") query += `&minPrice=10000&maxPrice=50000`;
          else if (budget === "High Budget") query += `&minPrice=50000`;
        } else {
          if (budget === "Low Budget") query += `&maxPrice=5000000`;
          else if (budget === "Medium Budget") query += `&minPrice=5000000&maxPrice=10000000`;
          else if (budget === "High Budget") query += `&minPrice=10000000`;
        }
      }

      const res = await API.get(query);

      const incomingProps = res.data.data || res.data;
      const parsedTotal = res.data.totalPages || 1;
      const parsedTotalProps = res.data.totalProperties || (incomingProps ? incomingProps.length : 0);

      if (incomingProps && incomingProps.length > 0) {
        // Always replace — page-based pagination, not append
        setProperties(incomingProps);
        setTotalPages(parsedTotal);
        setTotalProperties(parsedTotalProps);
      } else if (pageNum === 1) {
        setProperties(fallbackProperties);
        setTotalPages(1);
        setTotalProperties(fallbackProperties.length);
      } else {
        // No results on this page, stay on previous
        setProperties([]);
        setTotalPages(parsedTotal);
        setTotalProperties(0);
      }
    } catch (err) {
      console.error("API Error:", err);
      if (pageNum === 1) {
        setProperties(fallbackProperties);
        setTotalProperties(fallbackProperties.length);
      }
      toast.error("Failed to connect to database. Showing offline properties.");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setPage(pageNum);
    await fetchProperties(pageNum);
    // No scroll to keep view stable
    // Loading spinner handled by fetchProperties

  };

  useEffect(() => {
    setPage(1);
    fetchProperties(1);
  }, [selectedCountry, selectedCity, activeTab, propertyType, possessionStatus, budget]);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();

            if (data.city) {
              setSelectedCity(data.city);
              // Map country names if necessary
              let country = data.countryName;
              if (country === "United Arab Emirates") country = "UAE";

              if (countryCityMap[country]) {
                setSelectedCountry(country);
              }
              toast.success(`Location detected: ${data.city}, ${country}`);
            } else {
              toast.error("Could not determine city from location.");
            }
          } catch (err) {
            toast.error("Failed to fetch location details.");
          }
        },
        () => toast.error("Location access denied. Please enable it in your browser.")
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const voiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      toast.success(`Searching for: ${transcript}`);
    };
  };

  const filteredProperties = properties.filter((p) => {
    const countryMatch = selectedCountry ? p.country === selectedCountry : true;
    const cityMatch = selectedCity ? p.city === selectedCity : true;

    // Client-side filtering to match the tabs
    let tabMatch = true;
    if (activeTab === "Buy") tabMatch = p.adType === "Buy" || p.adType === "Resale";
    else if (activeTab === "Rental") tabMatch = p.adType === "Rental" || p.adType === "Rent";
    else if (activeTab === "Ongoing & Upcoming Projects with EMI") tabMatch = p.adType === "Ongoing & Upcoming Projects with EMI" || p.propertyType === "Land/Plot";
    else if (activeTab === "Commercial") tabMatch = p.adType === "Commercial" || p.propertyType === "Commercial";
    else if (activeTab === "Sale") tabMatch = p.adType === "Sale";
    else if (activeTab === "Open Land") tabMatch = p.adType === "Openland" || p.adType === "Open Land";

    const typeMatch = !propertyType || p.apartmentType === propertyType;
    const possessionMatch = !possessionStatus || p.possessionStatus === possessionStatus;

    let budgetMatch = true;
    const price = Number(p.price || p.rentAmount || 0);
    if (budget) {
      if (activeTab === "Rental") {
        if (budget === "Low Budget") budgetMatch = price < 10000;
        else if (budget === "Medium Budget") budgetMatch = price >= 10000 && price <= 50000;
        else if (budget === "High Budget") budgetMatch = price > 50000;
      } else {
        if (budget === "Low Budget") budgetMatch = price < 5000000;
        else if (budget === "Medium Budget") budgetMatch = price >= 5000000 && price <= 10000000;
        else if (budget === "High Budget") budgetMatch = price > 10000000;
      }
    }

    const searchMatch = search
      ? `${p.title || ""} ${p.city || ""} ${p.country || ""} ${p.address || ""} ${p.locality || ""}`.toLowerCase().includes(search.toLowerCase())
      : true;

    return countryMatch && cityMatch && tabMatch && typeMatch && possessionMatch && budgetMatch && searchMatch;
  });

  const toggleWishlist = (e, propertyId) => {
    e.stopPropagation();
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

  const displayProperties = token ? filteredProperties : filteredProperties.slice(0, 3);

  return (
    <>
      <section className="hero">
        <motion.div
          className="heroContent"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            Find Your Dream Property <br />
            <span>Across GCC & South Asia</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Baba Homs helps you buy, rent, and invest in properties across <br />
            <span>UAE, Saudi Arabia, Bahrain, Qatar, India & Pakistan</span>
          </motion.p>

          <div className="searchPanel">
            <div className="tabs">
              {[
                { name: "Buy", Icon: Home, label: "Buy" },
                { name: "Sale", Icon: null, label: "SALE" },
                { name: "Rental", Icon: Home, label: "Rental" },

                { name: "Commercial", Icon: BriefcaseBusiness, label: "Commercial" },

                { name: "Open Land", Icon: null, label: "OPEN LAND" },
                { name: "Ongoing & Upcoming Projects with EMI", Icon: Building2, label: "Ongoing & Upcoming Projects with EMI" },
              ].map(({ name, Icon, label }, index) => (
                <motion.button
                  key={name}
                  className={activeTab === name ? "active" : ""}
                  onClick={() => setActiveTab(name)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {Icon && <Icon size={16} />} {label}
                </motion.button>
              ))}
            </div>

            <motion.div
              className="searchBar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity(""); }}>
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <div className="inputBox">
                <Search size={23} color="#777" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by "City, Locality or Project"'
                />
                <button className="iconBtn" onClick={detectLocation}>
                  <MapPin size={21} />
                </button>
                <button className="iconBtn" onClick={voiceSearch}>
                  <Mic size={21} />
                </button>
              </div>

              <motion.button
                className="searchBtn"
                onClick={() => { setPage(1); fetchProperties(1); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Search
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            className="filters"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <select value={budget} onChange={e => setBudget(e.target.value)}>
              <option value="">Budget</option>
              {activeTab === "Rental" ? (
                <>
                  <option value="Low Budget">Low Budget (under 10k {currentCurrency})</option>
                  <option value="Medium Budget">Medium Budget (10k-50k {currentCurrency})</option>
                  <option value="High Budget">High Budget (50k+ {currentCurrency})</option>
                </>
              ) : (
                <>
                  <option value="Low Budget">Low Budget (under 5M {currentCurrency})</option>
                  <option value="Medium Budget">Medium Budget (5M-10M {currentCurrency})</option>
                  <option value="High Budget">High Budget (10M+ {currentCurrency})</option>
                </>
              )}
            </select>

            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option value="">Apartment Type</option>
              {activeTab === 'Commercial' ? (
                <>
                  <option value="Office Space">Office Space</option>
                  <option value="Shop/Showroom">Shop/Showroom</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Industrial">Industrial</option>
                </>
              ) : activeTab === 'Open Land' ? (
                <>
                  <option value="Plot">Plot</option>
                  <option value="Land">Land</option>
                  <option value="Agricultural Land">Agricultural Land</option>
                </>
              ) : activeTab === 'Ongoing & Upcoming Projects with EMI' ? (
                <>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Plot">Plot</option>
                </>
              ) : (
                <>
                  <option value="Apartment">Apartment</option>
                  <option value="Independent House">Independent House</option>
                  <option value="Villa">Villa</option>
                </>
              )}
            </select>

            <select value={possessionStatus} onChange={e => setPossessionStatus(e.target.value)}>
              <option value="">Possession Status</option>
              <option value="Ready to Move">Ready to Move</option>
              <option value="Under Construction">Under Construction</option>
              <option value="Resale">Resale</option>
              <option value="New">New</option>
            </select>
          </motion.div>
        </motion.div>
      </section>

      <section className="propertySection">
        <div className="section-header-row">
          <div>
            <h2>{activeTab} Available Properties</h2>
            <p>Explore premium {activeTab.toLowerCase()} properties across GCC and South Asia.</p>
          </div>
          {!loading && displayProperties.length > 0 && (
            <div className="total-properties-count">
              <span className="count-number">{totalProperties}</span>
              <span className="count-label">Available Properties</span>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
            <div className="loaderSpinner"></div>
            <p>Loading properties...</p>
          </div>
        ) : displayProperties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
            <h3 style={{ color: '#64748b', marginBottom: '10px' }}>No properties found</h3>
            <p style={{ color: '#94a3b8' }}>Please try adjusting your search filters or check back later.</p>
          </div>
        ) : (
          <div className="cards">
            {displayProperties.map((property, index) => (
              <motion.div
                className="premium-card"
                key={property.id || property._id || index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
              >
                <div className="card-media-wrapper">
                  {(() => {
                    let galleryArr = property.gallery;
                    try {
                      if (typeof galleryArr === 'string') galleryArr = JSON.parse(galleryArr);
                    } catch (e) { galleryArr = []; }

                    const mediaSrc = (property.image && property.image !== "" && property.image !== "undefined" && property.image !== "null")
                      ? property.image
                      : (Array.isArray(galleryArr) && galleryArr.length > 0 ? galleryArr[0] : "https://via.placeholder.com/600x400?text=Baba+Homs+Property");

                    if (typeof mediaSrc === 'string' && mediaSrc.startsWith('data:video')) {
                      return <video src={mediaSrc} className="card-media" controls autoPlay muted loop />;
                    }
                    return <img src={mediaSrc} alt={property.title || 'Property'} className="card-media" />;
                  })()}
                  <div className="card-badge">{property.adType || 'Featured'}</div>
                  <button
                    className={`card-wishlist ${wishlist.includes(property.id || property._id) ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(e, property.id || property._id)}
                  >
                    <Heart size={18} fill={wishlist.includes(property.id || property._id) ? "#ef4444" : "none"} color={wishlist.includes(property.id || property._id) ? "#ef4444" : "currentColor"} />
                  </button>
                </div>

                <div className="card-content">
                  <div className="card-meta">
                    <span className="card-type">{property.apartmentType || property.type || 'Property'}</span>
                    <span className="card-location"><MapPin size={12} /> {property.city}</span>
                  </div>
                  <h3>{property.title || `${property.bhkType || ''} ${property.apartmentType || property.type || 'Property'}`}</h3>

                  <div className="card-footer">
                    <div className="card-price">
                      <span>{property.currency || '₹'}</span>
                      <strong>{Number(property.price || property.rentAmount || 0).toLocaleString()}</strong>
                      <small>/mo</small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="card-share-btn"
                        disabled={shareLoading}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShareLoading(true);
                          try {
                            const baseUrl = `${window.location.origin}/property/${property.id || property._id}`;
                            const title = property.title || `${property.bhkType || ''} ${property.apartmentType || property.type || 'Property'} in ${property.locality || property.city}`;
                            // Parse gallery JSON if needed
                            let galleryArr = property.gallery;
                            try {
                              if (typeof galleryArr === 'string') galleryArr = JSON.parse(galleryArr);
                            } catch (e) {
                              galleryArr = [];
                            }
                            const imageLinks = (Array.isArray(galleryArr) ? galleryArr.filter(i => typeof i === 'string' && !i.startsWith('data:video')) : []).slice(0, 5);
                            const videoLinks = (Array.isArray(galleryArr) ? galleryArr.filter(i => typeof i === 'string' && i.startsWith('data:video')) : []);
                            const lines = [];
                            lines.push(`${title} - Check it out! ${baseUrl}`);
                            if (imageLinks.length) lines.push('Images:', ...imageLinks);
                            if (videoLinks.length) lines.push('Videos:', ...videoLinks);
                            const caption = lines.join('\n');
                            const apiKey = import.meta.env.VITE_BUFFER_API_KEY;
                            if (apiKey) {
                              try {
                                const graphqlQuery = `mutation CreatePost($input: CreatePostInput!) {
                                  createPost(input: $input) {
                                    ... on PostActionSuccess {
                                      post { id }
                                    }
                                    ... on MutationError { message }
                                  }
                                }`;
                                const assets = [
                                  ...imageLinks.map(url => ({ image: { url } })),
                                  ...videoLinks.map(url => ({ video: { url } })),
                                ];
                                const response = await fetch('https://publish.buffer.com/graphql', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${apiKey}`,
                                  },
                                  body: JSON.stringify({
                                    query: graphqlQuery,
                                    variables: {
                                      input: {
                                        text: caption,
                                        channelId: import.meta.env.VITE_BUFFER_CHANNEL_ID,
                                        assets,
                                      },
                                    },
                                  }),
                                });
                                const result = await response.json();
                                const postId = result?.data?.createPost?.post?.id;
                                if (postId) {
                                  window.open(`https://publish.buffer.com/updates/${postId}`, '_blank');
                                  toast.success('Successfully shared to Buffer!');
                                } else {
                                  console.error('Buffer GraphQL error', result);
                                  toast.error('Failed to share via Buffer API.');
                                }
                              } catch (err) {
                                console.error('Buffer request failed', err);
                                toast.error('Error during Buffer request.');
                              }
                            } else {
                              // Fallback
                              window.open(`https://publish.buffer.com/compose?text=${encodeURIComponent(caption)}`, '_blank');
                              toast('Opened Buffer compose window.');
                            }
                          } finally {
                            setShareLoading(false);
                          }
                        }}
                        title="Share Property"
                        style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', cursor: shareLoading ? 'not-allowed' : 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Share2 size={16} />
                        {shareLoading && <span style={{ marginLeft: '5px' }}>Sharing...</span>}
                      </button>
                      <button className="card-view-btn" onClick={() => navigate(`/property/${property.id || property._id}`)}>
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {token ? (
          totalPages > 1 && !loading && (
            <div className="pagination-bar">
              {/* Previous */}
              <button
                className={`pag-btn pag-prev ${page <= 1 ? 'pag-disabled' : ''}`}
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                &#8592; Prev
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => {
                // Show first, last, current ±1, and ellipsis
                const showNum =
                  num === 1 ||
                  num === totalPages ||
                  Math.abs(num - page) <= 1;
                const showEllipsisBefore = num === 2 && page > 3;
                const showEllipsisAfter = num === totalPages - 1 && page < totalPages - 2;

                if (showEllipsisBefore) return (
                  <span key={`ell-b`} className="pag-ellipsis">…</span>
                );
                if (showEllipsisAfter) return (
                  <span key={`ell-a`} className="pag-ellipsis">…</span>
                );
                if (!showNum) return null;

                return (
                  <button
                    key={num}
                    className={`pag-btn ${page === num ? 'pag-active' : ''}`}
                    onClick={() => goToPage(num)}
                  >
                    {num}
                  </button>
                );
              })}

              {/* Next */}
              <button
                className={`pag-btn pag-next ${page >= totalPages ? 'pag-disabled' : ''}`}
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next &#8594;
              </button>

              {/* Page info */}
              <span className="pag-info">Page {page} of {totalPages}</span>
            </div>
          )
        ) : (
          filteredProperties.length > 3 && (
            <motion.div
              className="membership-gate-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="gate-icon-wrapper">
                <Lock size={28} className="lock-icon" />
              </div>
              <h3>Unlock 500+ Premium Listings</h3>
              <p>
                Sign in or register for a free account to view the full catalog of properties,
                get instant access to agent contact details, and unlock all advanced search filters.
              </p>
              <div className="gate-actions">
                <button className="gate-login-btn" onClick={() => navigate("/login")}>
                  Sign In
                </button>
                <button className="gate-register-btn" onClick={() => navigate("/register")}>
                  Register Free
                </button>
              </div>
            </motion.div>
          )
        )}
      </section>
    </>
  );
};

export default HomePage;
