import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import reactPhoneInput2 from 'react-phone-input-2';
import "react-phone-input-2/lib/style.css";
import { Eye, EyeOff } from "lucide-react";
import API from "../api";
import toast from "react-hot-toast";
import logo from "../assets/Logo of Baba Homes.jpeg";

const PhoneInput = reactPhoneInput2.default || reactPhoneInput2;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "Property Finder"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    const phoneDigits = form.phone.replace(/\D/g, '');

    if (phoneDigits.length < 10) {
      toast.error("Please enter a valid WhatsApp number (including country code).");
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: `+${phoneDigits}`,
        password: form.password,
        role: form.role
      });
      
      // Auto-login after registration
      const loginRes = await API.post("/auth/login", { 
        phone: `+${phoneDigits}`, 
        password: form.password 
      });
      
      localStorage.setItem("babaToken", loginRes.data.token);
      localStorage.setItem("babaUser", JSON.stringify(loginRes.data.user));
      toast.success("Account created successfully!");
      navigate(loginRes.data.user.role === 'Agent' ? "/my-properties" : "/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="loginPage">
      <motion.form
        className="loginCard"
        onSubmit={handleRegister}
        initial={{ opacity: 0, scale: 0.92, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <img src={logo} alt="Baba Homs" className="auth-logo" />
        <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>Create Account</h2>
        <p style={{ color: "#666", marginBottom: "25px", fontSize: "14px" }}>Join Baba Homs and find your perfect property.</p>

        <input
          placeholder="Full Name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          style={{ marginBottom: "15px" }}
        />

        <input
          placeholder="Email Address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          style={{ marginBottom: "15px" }}
        />

        <div className="phoneInputWrapper" style={{ marginBottom: "15px", color: "black", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "#666", marginBottom: "5px", display: "block" }}>WhatsApp Number <span style={{color: 'red'}}>*</span></label>
          <PhoneInput
            country={'bh'}
            value={form.phone}
            onChange={phone => setForm({ ...form, phone })}
            inputStyle={{ width: '100%', height: '48px', fontSize: '16px', borderRadius: '8px' }}
            buttonStyle={{ borderRight: '1px solid #ccc', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}
            enableSearch={true}
          />
        </div>

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "15px", outline: "none", fontSize: "16px", color: "#333", backgroundColor: "white" }}
          required
        >
          <option value="Property Finder">Property Finder</option>
          <option value="Agent">Agent</option>
          <option value="Property Seller">Property Seller</option>
        </select>

        <div style={{ position: "relative", marginBottom: "20px" }}>
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ width: "100%", marginBottom: 0 }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#888", cursor: "pointer", padding: 0 }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? "Registering..." : "Create Account"}
        </button>

        <p style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
          Already have an account? <Link to="/login" style={{ color: "#1e293b", fontWeight: "600" }}>Login here</Link>
        </p>
      </motion.form>
    </section>
  );
};

export default RegisterPage;
