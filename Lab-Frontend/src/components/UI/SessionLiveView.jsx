import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Camera } from "lucide-react";

export default function SessionLiveView({ labId, capacity }) {
  const queryClient = useQueryClient();
  const data = queryClient.getQueryData(["live-detection", labId]);
  const frames = data?.detections || [];
  const [index, setIndex] = useState(0);
  const [backupFrames, setBackupFrames] = useState([]);

  // 🧠 Keep backup to prevent flicker
  useEffect(() => {
    if (frames.length > 0) setBackupFrames(frames);
  }, [frames]);

  const activeFrames = frames.length > 0 ? frames : backupFrames;

  // ⏱️ Auto-slide every 3s
  useEffect(() => {
    if (!activeFrames.length) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % activeFrames.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeFrames]);

  const frame = activeFrames[index] || data?.latestFrame;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 rounded-2xl bg-slate-900/85 border border-white/10
                 backdrop-blur-lg shadow-[0_0_25px_-8px_rgba(0,0,0,0.6)]
                 transition-all duration-300"
    >
      <h3 className="font-semibold mb-3 text-lg text-amber-100 flex items-center gap-2 drop-shadow-sm">
        <Camera className="text-emerald-400" />
        Live Camera Feed
        <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded animate-pulse">
          ● LIVE
        </span>
      </h3>

      {frame ? (
        <div className="relative rounded-xl overflow-hidden">
          {/* Animated image transition */}
          <AnimatePresence mode="wait">
            <motion.img
              key={frame.timestamp}
              src={`${frame.imagePath || frame.imageUrl}?t=${Date.now()}`}
              alt="Live Detection"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="w-full h-64 object-cover rounded-xl"
            />
          </AnimatePresence>

          {/* Subtle scan flicker & gradient */}
          <div className="absolute inset-0 bg-black/15 animate-[flicker_1.5s_infinite_alternate]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-repeat [background-size:100%_2px] opacity-15 pointer-events-none" />

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-black/40">
            <motion.div
              key={index}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "linear" }}
              className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400"
            />
          </div>

          {/* Footer info */}
          <div className="absolute bottom-0 w-full bg-black/60 text-white p-2 text-sm flex justify-between">
            <span>{new Date(frame.timestamp).toLocaleTimeString()}</span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={frame.peopleCount}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                👥 {frame.peopleCount}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="w-full h-64 flex items-center justify-center text-slate-400 text-sm bg-slate-900/70 rounded-xl border border-white/10">
          Waiting for live feed...
        </div>
      )}
    </motion.div>
  );
}


// import React, { useEffect, useState } from "react";
// import { useQueryClient } from "@tanstack/react-query";
// import { motion, AnimatePresence } from "framer-motion";

// export default function SessionLiveView({ labId, capacity }) {
//   const queryClient = useQueryClient();
//   const data = queryClient.getQueryData(["live-detection", labId]);
//   const frames = data?.detections || [];
//   const [index, setIndex] = useState(0);
//   const [backupFrames, setBackupFrames] = useState([]);

//   // 🧠 Keep a local backup of frames to avoid “Waiting...” flicker
//   useEffect(() => {
//     if (frames.length > 0) {
//       setBackupFrames(frames);
//     }
//   }, [frames]);

//   const activeFrames = frames.length > 0 ? frames : backupFrames;

//   // ⏱️ Auto-slide every 3s (loops through available frames)
//   useEffect(() => {
//     if (!activeFrames.length) return;
//     const interval = setInterval(() => {
//       setIndex((prev) => (prev + 1) % activeFrames.length);
//     }, 3000);
//     return () => clearInterval(interval);
//   }, [activeFrames]);

//   const frame = activeFrames[index] || data?.latestFrame;

//   return (
//     <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md transition-all">
//       <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
//         Live Camera Feed
//         <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded animate-pulse">
//           ● LIVE
//         </span>
//       </h3>

//       {frame ? (
//         <div className="relative rounded-xl overflow-hidden">
//           {/* Animated image transition */}
//           <AnimatePresence mode="wait">
//             <motion.img
//               key={frame.timestamp}
//               src={`${frame.imagePath || frame.imageUrl}?t=${Date.now()}`}
//               alt="Live Detection"
//               initial={{ opacity: 0, scale: 1.02 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.98 }}
//               transition={{ duration: 0.7, ease: "easeInOut" }}
//               className="w-full h-64 object-cover rounded-xl"
//             />
//           </AnimatePresence>

//           {/* Visual scan/flicker overlays */}
//           <div className="absolute inset-0 bg-black/5 animate-[flicker_1.5s_infinite_alternate]" />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-repeat [background-size:100%_2px] opacity-20 pointer-events-none" />

//           {/* Progress bar showing slide time */}
//           <div className="absolute bottom-0 left-0 w-full h-1 bg-black/40">
//             <motion.div
//               key={index}
//               initial={{ width: "0%" }}
//               animate={{ width: "100%" }}
//               transition={{ duration: 3, ease: "linear" }}
//               className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400"
//             />
//           </div>

//           {/* Footer details */}
//           <div className="absolute bottom-0 w-full bg-black/60 text-white p-2 text-sm flex justify-between">
//             <span>{new Date(frame.timestamp).toLocaleTimeString()}</span>
//             <AnimatePresence mode="popLayout">
//               <motion.span
//                 key={frame.peopleCount}
//                 initial={{ opacity: 0, y: 5 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -5 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 👥 {frame.peopleCount} 
//               </motion.span>
//             </AnimatePresence>
//           </div>
//         </div>
//       ) : (
//         <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm bg-slate-100 dark:bg-slate-700 rounded-xl">
//           Waiting for live feed...
//         </div>
//       )}
//     </div>
//   );
// }

