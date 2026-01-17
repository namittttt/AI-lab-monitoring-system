// src/components/UI/LabCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Users, Activity, Video } from "lucide-react";
import { motion } from "framer-motion";

export default function LabCard({ lab, occupancy }) {
  const currentStudents = occupancy?.peopleCount ?? 0;
  const percent = occupancy?.occupancyPercent
    ? Math.round(occupancy.occupancyPercent)
    : Math.round((currentStudents / lab.capacity) * 100);

  const statusColor =
    percent > 75 ? "bg-red-500" : percent > 50 ? "bg-amber-600" : "bg-teal-600";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl 
                 rounded-2xl p-5 shadow-md hover:shadow-2xl transition"
    >
      <div className="absolute top-4 right-4">
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${
            occupancy
              ? "bg-teal-900/40 text-teal-300 border border-teal-700/50"
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50"
          }`}
        >
          {occupancy ? "Active" : "Inactive"}
        </span>
      </div>

      <h3 className="font-semibold text-lg text-amber-200 mb-1">{lab.name}</h3>
      <p className="text-sm text-slate-400 mb-4">Capacity: {lab.capacity}</p>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Users size={16} />
          <span>{currentStudents} students</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Activity size={16} />
          <span>{percent}% utilization</span>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
        <div className={`h-2 rounded-full ${statusColor}`} style={{ width: `${percent}%` }} />
      </div>

      <div className="flex justify-between items-center">
        <Link
          to={`/labs/${lab._id}`}
          className="px-4 py-1.5 text-sm font-semibold 
                     bg-gradient-to-r from-emerald-500 to-teal-600 
                     hover:from-emerald-600 hover:to-teal-700 
                     text-white rounded-lg shadow-md transition"
        >
          View
        </Link>
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Video size={14} /> Live feed
        </div>
      </div>
    </motion.div>
  );
}



// // src/components/UI/LabCard.jsx
// import React from 'react'
// import { Link } from 'react-router-dom'
// import { Users, Activity, Video } from 'lucide-react'
// import { motion } from 'framer-motion'

// export default function LabCard({ lab, occupancy }) {
//   const currentStudents = occupancy?.peopleCount ?? 0
//   const percent = occupancy?.occupancyPercent
//     ? Math.round(occupancy.occupancyPercent)
//     : Math.round((currentStudents / lab.capacity) * 100)

//   const statusColor =
//     percent > 75 ? 'bg-red-500' : percent > 50 ? 'bg-amber-600' : 'bg-teal-600'

//   return (
//     <motion.div
//       whileHover={{ scale: 1.02 }}
//       className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-md hover:shadow-xl transition"
//     >
//       <div className="absolute top-4 right-4">
//         <span
//           className={`text-xs px-3 py-1 rounded-full font-medium ${
//             occupancy ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'
//           }`}
//         >
//           {occupancy ? 'Active' : 'Inactive'}
//         </span>
//       </div>

//       <h3 className="font-semibold text-lg text-slate-800 dark:text-white mb-1">
//         {lab.name}
//       </h3>
//       <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
//         Capacity: {lab.capacity}
//       </p>

//       <div className="flex items-center justify-between mb-3">
//         <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
//           <Users size={16} />
//           <span>{currentStudents} students</span>
//         </div>
//         <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
//           <Activity size={16} />
//           <span>{percent}% utilization</span>
//         </div>
//       </div>

//       <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
//         <div className={`h-2 rounded-full ${statusColor}`} style={{ width: `${percent}%` }} />
//       </div>

//       <div className="flex justify-between items-center">
//         <Link
//           to={`/labs/${lab._id}`}
//           className="px-4 py-1.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition"
//         >
//           View
//         </Link>
//         <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
//           <Video size={14} /> Live feed
//         </div>
//       </div>
//     </motion.div>
//   )
// }


