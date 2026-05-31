import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";
import logo from "../assets/Logo of Baba Homes.jpeg";

const AuthPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitAuth = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await API.post("/auth/login", { 
        email: form.email,
        password: form.password 
      });
      localStorage.setItem("babaToken", res.data.token);
      localStorage.setItem("babaUser", JSON.stringify(res.data.user));
      toast.success(`Welcome back, ${res.data.user.name}!`);
      
      // Redirect based on role
      const role = res.data.user.role;
      if (role === 'Agent') navigate("/my-properties");
      else if (role === 'Admin' || role === 'Company') navigate("/"); // Or dashboard
      else navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="loginPage">
      <motion.form
        className="loginCard"
        onSubmit={submitAuth}
        initial={{ opacity: 0, scale: 0.92, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <img src={logo} alt="Baba Homs" className="auth-logo" />
        <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>Login</h2>
        <p style={{ color: "#666", marginBottom: "25px", fontSize: "14px" }}>
          Welcome back! Please login to your account.
        </p>

        <input
          placeholder="Email Address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          style={{ marginBottom: "15px" }}
        />

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

        <div style={{ textAlign: "right", marginBottom: "20px", marginTop: "-10px" }}>
          <Link to="/forgot-password" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>
            Forgot Password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
          Don't have an account? <Link to="/register" style={{ color: "#1e293b", fontWeight: "600" }}>Register here</Link>
        </p>
      </motion.form>
    </section>
  );
};

export default AuthPage;
