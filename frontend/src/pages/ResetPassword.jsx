import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";
import logo from "../assets/Logo of Baba Homes.jpeg";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    try {
      setLoading(true);
      await API.post("/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      // Handled by API interceptor
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

        {!success ? (
          <>
            <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>Reset Password</h2>
            <p style={{ color: "#666", marginBottom: "25px", fontSize: "14px" }}>
              Please enter your new password below.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <input
                  placeholder="New Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: "45px" }}
                />
                <Lock size={18} style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#888", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ position: "relative", marginBottom: "25px" }}>
                <input
                  placeholder="Confirm New Password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingLeft: "45px" }}
                />
                <Lock size={18} style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle size={60} color="#10b981" style={{ marginBottom: "20px" }} />
            <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>Success!</h2>
            <p style={{ color: "#666", fontSize: "14px" }}>
              Your password has been reset. Redirecting to login...
            </p>
            <Link to="/login" className="auth-submit-btn" style={{ display: "block", marginTop: "20px", textDecoration: "none" }}>
              Login Now
            </Link>
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default ResetPassword;
