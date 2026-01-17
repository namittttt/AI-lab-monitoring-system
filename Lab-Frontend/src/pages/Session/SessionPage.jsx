import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSession, getOccupancy } from "../../services/sessionService";
import { useSocketStore } from "../../store/socketStore";
import { Loader2, CalendarDays, RefreshCcw } from "lucide-react";

function formatDate(dateStr, fallback = "N/A") {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
}

export default function SessionPage() {
  const { sessionId } = useParams();
  const { connect, occupancy, detections: socketDetections } = useSocketStore();

  const [cachedDetections, setCachedDetections] = useState([]);
  const [cachedOccupancy, setCachedOccupancy] = useState({});
  const [sessionOcc, setSessionOcc] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => connect(), [connect]);

  const {
    data: sessionRes,
    isPending: sessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSession(sessionId),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
    staleTime: 5 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
  });

  const {
    data: occRes,
    isPending: occLoading,
    refetch: refetchOcc,
  } = useQuery({
    queryKey: ["occupancy", sessionId],
    queryFn: () => getOccupancy(sessionId),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
    staleTime: 5 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
  });

  const session = sessionRes?.data?.data || {};
  const backendDetections = sessionRes?.detections || [];
  const lab = session?.lab;
  const labId = lab?._id;
  const labCapacity = lab?.capacity > 0 ? lab.capacity : 1;

  useEffect(() => {
    const det = localStorage.getItem(`session_${sessionId}_detections`);
    const occ = localStorage.getItem(`session_${sessionId}_occupancy`);
    if (det) {
      try {
        setCachedDetections(JSON.parse(det));
      } catch {
        setCachedDetections([]);
      }
    }
    if (occ) {
      try {
        setCachedOccupancy(JSON.parse(occ));
      } catch {
        setCachedOccupancy({});
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (!socketDetections?.length) return;

    const sessionLive = socketDetections
      .filter((d) => d?.sessionId === sessionId)
      .map((d) => ({
        ...d,
        timestamp: d.timestamp || new Date().toISOString(),
      }));

    if (!sessionLive.length) return;

    setCachedDetections((prev) => {
      const existingKeys = new Set(
        prev.map(
          (item) => `${item.timestamp}-${item.imageUrl || item.imagePath}`
        )
      );

      const newOnes = sessionLive.filter(
        (d) => !existingKeys.has(`${d.timestamp}-${d.imageUrl || d.imagePath}`)
      );

      if (newOnes.length === 0) return prev;

      const merged = [...newOnes, ...prev];
      const sliced = merged.length > 20 ? merged.slice(0, 20) : merged;

      try {
        localStorage.setItem(
          `session_${sessionId}_detections`,
          JSON.stringify(sliced)
        );
      } catch (err) {
        console.error("Failed to save detections:", err);
      }

      return sliced;
    });
  }, [socketDetections, sessionId]);

  useEffect(() => {
    if (!labId || !occupancy[labId]) return;

    const current = occupancy[labId];
    const peopleCount = current?.peopleCount ?? 0;
    const occPercent =
      typeof current?.occupancyPercent === "number"
        ? Math.round(current.occupancyPercent)
        : Math.round((peopleCount / labCapacity) * 100);

    const occData = {
      peopleCount,
      occupancyPercent: occPercent,
      timestamp: new Date().toISOString(),
    };

    setSessionOcc(occPercent);
    setCachedOccupancy(occData);
    localStorage.setItem(
      `session_${sessionId}_occupancy`,
      JSON.stringify(occData)
    );
  }, [labId, occupancy, labCapacity, sessionId]);

  const mergedDetections = useMemo(() => {
    const all = [...cachedDetections, ...backendDetections];
    const unique = Array.from(
      new Map(
        all.map((item) => [
          `${item.timestamp}-${item.imageUrl || item.imagePath}`,
          item,
        ])
      ).values()
    );
    return unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [cachedDetections, backendDetections]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSession(), refetchOcc()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  if (sessionLoading || occLoading)
    return (
      <div className="flex items-center justify-center h-60 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading session...
      </div>
    );

  const intervals = [
    { label: "Off", value: 0 },
    { label: "30 sec", value: 30000 },
    { label: "1 min", value: 60000 },
    { label: "2 min", value: 120000 },
  ];

  const finalOccPercent = sessionOcc || cachedOccupancy?.occupancyPercent || 0;
  const finalPeopleCount = cachedOccupancy?.peopleCount || 0;

  return (
    <div className="space-y-8 text-slate-200">
      <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-2">
        <CalendarDays className="text-emerald-400" />
        Session Details
      </h1>

      {/* 🔁 Auto-refresh controls */}
      <div
        className="flex items-center flex-wrap gap-3 p-4 rounded-2xl 
                   bg-slate-900/85 border border-white/10 backdrop-blur-lg shadow-lg"
      >
        <label className="font-medium text-slate-300">Auto-refresh:</label>
        <select
          className="border border-slate-700 bg-slate-900/80 text-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={autoRefreshEnabled ? refreshInterval : 0}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val === 0) setAutoRefreshEnabled(false);
            else {
              setAutoRefreshEnabled(true);
              setRefreshInterval(val);
            }
          }}
        >
          {intervals.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-3 py-1 rounded font-medium text-sm transition ${
            isRefreshing
              ? "bg-slate-700 text-slate-400 cursor-wait"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
          }`}
        >
          <RefreshCcw className="w-4 h-4" />
          {isRefreshing ? "Refreshing…" : "Refresh Now"}
        </button>

        <span
          className={`text-xs px-2 py-1 rounded ${
            autoRefreshEnabled
              ? "bg-emerald-900/40 text-emerald-300"
              : "bg-slate-800/60 text-slate-400"
          }`}
        >
          {autoRefreshEnabled
            ? `Every ${refreshInterval / 1000}s`
            : "Auto-refresh off"}
        </span>
      </div>

      {/* 🧾 Session Info */}
      <div
        className="p-6 rounded-2xl bg-slate-900/85 border border-white/10 
                   backdrop-blur-lg shadow-md"
      >
        <h2 className="text-lg font-semibold text-emerald-400 mb-3">
          Session Information
        </h2>
        <div className="space-y-1 text-slate-300">
          <div>
            <strong>Lab:</strong> {lab?.labName || lab?.name || "Unknown"}
          </div>
          <div>
            <strong>Start:</strong> {formatDate(session?.startTime, "N/A")}
          </div>
          <div>
            <strong>End:</strong>{" "}
            {session?.endTime
              ? formatDate(session.endTime, "Invalid Date")
              : "Ongoing"}
          </div>
          <div>
            <strong>Total Detections:</strong> {mergedDetections.length}
          </div>
          <div>
            <strong>Occupancy:</strong> {finalPeopleCount} students (
            {finalOccPercent}%)
          </div>
        </div>
      </div>

      {/* 🧍 Detection History */}
      <div
        className="p-6 rounded-2xl bg-slate-900/85 border border-white/10 
                   backdrop-blur-lg shadow-md"
      >
        <h3 className="text-lg font-semibold text-amber-100 mb-4">
          Detection History
        </h3>

        {mergedDetections.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mergedDetections.map((d, index) => {
              const imgSrc = d.imageUrl?.startsWith("http")
                ? d.imageUrl
                : d.imagePath
                ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${d.imagePath}`
                : "/placeholder.png";

              const occUtil =
                typeof d.occupancyPercent === "number"
                  ? Math.round(d.occupancyPercent)
                  : typeof d.peopleCount === "number"
                  ? Math.round((d.peopleCount / labCapacity) * 100)
                  : finalOccPercent;

              const people = d.peopleCount ?? finalPeopleCount;

              return (
                <div
                  key={`${d.timestamp}-${d.imageUrl || d.imagePath}`}
                  className="group relative rounded-xl overflow-hidden border border-slate-700/60 
                             bg-slate-900/90 hover:bg-slate-800/80 shadow-[0_0_15px_-8px_rgba(0,0,0,0.5)] 
                             transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedIndex(index)}
                >
                  <img
                    src={imgSrc}
                    alt="Detection"
                    className="object-cover w-full h-40 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => (e.target.src = "/placeholder.png")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
                    <p className="text-white text-xs">
                      <strong>Time:</strong> {formatDate(d.timestamp)}
                    </p>
                    <p className="text-white text-xs">
                      <strong>People:</strong> {people} | <strong>Util:</strong>{" "}
                      {occUtil}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">
            No detections recorded.
          </p>
        )}

        {/* 🔍 Modal Viewer */}
        {selectedIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-5 right-5 text-white text-3xl"
            >
              ✕
            </button>

            <button
              onClick={() =>
                setSelectedIndex(
                  (selectedIndex - 1 + mergedDetections.length) %
                    mergedDetections.length
                )
              }
              className="absolute left-5 text-white text-3xl"
            >
              ❮
            </button>

            <button
              onClick={() =>
                setSelectedIndex(
                  (selectedIndex + 1) % mergedDetections.length
                )
              }
              className="absolute right-5 text-white text-3xl"
            >
              ❯
            </button>

            <div className="max-w-4xl w-full flex flex-col items-center">
              <img
                src={
                  mergedDetections[selectedIndex].imageUrl?.startsWith("http")
                    ? mergedDetections[selectedIndex].imageUrl
                    : mergedDetections[selectedIndex].imagePath
                    ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${mergedDetections[selectedIndex].imagePath}`
                    : "/placeholder.png"
                }
                alt="Zoomed Detection"
                className="rounded max-h-[80vh] object-contain"
              />
              <p className="text-gray-300 text-sm mt-3">
                {formatDate(mergedDetections[selectedIndex].timestamp)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// import React, { useEffect, useState, useMemo } from "react";
// import { useParams } from "react-router-dom";
// import { useQuery } from "@tanstack/react-query";
// import { motion } from "framer-motion";
// import { getSession, getOccupancy } from "../../services/sessionService";
// import { useSocketStore } from "../../store/socketStore";
// import { RefreshCcw, Users, Activity } from "lucide-react";

// function formatDate(dateStr, fallback = "N/A") {
//   if (!dateStr) return fallback;
//   const d = new Date(dateStr);
//   if (isNaN(d.getTime())) return fallback;
//   return d.toLocaleString();
// }

// export default function SessionPage() {
//   const { sessionId } = useParams();
//   const { connect, occupancy, detections: socketDetections } = useSocketStore();

//   const [cachedDetections, setCachedDetections] = useState([]);
//   const [cachedOccupancy, setCachedOccupancy] = useState({});
//   const [sessionOcc, setSessionOcc] = useState(0);
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   useEffect(() => connect(), [connect]);

//   const { data: sessionRes, isPending: sessionLoading } = useQuery({
//     queryKey: ["session", sessionId],
//     queryFn: () => getSession(sessionId),
//   });

//   const session = sessionRes?.data?.data || {};
//   const lab = session?.lab;
//   const labCapacity = lab?.capacity > 0 ? lab.capacity : 1;

//   useEffect(() => {
//     if (!occupancy[lab?._id]) return;
//     const current = occupancy[lab._id];
//     const percent = Math.round(
//       (current.peopleCount / labCapacity) * 100 || 0
//     );
//     setSessionOcc(percent);
//     setCachedOccupancy(current);
//   }, [occupancy, lab, labCapacity]);

//   const mergedDetections = useMemo(() => cachedDetections, [cachedDetections]);

//   if (sessionLoading) return <div>Loading...</div>;

//   return (
//     <div
//       className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
//                  text-slate-100 p-8 transition-colors"
//     >
//       <motion.div
//         initial={{ opacity: 0, y: -10 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="flex items-center justify-between mb-6"
//       >
//         <h1 className="text-3xl font-bold text-amber-200 flex items-center gap-2">
//           <Users className="text-emerald-400" /> Session Details
//         </h1>
//         <button
//           onClick={() => setIsRefreshing(true)}
//           className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 
//                      rounded-lg text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition"
//         >
//           <RefreshCcw size={16} /> Refresh
//         </button>
//       </motion.div>

//       <div className="p-6 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg mb-8">
//         <p>
//           <strong>Lab:</strong> {lab?.name || "N/A"}
//         </p>
//         <p>
//           <strong>Start:</strong> {formatDate(session.startTime)}
//         </p>
//         <p>
//           <strong>End:</strong> {formatDate(session.endTime)}
//         </p>
//         <p>
//           <strong>Current Occupancy:</strong>{" "}
//           <span className="text-emerald-400">{sessionOcc}%</span>
//         </p>
//       </div>

//       {/* Detections Section */}
//       <div className="p-6 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg">
//         <h2 className="text-xl font-semibold text-amber-100 mb-4 flex items-center gap-2">
//           <Activity size={18} className="text-emerald-400" />
//           Detection History
//         </h2>

//         {mergedDetections.length ? (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
//             {mergedDetections.map((d, i) => (
//               <div
//                 key={i}
//                 className="relative group rounded-lg overflow-hidden border border-white/10 hover:border-emerald-400/40 transition"
//               >
//                 <img
//                   src={
//                     d.imageUrl ||
//                     `${import.meta.env.VITE_API_BASE_URL}/uploads/${d.imagePath}`
//                   }
//                   alt="Detection"
//                   className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
//                 />
//                 <div className="absolute bottom-0 w-full bg-black/60 text-xs text-white p-1 text-center opacity-0 group-hover:opacity-100 transition">
//                   {formatDate(d.timestamp)}
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : (
//           <p className="text-slate-400 text-sm">No detections yet.</p>
//         )}
//       </div>
//     </div>
//   );
// }








