import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listLabs } from "../../services/labService";
import LabCard from "../../components/UI/LabCard";
import { MoreVertical } from "lucide-react";
import { useSocketStore } from "../../store/socketStore";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data } = useQuery({
    queryKey: ["labs"],
    queryFn: listLabs,
    staleTime: 1000 * 60 * 2,
  });

  const labs = data?.data || [];
  const connect = useSocketStore((s) => s.connect);
  const occupancy = useSocketStore((s) => s.occupancy);
  const connected = useSocketStore((s) => s.connected);

  useEffect(() => {
    connect();
  }, [connect]);

  const {
    totalStudents,
    totalLabs,
    activeCameras,
    totalCameras,
    systemHealth,
  } = useMemo(() => {
    const totalLabs = labs.length;
    const totalStudents = labs.reduce(
      (acc, lab) => acc + (occupancy[lab._id]?.peopleCount || 0),
      0
    );
    const totalCameras = totalLabs;
    const activeCameras = Object.keys(occupancy).length;
    const systemHealth = totalCameras
      ? Math.round((activeCameras / totalCameras) * 100)
      : 0;
    return { totalStudents, totalLabs, totalCameras, activeCameras, systemHealth };
  }, [labs, occupancy]);

  return (
    <div
      className="min-h-screen 
                    bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
                    p-8 text-slate-100 transition-colors"
    >
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-bold text-amber-200 drop-shadow-sm"
        >
          Dashboard
        </motion.h1>

        <span
          className={`text-sm px-4 py-1.5 rounded-full shadow-sm font-medium border ${
            connected
              ? "bg-teal-900/40 text-teal-300 border-teal-700/50"
              : "bg-red-900/40 text-red-400 border-red-700/50"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
        <SummaryCard title="Total Students" value={totalStudents} subtext="Across all labs" />
        <SummaryCard
          title="Camera Status"
          value={`${activeCameras}/${totalCameras}`}
          subtext="Cameras online"
          accent="text-teal-400"
        />
        <SystemHealthCard
          totalLabs={totalLabs}
          activeCameras={activeCameras}
          systemHealth={systemHealth}
        />
      </div>

      {/* Labs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-xl font-semibold text-slate-100 hover:text-amber-300 transition mb-2">
          Laboratory Overview
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Monitor lab occupancy, utilization, and system health in real time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {labs.map((lab) => (
            <LabCard key={lab._id} lab={lab} occupancy={occupancy[lab._id]} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// 🧮 SummaryCard styled like LabCard
function SummaryCard({ title, value, subtext, accent }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="relative bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl 
                 rounded-2xl p-5 shadow-md hover:shadow-2xl transition text-center"
    >
      <h3 className="font-semibold text-lg text-amber-200 mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${accent || "text-slate-100"}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </motion.div>
  );
}

// 💚 SystemHealthCard styled like LabCard
function SystemHealthCard({ totalLabs, activeCameras, systemHealth }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest(".health-card")) setOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="relative bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl 
                 rounded-2xl p-5 shadow-md hover:shadow-2xl transition text-center health-card"
    >
      <div className="flex justify-between items-start">
        <div className="text-sm text-slate-400">System Health</div>
        <button onClick={() => setOpen(!open)} className="hover:text-amber-300 transition">
          <MoreVertical size={16} className="text-slate-400" />
        </button>
      </div>

      <div
        className={`text-2xl font-bold mt-2 ${
          systemHealth >= 80
            ? "text-teal-400"
            : systemHealth >= 50
            ? "text-amber-400"
            : "text-red-400"
        }`}
      >
        {systemHealth}%
      </div>
      <div className="text-xs text-slate-400">Overall health</div>

      {/* Hover popup */}
      {open && (
        <div className="absolute right-2 top-12 bg-slate-900/95 text-white text-xs rounded-lg p-3 shadow-lg w-64 z-20 border border-white/10">
          <div className="text-slate-300 mb-2 font-semibold">System Health Details</div>
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td>Total Labs</td>
                <td>{totalLabs}</td>
              </tr>
              <tr>
                <td>Active</td>
                <td>{activeCameras}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>{systemHealth}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}


// // src/pages/Dashboard/Dashboard.jsx
// import React, { useEffect, useMemo, useState } from 'react'
// import { useQuery } from '@tanstack/react-query'
// import { listLabs } from '../../services/labService'
// import LabCard from '../../components/UI/LabCard'
// import { MoreVertical } from 'lucide-react'
// import { useSocketStore } from '../../store/socketStore'
// import { motion } from 'framer-motion'

// export default function Dashboard() {
//   const { data } = useQuery({
//     queryKey: ['labs'],
//     queryFn: listLabs,
//     staleTime: 1000 * 60 * 2,
//   })

//   const labs = data?.data || []
//   const connect = useSocketStore((s) => s.connect)
//   const occupancy = useSocketStore((s) => s.occupancy)
//   const connected = useSocketStore((s) => s.connected)

//   useEffect(() => {
//     connect()
//   }, [connect])

//   const { totalStudents, totalLabs, activeCameras, totalCameras, systemHealth } = useMemo(() => {
//     const totalLabs = labs.length
//     const totalStudents = labs.reduce(
//       (acc, lab) => acc + (occupancy[lab._id]?.peopleCount || 0),
//       0
//     )
//     const totalCameras = totalLabs
//     const activeCameras = Object.keys(occupancy).length
//     const systemHealth = totalCameras ? Math.round((activeCameras / totalCameras) * 100) : 0
//     return { totalStudents, totalLabs, totalCameras, activeCameras, systemHealth }
//   }, [labs, occupancy])

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-stone-50 via-slate-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
//       <div className="flex items-center justify-between mb-8">
//         <motion.h1
//           initial={{ y: -10, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           className="text-3xl font-bold text-stone-800 dark:text-slate-200"
//         >
//           Dashboard
//         </motion.h1>

//         <span
//           className={`text-sm px-4 py-1.5 rounded-full shadow-sm font-medium ${
//             connected
//               ? 'bg-teal-100 text-teal-700 dark:bg-teal-800/30 dark:text-teal-300'
//               : 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300'
//           }`}
//         >
//           {connected ? 'Connected' : 'Disconnected'}
//         </span>
//       </div>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
//         <SummaryCard title="Total Students" value={totalStudents} subtext="Across all labs" />
//         <SummaryCard
//           title="Camera Status"
//           value={`${activeCameras}/${totalCameras}`}
//           subtext="Cameras online"
//           accent="text-teal-700 dark:text-teal-400"
//         />
//         <SystemHealthCard
//           totalLabs={totalLabs}
//           activeCameras={activeCameras}
//           systemHealth={systemHealth}
//         />
//       </div>

//       {/* Labs */}
//       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
//         <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
//           Laboratory Overview
//         </h2>
//         <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
//           Monitor lab occupancy, utilization, and system health in real time.
//         </p>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           {labs.map((lab) => (
//             <LabCard key={lab._id} lab={lab} occupancy={occupancy[lab._id]} />
//           ))}
//         </div>
//       </motion.div>
//     </div>
//   )
// }

// // Subcomponents
// function SummaryCard({ title, value, subtext, accent }) {
//   return (
//     <motion.div
//       whileHover={{ scale: 1.03 }}
//       className="p-5 bg-white/70 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-md hover:shadow-xl transition text-center"
//     >
//       <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
//       <div className={`text-2xl font-bold mt-1 ${accent || 'text-stone-700 dark:text-slate-200'}`}>
//         {value}
//       </div>
//       <div className="text-xs text-slate-400 mt-1">{subtext}</div>
//     </motion.div>
//   )
// }

// function SystemHealthCard({ totalLabs, activeCameras, systemHealth }) {
//   const [open, setOpen] = useState(false)

//   useEffect(() => {
//     const handleClick = (e) => {
//       if (!e.target.closest('.health-card')) setOpen(false)
//     }
//     document.addEventListener('click', handleClick)
//     return () => document.removeEventListener('click', handleClick)
//   }, [])

//   return (
//     <motion.div
//       whileHover={{ scale: 1.03 }}
//       className="relative p-5 bg-white/70 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-md text-center health-card transition hover:shadow-xl"
//     >
//       <div className="flex justify-between items-start">
//         <div className="text-sm text-slate-500 dark:text-slate-400">System Health</div>
//         <button onClick={() => setOpen(!open)} className="hover:text-slate-600">
//           <MoreVertical size={16} className="text-slate-400" />
//         </button>
//       </div>

//       <div
//         className={`text-2xl font-bold mt-1 ${
//           systemHealth >= 80
//             ? 'text-teal-600 dark:text-teal-400'
//             : systemHealth >= 50
//             ? 'text-amber-600 dark:text-amber-400'
//             : 'text-red-500 dark:text-red-400'
//         }`}
//       >
//         {systemHealth}%
//       </div>
//       <div className="text-xs text-slate-400">Overall health</div>

//       {open && (
//         <div className="absolute right-2 top-12 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-lg w-64 z-20">
//           <div className="text-slate-300 mb-2 font-semibold">System Health Details</div>
//           <table className="w-full text-left border-collapse">
//             <tbody>
//               <tr>
//                 <td>Total Labs</td>
//                 <td>{totalLabs}</td>
//               </tr>
//               <tr>
//                 <td>Active</td>
//                 <td>{activeCameras}</td>
//               </tr>
//               <tr>
//                 <td>Status</td>
//                 <td>{systemHealth}%</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       )}
//     </motion.div>
//   )
// }


