import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import API from "../api";
import logo from "../assets/Logo of Baba Homes.jpeg";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      // API interceptor handles the toast error
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="loginPage">
      <motion.div
        className="loginCard"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <img src={logo} alt="Baba Homs" className="auth-logo" />

        {!submitted ? (
          <>
            <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>Forgot Password?</h2>
            <p style={{ color: "#666", marginBottom: "25px", fontSize: "14px" }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <input
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: "45px" }}
                />
                <Mail size={18} style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle size={60} color="#10b981" style={{ marginBottom: "20px" }} />
            <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>Check Your Email</h2>
            <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
              If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
          </div>
        )}

        <Link to="/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "25px", color: "#64748b", fontSize: "14px", textDecoration: "none" }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </motion.div>
    </section>
  );
};

export default ForgotPassword;
