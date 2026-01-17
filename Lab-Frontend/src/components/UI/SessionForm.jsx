import React, { useState } from "react";
import { createSession } from "../../services/sessionService";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Calendar, Clock, Settings2 } from "lucide-react";

export default function SessionForm({ lab }) {
  const [form, setForm] = useState({
    labId: lab?._id || "",
    startTime: "",
    endTime: "",
    numberOfDetections: 15,
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createSession({
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      toast.success("Session created!");
      setForm({ ...form, startTime: "", endTime: "" });
    } catch {
      toast.error("Failed to create session");
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl 
                 bg-slate-900/80 dark:bg-slate-900/85 
                 border border-white/10 backdrop-blur-lg 
                 shadow-[0_0_25px_-8px_rgba(0,0,0,0.6)]
                 transition-all duration-300"
    >
      <h3 className="text-lg font-semibold text-amber-100 mb-4 drop-shadow-sm">
        Schedule New Session
      </h3>

      {/* Time Inputs */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4 text-emerald-400" /> Start Time
          </label>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full mt-1 p-2.5 rounded-lg border border-slate-700/70 
                       bg-slate-900/90 text-slate-100 
                       focus:ring-2 focus:ring-emerald-500 outline-none 
                       transition"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4 text-emerald-400" /> End Time
          </label>
          <input
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="w-full mt-1 p-2.5 rounded-lg border border-slate-700/70 
                       bg-slate-900/90 text-slate-100 
                       focus:ring-2 focus:ring-emerald-500 outline-none 
                       transition"
          />
        </div>
      </div>

      {/* Detection Count */}
      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <Settings2 className="w-4 h-4 text-emerald-400" /> Detections
        </label>
        <input
          type="number"
          min="1"
          value={form.numberOfDetections}
          onChange={(e) =>
            setForm({ ...form, numberOfDetections: +e.target.value })
          }
          className="w-full mt-1 p-2.5 rounded-lg border border-slate-700/70 
                     bg-slate-900/90 text-slate-100 
                     focus:ring-2 focus:ring-emerald-500 outline-none 
                     transition"
        />
      </div>

      {/* Submit */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        type="submit"
        className="mt-6 w-full px-6 py-2.5 
                   bg-gradient-to-r from-emerald-500 to-teal-600 
                   hover:from-emerald-600 hover:to-teal-700 
                   text-white font-semibold rounded-lg 
                   shadow-md hover:shadow-lg 
                   transition-all"
      >
        Create Session
      </motion.button>
    </motion.form>
  );
}


// import React, { useState } from "react";
// import { createSession } from "../../services/sessionService";
// import toast from "react-hot-toast";
// import { motion } from "framer-motion";
// import { Calendar, Clock, Settings2 } from "lucide-react";

// export default function SessionForm({ lab }) {
//   const [form, setForm] = useState({
//     labId: lab?._id || "",
//     labName: lab?.name || "",
//     startTime: "",
//     endTime: "",
//     numberOfDetections: 15,
//     detectionFrequency: 60,
//     enablePhoneDetection: false,
//   });

//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         ...form,
//         startTime: new Date(form.startTime).toISOString(),
//         endTime: new Date(form.endTime).toISOString(),
//         detectionFrequency: 60,
//         enablePhoneDetection: false,
//       };

//       await createSession(payload);
//       toast.success("Session created successfully!");

//       setForm({
//         ...form,
//         startTime: "",
//         endTime: "",
//         numberOfDetections: 15,
//       });
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to create session");
//     }
//   };

//   return (
//     <motion.form
//       onSubmit={submit}
//       initial={{ opacity: 0, y: 15 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.4 }}
//       className="p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700
//                  bg-white/60 dark:bg-slate-800/70 backdrop-blur-md
//                  max-w-lg mx-auto"
//     >
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
//         Schedule a New Session
//       </h3>
//       <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
//         Set session timing for{" "}
//         <span className="font-semibold text-emerald-600 dark:text-emerald-400">
//           {lab?.name}
//         </span>
//         .
//       </p>

//       {/* Time Inputs */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//         <div>
//           <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
//             <Calendar className="w-4 h-4 text-emerald-500" /> Start Time
//           </label>
//           <input
//             type="datetime-local"
//             value={form.startTime}
//             onChange={(e) => setForm({ ...form, startTime: e.target.value })}
//             className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 dark:border-slate-600
//                        bg-white/70 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
//           />
//         </div>

//         <div>
//           <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
//             <Clock className="w-4 h-4 text-emerald-500" /> End Time
//           </label>
//           <input
//             type="datetime-local"
//             value={form.endTime}
//             onChange={(e) => setForm({ ...form, endTime: e.target.value })}
//             className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 dark:border-slate-600
//                        bg-white/70 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
//           />
//         </div>
//       </div>

//       {/* Detection Config */}
//       <div className="mt-4">
//         <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
//           <Settings2 className="w-4 h-4 text-emerald-500" /> Number of Detections
//         </label>
//         <input
//           type="number"
//           min="1"
//           value={form.numberOfDetections}
//           onChange={(e) =>
//             setForm({ ...form, numberOfDetections: +e.target.value })
//           }
//           className="w-full mt-1 p-2.5 rounded-lg border border-gray-300 dark:border-slate-600
//                      bg-white/70 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
//         />
//       </div>

//       {/* Submit Button */}
//       <motion.button
//         whileHover={{ scale: 1.03 }}
//         whileTap={{ scale: 0.98 }}
//         type="submit"
//         className="mt-6 w-full sm:w-auto px-6 py-2.5
//                    bg-gradient-to-r from-emerald-500 to-teal-500
//                    text-white font-medium rounded-lg shadow-md hover:shadow-lg
//                    hover:from-emerald-600 hover:to-teal-600 transition-all"
//       >
//         Create Session
//       </motion.button>
//     </motion.form>
//   );
// }

