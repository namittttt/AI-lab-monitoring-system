import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../../lib/axiosClient";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import bgImage from "../../assets/login1.webp";
import logoImage from "../../assets/login.webp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { fetchMe } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("All fields are required");

    try {
      setLoading(true);
      await axios.post("/auth/login", form, { withCredentials: true });
      toast.success("Login successful!");
      await fetchMe();
      setTimeout(() => navigate("/dashboard"), 300);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden text-slate-200">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${bgImage})`,
          filter: "blur(4px)",
          transform: "scale(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* Form Card (split layout) */}
      <div
        className="relative z-10 flex flex-col md:flex-row w-full max-w-4xl rounded-2xl overflow-hidden
                   bg-white/10 dark:bg-slate-800/60 border border-white/10
                   backdrop-blur-xl shadow-[0_0_25px_-8px_rgba(0,0,0,0.7)] transition-all duration-300"
      >
        {/* Left Image Section */}
        <div className="hidden md:block md:w-1/2 relative">
          <img
            src={logoImage}
            alt="LabMonitor Pro Illustration"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-emerald-500/10" />
        </div>

        {/* Right Form Section */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-6 text-center text-amber-100">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-1 text-slate-300">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 
                           bg-slate-900/70 text-slate-200
                           focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 text-slate-300">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 
                           bg-slate-900/70 text-slate-200
                           focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 font-semibold rounded-lg text-white 
                         bg-gradient-to-r from-emerald-500 to-teal-500
                         hover:from-emerald-600 hover:to-teal-600 
                         shadow-md hover:shadow-lg transition-all duration-300"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-sm text-center mt-5 text-slate-400">
            Don’t have an account?{" "}
            <Link
              to="/signup"
              className="text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
