// src/components/Layout/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo1 from "../../assets/Logo1.png"; // <-- use your new CCTV+Monitor logo


export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleDark = () => {
    const newTheme = dark ? "light" : "dark";
    setDark(!dark);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const NavItem = ({ to, label }) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
        location.pathname === to
          ? "bg-white/20 text-white shadow-sm"
          : "text-slate-100 hover:text-amber-300 hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 border-b border-white/10 backdrop-blur-md sticky top-0 z-50 shadow-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* ✅ Brand with logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-extrabold text-lg text-amber-200 tracking-wide drop-shadow-sm"
        >
          <img
            src={Logo1}
            alt="LabMonitor Pro Logo"
            className="h-12 w-12 object-contain shadow-md"
          />
          <span>LabMonitor Pro</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-white/10 transition relative w-8 h-8 flex items-center justify-center"
            title="Toggle Theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {dark ? (
                <motion.div
                  key="sun"
                  initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Sun size={18} className="text-amber-300" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ scale: 0.6, rotate: 45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.6, rotate: -45, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Moon size={18} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Navigation Links */}
          {user ? (
            <>
              <NavItem to="/admin" label="Admin" />
              <NavItem to="/timetable" label="Timetable" />
              <NavItem to="/reports" label="Reports" />
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm font-semibold 
                           bg-gradient-to-r from-emerald-500 to-teal-600 
                           hover:from-emerald-600 hover:to-teal-700 
                           text-white rounded-md shadow-sm transition"
              >
                Logout
              </button>
            </>
          ) : (
            <NavItem to="/login" label="Login" />
          )}
        </div>
      </div>
    </nav>
  );
}



// // src/components/Layout/Navbar.jsx
// import React, { useEffect, useState } from 'react'
// import { Link, useLocation } from 'react-router-dom'
// import { useAuth } from '../../context/AuthContext'
// import { Moon, Sun } from 'lucide-react'
// import { motion, AnimatePresence } from 'framer-motion'

// export default function Navbar() {
//   const { user, logout } = useAuth()
//   const location = useLocation()
//   const [dark, setDark] = useState(false)

//   // 🧩 On mount → apply stored theme
//   useEffect(() => {
//     const savedTheme = localStorage.getItem('theme')
//     if (savedTheme === 'dark') {
//       document.documentElement.classList.add('dark')
//       setDark(true)
//     }
//   }, [])

//   // 🌙 Toggle and save preference
//   const toggleDark = () => {
//     const newTheme = dark ? 'light' : 'dark'
//     setDark(!dark)
//     document.documentElement.classList.toggle('dark', newTheme === 'dark')
//     localStorage.setItem('theme', newTheme)
//   }

//   const NavItem = ({ to, label }) => (
//     <Link
//       to={to}
//       className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
//         location.pathname === to
//           ? 'bg-white/20 text-white shadow-sm'
//           : 'text-slate-100 hover:bg-white/10 hover:text-white'
//       }`}
//     >
//       {label}
//     </Link>
//   )

//   return (
//     <nav className="bg-gradient-to-r from-stone-700 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-stone-800 backdrop-blur-md border-b border-slate-700 shadow-md sticky top-0 z-50 transition-colors">
//       <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
//         {/* Brand */}
//         <Link
//           to="/dashboard"
//           className="font-extrabold text-lg text-amber-100 tracking-wide drop-shadow-sm"
//         >
//           LabMonitor Pro
//         </Link>

//         <div className="flex items-center gap-3">
//           {/* 🌙 / ☀️ Toggle */}
//           <button
//             onClick={toggleDark}
//             className="p-2 rounded-lg hover:bg-white/10 transition relative w-8 h-8 flex items-center justify-center"
//             title="Toggle Theme"
//           >
//             <AnimatePresence mode="wait" initial={false}>
//               {dark ? (
//                 <motion.div
//                   key="sun"
//                   initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
//                   animate={{ scale: 1, rotate: 0, opacity: 1 }}
//                   exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
//                   transition={{ duration: 0.3 }}
//                 >
//                   <Sun size={18} className="text-amber-300" />
//                 </motion.div>
//               ) : (
//                 <motion.div
//                   key="moon"
//                   initial={{ scale: 0.6, rotate: 45, opacity: 0 }}
//                   animate={{ scale: 1, rotate: 0, opacity: 1 }}
//                   exit={{ scale: 0.6, rotate: -45, opacity: 0 }}
//                   transition={{ duration: 0.3 }}
//                 >
//                   <Moon size={18} className="text-white" />
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </button>

//           {/* Navigation */}
//           {user ? (
//             <>
//               <NavItem to="/admin" label="Admin" />
//               <NavItem to="/timetable" label="Timetable" />
//               <NavItem to="/reports" label="Reports" />
//               <button
//                 onClick={logout}
//                 className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-sm transition dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600"
//               >
//                 Logout
//               </button>
//             </>
//           ) : (
//             <NavItem to="/login" label="Login" />
//           )}
//         </div>
//       </div>
//     </nav>
//   )
// }



