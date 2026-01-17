import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Trash2, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { deleteSessions } from "../../services/sessionService";

export default function AllSessionsList({
  allSessions = [],
  lab,
  setAllSessions,
  setTodaysSessions,
}) {
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 5;

  const totalPages = Math.ceil(allSessions.length / sessionsPerPage);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * sessionsPerPage;
    return allSessions.slice(start, start + sessionsPerPage);
  }, [allSessions, currentPage]);

  const toggleSelect = (id) => {
    setSelectedSessions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = paginatedSessions.map((s) => s._id);
    const allSelected = currentPageIds.every((id) =>
      selectedSessions.includes(id)
    );
    if (allSelected) {
      setSelectedSessions((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    } else {
      setSelectedSessions((prev) =>
        Array.from(new Set([...prev, ...currentPageIds]))
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedSessions.length) return toast.error("No sessions selected!");
    if (
      !window.confirm(`Delete ${selectedSessions.length} selected session(s)?`)
    )
      return;
    try {
      await deleteSessions(selectedSessions);
      toast.success(`Deleted ${selectedSessions.length} session(s)`);
      setAllSessions((prev) =>
        prev.filter((s) => !selectedSessions.includes(s._id))
      );
      setTodaysSessions?.((prev) =>
        prev.filter((s) => !selectedSessions.includes(s._id))
      );
      setSelectedSessions([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete sessions");
    }
  };

  return (
    <div
      className="p-6 rounded-2xl 
                 bg-slate-900/80 dark:bg-slate-900/85 
                 border border-white/10 backdrop-blur-2xl 
                 shadow-[0_0_30px_-10px_rgba(0,0,0,0.7)] mt-10
                 transition-all duration-300"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-amber-200 flex items-center gap-2 drop-shadow-md">
          <CalendarDays size={18} className="text-emerald-400" />
          All Sessions
        </h3>

        {selectedSessions.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r 
                       from-red-600 to-rose-700 text-white rounded text-sm 
                       hover:shadow-[0_0_10px_rgba(255,0,0,0.4)] transition"
          >
            <Trash2 size={16} />
            Delete ({selectedSessions.length})
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="overflow-y-auto border border-slate-700/60 rounded-xl max-h-[450px]">
        <table className="w-full text-sm text-slate-200">
          <thead className="sticky top-0 bg-slate-950/80 text-slate-100 backdrop-blur-md border-b border-slate-800/80">
            <tr>
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={
                    paginatedSessions.length > 0 &&
                    paginatedSessions.every((s) =>
                      selectedSessions.includes(s._id)
                    )
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold tracking-wide">
                Lab
              </th>
              <th className="px-3 py-2 text-left font-semibold tracking-wide">
                Start Time
              </th>
              <th className="px-3 py-2 text-left font-semibold tracking-wide">
                End Time
              </th>
              <th className="px-3 py-2 text-right font-semibold tracking-wide">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedSessions.length ? (
              paginatedSessions.map((s) => (
                <tr
                  key={s._id}
                  className="border-b border-slate-800/50 
                             hover:bg-slate-800/80 
                             hover:text-emerald-300 
                             transition-colors duration-200"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(s._id)}
                      onChange={() => toggleSelect(s._id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-100">
                    {lab?.name || s.labName}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {new Date(s.startTime).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {new Date(s.endTime).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/sessions/${s._id}`}
                      className="text-emerald-400 hover:text-emerald-300 transition font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="text-center text-slate-500 py-5 italic"
                >
                  No sessions available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-5 text-sm text-slate-400">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={`px-3 py-1 rounded-lg ${
              currentPage === 1
                ? "bg-slate-800/40 text-slate-600 cursor-not-allowed"
                : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition"
            }`}
          >
            ← Prev
          </button>

          <span className="text-slate-300">
            Page {currentPage} of {totalPages}{" "}
            <span className="text-slate-500">({paginatedSessions.length} shown)</span>
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={`px-3 py-1 rounded-lg ${
              currentPage === totalPages
                ? "bg-slate-800/40 text-slate-600 cursor-not-allowed"
                : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition"
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}


// import React, { useState, useMemo } from "react";
// import { Link } from "react-router-dom";
// import { Trash2 } from "lucide-react";
// import toast from "react-hot-toast";
// import { deleteSessions } from "../../services/sessionService"; // adjust path

// export default function AllSessionsList({ allSessions = [], lab, setAllSessions, setTodaysSessions }) {
//   const [selectedSessions, setSelectedSessions] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const sessionsPerPage = 5;

//   // Pagination logic
//   const totalPages = Math.ceil(allSessions.length / sessionsPerPage);
//   const paginatedSessions = useMemo(() => {
//     const start = (currentPage - 1) * sessionsPerPage;
//     return allSessions.slice(start, start + sessionsPerPage);
//   }, [allSessions, currentPage]);

//   // Select handling
//   const toggleSelect = (id) => {
//     setSelectedSessions((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const toggleSelectAll = () => {
//     const currentPageIds = paginatedSessions.map((s) => s._id);
//     const allSelected = currentPageIds.every((id) => selectedSessions.includes(id));

//     if (allSelected) {
//       setSelectedSessions((prev) => prev.filter((id) => !currentPageIds.includes(id)));
//     } else {
//       setSelectedSessions((prev) => Array.from(new Set([...prev, ...currentPageIds])));
//     }
//   };

//   // Delete selected
//   const handleDeleteSelected = async () => {
//     if (!selectedSessions.length) return toast.error("No sessions selected!");
//     if (!window.confirm(`Delete ${selectedSessions.length} selected session(s)?`)) return;

//     try {
//       await deleteSessions(selectedSessions);
//       toast.success(`Deleted ${selectedSessions.length} session(s)`);

//       setAllSessions((prev) => prev.filter((s) => !selectedSessions.includes(s._id)));
//       setTodaysSessions?.((prev) => prev.filter((s) => !selectedSessions.includes(s._id)));
//       setSelectedSessions([]);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete sessions");
//     }
//   };

//   return (
//     <div className="p-4 bg-white dark:bg-slate-800 rounded shadow mt-6">
//       <div className="flex justify-between items-center mb-2">
//         <h3 className="font-semibold">All Sessions</h3>

//         {selectedSessions.length > 0 && (
//           <button
//             onClick={handleDeleteSelected}
//             className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
//           >
//             <Trash2 size={16} />
//             Delete ({selectedSessions.length})
//           </button>
//         )}
//       </div>

//       {/* Table header */}
//       <div className="overflow-y-auto border rounded max-h-[450px]">
//         <table className="w-full text-sm">
//           <thead className="sticky top-0 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
//             <tr>
//               <th className="px-3 py-2 text-left w-8">
//                 <input
//                   type="checkbox"
//                   checked={
//                     paginatedSessions.length > 0 &&
//                     paginatedSessions.every((s) => selectedSessions.includes(s._id))
//                   }
//                   onChange={toggleSelectAll}
//                 />
//               </th>
//               <th className="px-3 py-2 text-left">Lab</th>
//               <th className="px-3 py-2 text-left">Start Time</th>
//               <th className="px-3 py-2 text-left">End Time</th>
//               <th className="px-3 py-2 text-right">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {paginatedSessions.length ? (
//               paginatedSessions.map((s) => (
//                 <tr
//                   key={s._id}
//                   className="border-b hover:bg-gray-50 dark:hover:bg-slate-700"
//                 >
//                   <td className="px-3 py-2">
//                     <input
//                       type="checkbox"
//                       checked={selectedSessions.includes(s._id)}
//                       onChange={() => toggleSelect(s._id)}
//                     />
//                   </td>
//                   <td className="px-3 py-2 font-medium">{lab?.name || s.labName}</td>
//                   <td className="px-3 py-2">
//                     {new Date(s.startTime).toLocaleString()}
//                   </td>
//                   <td className="px-3 py-2">
//                     {new Date(s.endTime).toLocaleString()}
//                   </td>
//                   <td className="px-3 py-2 text-right">
//                     <Link
//                       to={`/sessions/${s._id}`}
//                       className="text-blue-600 dark:text-blue-400 hover:underline"
//                     >
//                       View
//                     </Link>
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td
//                   colSpan="5"
//                   className="text-center text-gray-500 py-4 dark:text-gray-400"
//                 >
//                   No sessions available
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination controls */}
//       {totalPages > 1 && (
//         <div className="flex justify-between items-center mt-3 text-sm">
//           <button
//             disabled={currentPage === 1}
//             onClick={() => setCurrentPage((p) => p - 1)}
//             className={`px-3 py-1 rounded ${
//               currentPage === 1
//                 ? "bg-gray-200 text-gray-400 cursor-not-allowed"
//                 : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
//             }`}
//           >
//             ← Previous
//           </button>

//           <span className="text-gray-600 dark:text-gray-300">
//             Page {currentPage} of {totalPages} (
//             {paginatedSessions.length} shown)
//           </span>

//           <button
//             disabled={currentPage === totalPages}
//             onClick={() => setCurrentPage((p) => p + 1)}
//             className={`px-3 py-1 rounded ${
//               currentPage === totalPages
//                 ? "bg-gray-200 text-gray-400 cursor-not-allowed"
//                 : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
//             }`}
//           >
//             Next →
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
