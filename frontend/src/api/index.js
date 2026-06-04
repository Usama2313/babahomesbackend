import axios from "axios";
import toast from "react-hot-toast";
import React from "react";
import InvalidTokenToast from "../components/InvalidTokenToast.jsx";
import OfflineBanner from "../components/OfflineBanner.jsx";

let dbErrorShown = false;

const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return "http://localhost:5000/api";
  }
  return import.meta.env.VITE_API_URL || "https://babahomesbackend.vercel.app/api";
};

const baseURL = getBaseURL();

const API = axios.create({
  baseURL,
  headers: {
    "bypass-tunnel-reminder": "true",
  },
});

// Request interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("babaToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
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
      const errorMsg = error.message || '';
const isConnectionError = (error.response && error.response.status >= 500) || errorMsg.toLowerCase().includes('failed') || errorMsg.toLowerCase().includes('network');
      if (isConnectionError) {
        console.log('🔔 OfflineBanner triggered');
        toast.custom(
          (t) => React.createElement(OfflineBanner, { t }),
          { duration: 10000, style: { background: 'transparent' } }
        );
      } else {
        toast.error(message);
      }
    }

    if (error.response?.status === 401) {
      toast.custom(
        (t) => React.createElement(InvalidTokenToast, { t }),
        { duration: 8000, style: { background: "transparent" } }
      );
    }

    return Promise.reject(error);
  }
);

export default API;