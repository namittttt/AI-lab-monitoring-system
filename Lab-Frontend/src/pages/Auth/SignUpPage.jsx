import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import bgImage from "../../assets/login1.webp";
import logoImage from "../../assets/login.webp";

export default function SignUpPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password)
      return toast.error("Please fill all fields");

    try {
      setLoading(true);
      await signup(form);
      toast.success("Signup successful!");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      setErrors({ form: msg });
      toast.error("Signup failed");
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
            Create Your Account
          </h2>

          {errors.form && (
            <div className="text-red-400 mb-3 text-sm">{errors.form}</div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block mb-1 text-slate-300">Full Name</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-3 py-2 rounded-lg border border-slate-700 
                           bg-slate-900/70 text-slate-200
                           focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 text-slate-300">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Create a password"
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
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          <p className="text-sm text-center mt-5 text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
