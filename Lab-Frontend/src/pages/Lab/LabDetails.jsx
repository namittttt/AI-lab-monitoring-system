import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getLab } from "../../services/labService";
import { getAllSessionsByLab } from "../../services/sessionService";
import { useSocketStore } from "../../store/socketStore";
import SessionForm from "../../components/UI/SessionForm";
import SessionLiveView from "../../components/UI/SessionLiveView";
import AllSessionsList from "../../components/UI/AllSessionsList";
import { Beaker, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

export default function LabDetails() {
  const { labId } = useParams();
  const { socket } = useSocketStore();
  const [allSessions, setAllSessions] = useState([]);
  const [todaysSessions, setTodaysSessions] = useState([]);

  const { data, isFetching } = useQuery({
    queryKey: ["lab", labId],
    queryFn: () => getLab(labId),
  });

  const lab = data?.data;

  const fetchSessions = async () => {
    try {
      const res = await getAllSessionsByLab(labId);
      const sessions = res.data.data || [];
      setAllSessions(sessions);
      const todayStr = new Date().toDateString();
      setTodaysSessions(
        sessions.filter(
          (s) => new Date(s.startTime).toDateString() === todayStr
        )
      );
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [labId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("session:new", (newSession) => {
      if (newSession.lab === labId) {
        setAllSessions((prev) => [newSession, ...prev]);
        setTodaysSessions((prev) => [newSession, ...prev]);
        toast.success("New session added!");
      }
    });
    socket.on("session:delete", (deletedId) => {
      setAllSessions((prev) => prev.filter((s) => s._id !== deletedId));
      setTodaysSessions((prev) => prev.filter((s) => s._id !== deletedId));
      toast.success("Session deleted");
    });
    return () => {
      socket.off("session:new");
      socket.off("session:delete");
    };
  }, [socket, labId]);

  if (isFetching) return <div>Loading lab details...</div>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
                 text-slate-100 p-8 transition-colors"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Beaker className="text-emerald-400" size={28} />
        <h1 className="text-3xl font-bold text-amber-200">
          {lab?.name || "Lab Details"}
        </h1>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
  {/* Today's Sessions */}
  <div
    className="p-5 rounded-2xl 
               bg-slate-900/85 border border-white/10 
               backdrop-blur-lg shadow-[0_0_25px_-10px_rgba(0,0,0,0.6)]
               transition-all duration-300"
  >
    <h3 className="font-semibold text-amber-100 mb-3 flex items-center gap-2 drop-shadow-sm">
      <CalendarDays size={16} className="text-emerald-400" />
      Today’s Sessions
    </h3>

    <div className="space-y-2">
      {todaysSessions.length ? (
        todaysSessions.map((s) => (
          <div
            key={s._id}
            className="p-3 rounded-lg 
                       bg-slate-900/90 border border-slate-700/60 
                       hover:bg-slate-800/80 transition-colors 
                       shadow-[0_0_10px_-5px_rgba(0,0,0,0.5)]"
          >
            <div className="text-sm text-slate-200">
              {new Date(s.startTime).toLocaleString()} →{" "}
              {new Date(s.endTime).toLocaleTimeString()}
            </div>
            <Link
              to={`/sessions/${s._id}`}
              className="text-emerald-400 text-xs hover:text-emerald-300 hover:underline transition"
            >
              View
            </Link>
          </div>
        ))
      ) : (
        <p className="text-slate-400 text-sm">No sessions today</p>
      )}
    </div>
  </div>


        {/* Live Detection Feed */}
        {/* <div className="rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg"> */}
          <SessionLiveView labId={labId} />
        {/* </div> */}

        {/* Schedule Session */}
        <div className="rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg">
          <SessionForm lab={lab} />
        </div>
      </div>

      <AllSessionsList
        allSessions={allSessions}
        lab={lab}
        setAllSessions={setAllSessions}
        setTodaysSessions={setTodaysSessions}
      />
    </div>
  );
}


// import React, { useEffect, useState } from "react";
// import { Link, useParams } from "react-router-dom";
// import { useQuery } from "@tanstack/react-query";
// import toast from "react-hot-toast";
// import { getLab } from "../../services/labService";
// import { getAllSessionsByLab } from "../../services/sessionService";
// import { useSocketStore } from "../../store/socketStore";
// import SessionForm from "../../components/UI/SessionForm";
// import SessionLiveView from "../../components/UI/SessionLiveView";
// import AllSessionsList from "../../components/UI/AllSessionsList";
// import { Beaker, CalendarDays } from "lucide-react";
// import { motion } from "framer-motion";

// export default function LabDetails() {
//   const { labId } = useParams();
//   const { socket } = useSocketStore();
//   const [allSessions, setAllSessions] = useState([]);
//   const [todaysSessions, setTodaysSessions] = useState([]);

//   const { data, isFetching } = useQuery({
//     queryKey: ["lab", labId],
//     queryFn: () => getLab(labId),
//   });

//   const lab = data?.data;

//   const fetchSessions = async () => {
//     try {
//       const res = await getAllSessionsByLab(labId);
//       const sessions = res.data.data || [];
//       setAllSessions(sessions);
//       const todayStr = new Date().toDateString();
//       setTodaysSessions(
//         sessions.filter(
//           (s) => new Date(s.startTime).toDateString() === todayStr
//         )
//       );
//     } catch (err) {
//       console.error("Error fetching sessions:", err);
//     }
//   };

//   useEffect(() => {
//     fetchSessions();
//   }, [labId]);

//   useEffect(() => {
//     if (!socket) return;
//     socket.on("session:new", (newSession) => {
//       if (newSession.lab === labId) {
//         setAllSessions((prev) => [newSession, ...prev]);
//         setTodaysSessions((prev) => [newSession, ...prev]);
//         toast.success("New session added!");
//       }
//     });
//     socket.on("session:delete", (deletedId) => {
//       setAllSessions((prev) => prev.filter((s) => s._id !== deletedId));
//       setTodaysSessions((prev) => prev.filter((s) => s._id !== deletedId));
//       toast.success("Session deleted");
//     });
//     return () => {
//       socket.off("session:new");
//       socket.off("session:delete");
//     };
//   }, [socket, labId]);

//   if (isFetching) return <div>Loading lab details...</div>;

//   return (
//     <div
//       className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
//                  text-slate-100 p-8 transition-colors"
//     >
//       <motion.div
//         initial={{ opacity: 0, y: -10 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="flex items-center gap-3 mb-8"
//       >
//         <Beaker className="text-emerald-400" size={28} />
//         <h1 className="text-3xl font-bold text-amber-200">
//           {lab?.name || "Lab Details"}
//         </h1>
//       </motion.div>

//       <div className="grid md:grid-cols-3 gap-6">
//         {/* Today's Sessions */}
//         <div className="p-5 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg">
//           <h3 className="font-semibold text-amber-100 mb-3 flex items-center gap-2">
//             <CalendarDays size={16} className="text-emerald-400" />
//             Today’s Sessions
//           </h3>
//           <div className="space-y-2">
//             {todaysSessions.length ? (
//               todaysSessions.map((s) => (
//                 <div
//                   key={s._id}
//                   className="p-3 rounded-lg bg-slate-900/60 border border-white/10 hover:bg-slate-800 transition"
//                 >
//                   <div className="text-sm text-slate-300">
//                     {new Date(s.startTime).toLocaleString()} →{" "}
//                     {new Date(s.endTime).toLocaleTimeString()}
//                   </div>
//                   <Link
//                     to={`/sessions/${s._id}`}
//                     className="text-emerald-400 text-xs hover:underline"
//                   >
//                     View
//                   </Link>
//                 </div>
//               ))
//             ) : (
//               <p className="text-slate-400 text-sm">No sessions today</p>
//             )}
//           </div>
//         </div>

//         {/* Live Detection Feed */}
//         <div className="rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg">
//           <SessionLiveView labId={labId} />
//         </div>

//         {/* Schedule Session */}
//         <div className="rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 backdrop-blur-xl shadow-lg">
//           <SessionForm lab={lab} />
//         </div>
//       </div>

//       <AllSessionsList
//         allSessions={allSessions}
//         lab={lab}
//         setAllSessions={setAllSessions}
//         setTodaysSessions={setTodaysSessions}
//       />
//     </div>
//   );
// }



// import React, { useEffect } from 'react'
// import { Link, useParams } from 'react-router-dom'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import toast from 'react-hot-toast'
// import { getLab, startSession, stopSession } from '../../services/labService'
// import SessionForm from '../../components/UI/SessionForm'
// import SessionLiveView from '../../components/UI/SessionLiveView'

// // Converts "7:23 PM" or "23:15" into ISO format
// function convertToISO(timeStr) {
//   const today = new Date().toISOString().split('T')[0]
//   let date

//   if (timeStr?.toLowerCase().includes('am') || timeStr?.toLowerCase().includes('pm')) {
//     const [time, modifier] = timeStr.split(' ')
//     let [hours, minutes] = time.split(':').map(Number)
//     if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12
//     if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0
//     date = new Date(`${today}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)
//   } else {
//     date = new Date(`${today}T${timeStr}:00`)
//   }

//   return date.toISOString()
// }

// export default function LabDetails() {
//   const { labId } = useParams()
//   const qc = useQueryClient()

//   const { data, isFetching } = useQuery({
//     queryKey: ['lab', labId],
//     queryFn: () => getLab(labId),
//   })

//   const lab = data?.data

//   const startMut = useMutation({
//     mutationFn: startSession,
//     onSuccess: () => {
//       toast.success('Session started')
//       qc.invalidateQueries({ queryKey: ['lab', labId] })
//     },
//     onError: () => toast.error('Start failed'),
//   })

//   const stopMut = useMutation({
//     mutationFn: stopSession,
//     onSuccess: () => {
//       toast.success('Session stopped')
//       qc.invalidateQueries({ queryKey: ['lab', labId] })
//     },
//     onError: () => toast.error('Stop failed'),
//   })

//   // Start immediately
//   const startNow = async () => {
//     await startMut.mutateAsync({
//       labId: lab._id,
//       startTime: new Date().toISOString(),
//       endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
//       numberOfDetections: 10,
//       detectionFrequency: 60,
//       enablePhoneDetection: false,
//     })
//   }

//   const stopNow = async () => {
//     await stopMut.mutateAsync({ sessionId: lab?.currentSessionId })
//   }

//   // 🕛 Clear frontend sessions at midnight
//   useEffect(() => {
//     const now = new Date()
//     const msUntilMidnight =
//       new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now
//     const timeout = setTimeout(() => {
//       qc.invalidateQueries(['lab', labId])
//     }, msUntilMidnight)
//     return () => clearTimeout(timeout)
//   }, [labId, qc])

//   if (isFetching) return <div>Loading lab details...</div>

//   // 🧮 Filter sessions only from today
//   const today = new Date().toDateString()
//   const todaysSessions = (lab?.sessions || []).filter(
//     (s) => new Date(s.startTime).toDateString() === today
//   )

//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-4">{lab?.name || 'Lab details'}</h1>

//       <div className="mb-4 flex gap-2">
//         <button
//           onClick={startNow}
//           className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
//           disabled={startMut.isPending}
//         >
//           {startMut.isPending ? 'Starting...' : 'Start Now'}
//         </button>
//         <button
//           onClick={stopNow}
//           className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
//           disabled={stopMut.isPending}
//         >
//           {stopMut.isPending ? 'Stopping...' : 'Stop Now'}
//         </button>
//       </div>

//       <div className="grid md:grid-cols-3 gap-4">
//         {/* 📋 Recent Sessions for Today */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-1">
//           <h3 className="font-semibold">Today’s Sessions</h3>
//           <div className="mt-3 space-y-2">
//             {todaysSessions.length ? (
//               todaysSessions.map((s) => (
//                 <div key={s._id} className="border p-2 rounded">
//                   <div>
//                     {new Date(s.startTime).toLocaleString()} -{' '}
//                     {new Date(s.endTime).toLocaleTimeString()}
//                   </div>
//                   <Link to={`/sessions/${s._id}`} className="text-blue-600 text-sm">
//                     Open
//                   </Link>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500">No sessions today</p>
//             )}
//           </div>
//         </div>

//         {/* 📸 Live Detection Feed */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-1">
//           <h3 className="font-semibold mb-2">Live Detection Feed</h3>
//           <SessionLiveView labId={labId} />
//         </div>

//         {/* 🕒 Create Session */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-1">
//           <h3 className="font-semibold mb-2">Schedule Session</h3>
//           <SessionForm lab={lab} convertToISO={convertToISO} />
//         </div>
//       </div>
//     </div>
//   )
// }




// // src/pages/Labs/LabDetails.jsx    BRO THIS IS RECENT
// import React from 'react'
// import { Link, useParams } from 'react-router-dom'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import toast from 'react-hot-toast'
// import { getLab, startSession, stopSession } from '../../services/labService'
// import SessionForm from '../../components/UI/SessionForm'
// import SessionLiveView from '../../components/UI/SessionLiveView'

// // 🕒 Converts "7:23 PM" or "23:15" into ISO format for backend
// function convertToISO(timeStr) {
//   const today = new Date().toISOString().split('T')[0];
//   let date;

//   if (timeStr?.toLowerCase().includes('am') || timeStr?.toLowerCase().includes('pm')) {
//     const [time, modifier] = timeStr.split(' ');
//     let [hours, minutes] = time.split(':').map(Number);
//     if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
//     if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
//     date = new Date(`${today}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
//   } else {
//     date = new Date(`${today}T${timeStr}:00`);
//   }

//   return date.toISOString();
// }

// export default function LabDetails() {
//   const { labId } = useParams()
//   const qc = useQueryClient()

//   // ✅ Fetch lab info
//   const { data, isFetching } = useQuery({
//     queryKey: ['lab', labId],
//     queryFn: () => getLab(labId),
//   })

//   const lab = data?.data

//   // ✅ Mutations
//   const startMut = useMutation({
//     mutationFn: startSession,
//     onSuccess: () => {
//       toast.success('Session started')
//       qc.invalidateQueries({ queryKey: ['lab', labId] })
//     },
//     onError: () => toast.error('Start failed'),
//   })

//   const stopMut = useMutation({
//     mutationFn: stopSession,
//     onSuccess: () => {
//       toast.success('Session stopped')
//       qc.invalidateQueries({ queryKey: ['lab', labId] })
//     },
//     onError: () => toast.error('Stop failed'),
//   })

//   // ✅ Start immediately (auto 30 min)
//   const startNow = async () => {
//     await startMut.mutateAsync({
//       labId: lab._id,
//       startTime: new Date().toISOString(),
//       endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
//       numberOfDetections: 10,
//       detectionFrequency: 60,
//       enablePhoneDetection: false,
//     })
//   }

//   // ✅ Stop current session
//   const stopNow = async () => {
//     await stopMut.mutateAsync({ sessionId: lab?.currentSessionId })
//   }

//   if (isFetching) return <div>Loading lab details...</div>

//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-4">{lab?.name || 'Lab details'}</h1>

//       <div className="mb-4 flex gap-2">
//         <button
//           onClick={startNow}
//           className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
//           disabled={startMut.isPending}
//         >
//           {startMut.isPending ? 'Starting...' : 'Start Now'}
//         </button>
//         <button
//           onClick={stopNow}
//           className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
//           disabled={stopMut.isPending}
//         >
//           {stopMut.isPending ? 'Stopping...' : 'Stop Now'}
//         </button>
//       </div>

//       <div className="grid md:grid-cols-3 gap-4">
//         {/* 🧾 Sessions list */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-1">
//           <h3 className="font-semibold">Recent Sessions</h3>
//           <div className="mt-3 space-y-2">
//             {lab?.sessions?.length ? (
//               lab.sessions.slice(0, 5).map((s) => (
//                 <div key={s._id} className="border p-2 rounded">
//                   <div>
//                     {new Date(s.startTime).toLocaleString()} -{' '}
//                     {new Date(s.endTime).toLocaleTimeString()}
//                   </div>
//                   <Link to={`/sessions/${s._id}`} className="text-blue-600 text-sm">
//                     Open
//                   </Link>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500">No sessions yet</p>
//             )}
//           </div>
//         </div>

//         {/* 📸 Live Detection Feed */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-1">
//           <h3 className="font-semibold mb-2">Live Detection Feed</h3>
//           <SessionLiveView labId={labId} /> {/* ✅ Shows all detections of today, grouped by session */}
//         </div>

//         {/* 🕒 Create Session */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-1">
//           <h3 className="font-semibold mb-2">Schedule Session</h3>
//           <SessionForm lab={lab} convertToISO={convertToISO} />
//         </div>
//       </div>
//     </div>
//   )
// }


// import React from 'react'
// import { Link, useParams } from 'react-router-dom'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import toast from 'react-hot-toast'
// import { getLab, startSession, stopSession } from '../../services/labService'
// import SessionForm from '../../components/UI/SessionForm'

// // 🕒 Helper to convert "7:23 PM" or "23:15" into ISO format for backend
// function convertToISO(timeStr) {
//   const today = new Date().toISOString().split('T')[0]; // e.g. "2025-10-20"
//   let date;

//   // Handle "7:23 PM" style
//   if (timeStr?.toLowerCase().includes('am') || timeStr?.toLowerCase().includes('pm')) {
//     const [time, modifier] = timeStr.split(' ');
//     let [hours, minutes] = time.split(':').map(Number);
//     if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
//     if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
//     date = new Date(`${today}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
//   } 
//   // Handle 24-hour style like "07:25" or "23:15"
//   else {
//     date = new Date(`${today}T${timeStr}:00`);
//   }

//   return date.toISOString();
// }

// export default function LabDetails() {
//   const { labId } = useParams()
//   const qc = useQueryClient()

//   // ✅ Fetch lab info
//   const { data, isFetching } = useQuery({
//     queryKey: ['lab', labId],
//     queryFn: () => getLab(labId),
//   })

//   const lab = data?.data

//   // ✅ Mutations
//   const startMut = useMutation({
//     mutationFn: startSession,
//     onSuccess: () => {
//       toast.success('Session started')
//       qc.invalidateQueries({ queryKey: ['lab', labId] })
//     },
//     onError: (err) => {
//       console.error('Start failed:', err)
//       toast.error('Start failed')
//     },
//   })

//   const stopMut = useMutation({
//     mutationFn: stopSession,
//     onSuccess: () => {
//       toast.success('Session stopped')
//       qc.invalidateQueries({ queryKey: ['lab', labId] })
//     },
//     onError: (err) => {
//       console.error('Stop failed:', err)
//       toast.error('Stop failed')
//     },
//   })

//   // ✅ Start immediately (auto 30 min)
//   const startNow = async () => {
//     try {
//       await startMut.mutateAsync({
//         labId: lab._id,
//         startTime: new Date().toISOString(),
//         endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
//         numberOfDetections: 10,
//         detectionFrequency: 60,
//         enablePhoneDetection: false,
//       });
//     } catch {
//       toast.error('Start failed');
//     }
//   };

//   // ✅ Stop current session
//   const stopNow = async () => {
//     try {
//       await stopMut.mutateAsync({ sessionId: lab?.currentSessionId })
//     } catch {
//       toast.error('Stop failed')
//     }
//   }

//   if (isFetching) return <div>Loading lab details...</div>

//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-4">{lab?.name || 'Lab details'}</h1>

//       <div className="mb-4 flex gap-2">
//         <button
//           onClick={startNow}
//           className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
//           disabled={startMut.isPending}
//         >
//           {startMut.isPending ? 'Starting...' : 'Start Now'}
//         </button>
//         <button
//           onClick={stopNow}
//           className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
//           disabled={stopMut.isPending}
//         >
//           {stopMut.isPending ? 'Stopping...' : 'Stop Now'}
//         </button>
//       </div>

//       <div className="grid md:grid-cols-2 gap-4">
//         {/* Sessions list */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
//           <h3 className="font-semibold">Sessions</h3>
//           <div className="mt-3 space-y-2">
//             {lab?.sessions?.length ? (
//               lab.sessions.slice(0, 5).map((s) => (
//                 <div key={s._id} className="border p-2 rounded">
//                   <div>
//                     {new Date(s.startTime).toLocaleString()} -{' '}
//                     {new Date(s.endTime).toLocaleTimeString()}
//                   </div>
//                   <Link to={`/sessions/${s._id}`} className="text-blue-600 text-sm">
//                     Open
//                   </Link>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500">No sessions yet</p>
//             )}
//           </div>
//         </div>

//         {/* Session Form */}
//         <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
//           <h3 className="font-semibold mb-2">Create Session</h3>
//           {/* Pass conversion helper down so SessionForm can use "7:23 PM" style inputs */}
//           <SessionForm lab={lab} convertToISO={convertToISO} />
//         </div>
//       </div>
//     </div>
//   )
// }
