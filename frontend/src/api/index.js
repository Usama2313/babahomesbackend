import axios from "axios";
import toast from "react-hot-toast";

const getBaseURL = () => {
  return import.meta.env.VITE_API_URL || "https://babahomesbackend.vercel.app/api";
};

const baseURL = getBaseURL();

const API = axios.create({
  baseURL,
  headers: {
    "bypass-tunnel-reminder": "true"
  }
});




// Request Interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("babaToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for global error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong!";

    console.error("[API Error Details]:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
    });

    if (!error.config?.skipToast) {
      toast.error(message);
    }

    if (error.response?.status === 401) {
      // Show custom toast for invalid token with WhatsApp link
      toast.error('Token is not valid – please log in again. ' +
        `<a href="https://wa.me/973322271249" target="_blank" style="color:#1e90ff; text-decoration:underline;">WhatsApp +973322271249</a>`);
      // Optionally clear auth data
      // localStorage.removeItem('babaToken');
      // window.location.href = '/login';
    }
    // localStorage.clear();
    // window.location.href = "/login";

    return Promise.reject(error);
  }
);

export default API;