import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  uploadTimetable,
  statusTimetable,
  previewTimetable,
  clearTimetable,
} from "../../services/excelService";
import {
  Calendar,
  Upload,
  Trash2,
  Table,
  CircleDot,
  CircleOff,
  Loader2,
} from "lucide-react";

export default function TimetablePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    fetchStatus();
    fetchPreview();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await statusTimetable();
      setStatus(res.data);
    } catch (err) {
      console.error("Error fetching status:", err);
      setError("Failed to fetch Excel status");
    }
  };

  const fetchPreview = async () => {
    try {
      const res = await previewTimetable();
      if (res.data.ok && res.data.data.length) {
        setTableData(res.data.data);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error("Error fetching preview:", err);
      setTableData([]);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please select a timetable Excel file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setError("");
      const res = await uploadTimetable(formData);

      if (res.data.ok) {
        toast.success("✅ Timetable uploaded successfully!");
        await fetchStatus();
        await fetchPreview();
      } else {
        setError(res.data.error || "Unknown upload error");
        toast.error("Upload failed");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to upload timetable");
      setError(err.response?.data?.error || "Upload failed. Check server logs.");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to delete the current timetable?")) return;
    try {
      const res = await clearTimetable();
      if (res.data.ok) {
        toast.success("🧹 Timetable cleared successfully!");
        setTableData([]);
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to clear timetable:", err);
      toast.error("Failed to clear timetable");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center p-8 transition-colors duration-500 
                 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
                 text-slate-100"
    >
      {/* Header */}
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-3xl font-bold mb-10 text-amber-200 flex items-center gap-3 drop-shadow-sm"
      >
        <Calendar className="w-8 h-8 text-emerald-400" />
        Timetable Management
      </motion.h1>

      {/* Upload Form */}
      <motion.form
        onSubmit={handleUpload}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white/10 dark:bg-slate-800/60 border border-white/10 
                   backdrop-blur-xl rounded-2xl shadow-lg p-6 w-full max-w-3xl 
                   hover:shadow-2xl transition-all"
      >
        {/* Upload Status */}
        <div className="absolute top-5 right-5">
          {status ? (
            status.exists ? (
              <span className="flex items-center gap-2 px-3 py-1 
                               bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 
                               rounded-full text-sm font-medium">
                <CircleDot className="w-3 h-3" />
                Available
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1 
                               bg-red-900/40 text-red-400 border border-red-700/40 
                               rounded-full text-sm font-medium">
                <CircleOff className="w-3 h-3" />
                Not Found
              </span>
            )
          ) : (
            <span className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </span>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-4 text-amber-100 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-400" />
          Upload New Timetable
        </h2>

        <label className="block text-slate-400 font-medium mb-2">
          Excel File (.xlsx / .xls)
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="w-full mb-4 border border-slate-700 bg-slate-900/70 
                     text-slate-200 p-2 rounded-lg focus:ring-2 
                     focus:ring-emerald-500 outline-none transition"
        />

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={uploading}
          className={`w-full flex justify-center items-center gap-2 px-5 py-2
                      bg-gradient-to-r from-emerald-500 to-teal-600 text-white 
                      font-semibold rounded-lg shadow-md hover:shadow-lg
                      hover:from-emerald-600 hover:to-teal-700 transition-all
                      ${uploading && "opacity-60 cursor-not-allowed"}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload Timetable
            </>
          )}
        </motion.button>

        {error && (
          <p className="mt-4 text-red-400 text-sm font-medium">{error}</p>
        )}

        {status?.exists && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClear}
            type="button"
            className="mt-6 bg-gradient-to-r from-red-600 to-rose-600 
                       hover:from-red-700 hover:to-rose-700
                       text-white text-sm px-4 py-2 rounded-lg shadow-md 
                       transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Timetable
          </motion.button>
        )}
      </motion.form>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 w-full max-w-6xl bg-white/10 dark:bg-slate-800/60 
                   border border-white/10 backdrop-blur-xl rounded-2xl 
                   shadow-lg overflow-x-auto p-6 hover:shadow-2xl transition-all"
      >
        <h2 className="text-xl font-semibold mb-4 text-amber-100 flex items-center gap-2">
          <Table className="w-5 h-5 text-emerald-400" />
          Timetable Preview
        </h2>

        {tableData.length > 0 ? (
          <table className="min-w-full border-collapse border border-slate-700 text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-emerald-300 border-b border-slate-600">
                {tableData[0].map((header, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-semibold"
                  >
                    {header || "-"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.slice(1).map((row, i) => (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0
                      ? "bg-slate-900/40"
                      : "bg-slate-800/50"
                  } hover:bg-emerald-900/30 transition`}
                >
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-slate-300 border-b border-slate-700">
                      {cell || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-400 text-sm">No timetable uploaded yet.</p>
        )}
      </motion.div>
    </motion.div>
  );
}


// import React, { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import toast from "react-hot-toast";
// import {
//   uploadTimetable,
//   statusTimetable,
//   previewTimetable,
//   clearTimetable,
// } from "../../services/excelService";

// export default function TimetablePage() {
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [status, setStatus] = useState(null);
//   const [error, setError] = useState("");
//   const [tableData, setTableData] = useState([]);

//   useEffect(() => {
//     fetchStatus();
//     fetchPreview();
//   }, []);

//   const fetchStatus = async () => {
//     try {
//       const res = await statusTimetable();
//       setStatus(res.data);
//     } catch (err) {
//       console.error("Error fetching status:", err);
//       setError("Failed to fetch Excel status");
//     }
//   };

//   const fetchPreview = async () => {
//     try {
//       const res = await previewTimetable();
//       if (res.data.ok && res.data.data.length) {
//         setTableData(res.data.data);
//       } else {
//         setTableData([]);
//       }
//     } catch (err) {
//       console.error("Error fetching preview:", err);
//       setTableData([]);
//     }
//   };

//   const handleFileChange = (e) => {
//     setFile(e.target.files[0]);
//     setError("");
//   };

//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) return setError("Please select a timetable Excel file first.");

//     const formData = new FormData();
//     formData.append("file", file);

//     try {
//       setUploading(true);
//       setError("");

//       const res = await uploadTimetable(formData);

//       if (res.data.ok) {
//         toast.success("✅ Timetable uploaded successfully!");
//         await fetchStatus();
//         await fetchPreview();
//       } else {
//         setError(res.data.error || "Unknown upload error");
//         toast.error("Upload failed");
//       }
//     } catch (err) {
//       console.error("Upload failed:", err);
//       toast.error("Failed to upload timetable");
//       setError(err.response?.data?.error || "Upload failed. Check server logs.");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleClear = async () => {
//     if (!window.confirm("Are you sure you want to delete the current timetable?")) return;
//     try {
//       const res = await clearTimetable();
//       if (res.data.ok) {
//         toast("🗑️ Timetable cleared successfully!");
//         setTableData([]);
//         fetchStatus();
//       }
//     } catch (err) {
//       console.error("Failed to clear timetable:", err);
//       toast.error("Failed to clear timetable");
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 p-8 flex flex-col items-center"
//     >
//       {/* 🏷️ Header */}
//       <motion.h1
//         initial={{ y: -20, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         className="text-4xl font-bold mb-10 text-emerald-700 flex items-center gap-2"
//       >
//         📅 Timetable Management
//       </motion.h1>

//       {/* 🧩 Upload Form (with integrated status) */}
//       <motion.form
//         onSubmit={handleUpload}
//         initial={{ scale: 0.97, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         className="relative bg-white shadow-lg rounded-2xl p-6 border border-gray-200 w-full max-w-3xl"
//       >
//         {/* Upload Status Badge */}
//         <div className="absolute top-5 right-5">
//           {status ? (
//             status.exists ? (
//               <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
//                 <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
//                 Available
//               </span>
//             ) : (
//               <span className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
//                 <span className="h-2 w-2 bg-red-500 rounded-full"></span>
//                 Not Found
//               </span>
//             )
//           ) : (
//             <span className="text-gray-500 text-sm">Loading...</span>
//           )}
//         </div>

//         <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
//           📤 Upload New Timetable
//         </h2>

//         <label className="block text-gray-700 font-medium mb-2">
//           Excel File (.xlsx / .xls)
//         </label>
//         <input
//           type="file"
//           accept=".xlsx, .xls"
//           onChange={handleFileChange}
//           className="w-full mb-4 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
//         />

//         <motion.button
//           whileHover={{ scale: 1.03 }}
//           whileTap={{ scale: 0.97 }}
//           type="submit"
//           disabled={uploading}
//           className={`w-full flex justify-center items-center gap-2 px-5 py-2
//                       bg-gradient-to-r from-emerald-500 to-teal-500 text-white 
//                       font-medium rounded-lg shadow-md hover:shadow-lg
//                       hover:from-emerald-600 hover:to-teal-600 transition-all
//                       ${uploading && "opacity-60 cursor-not-allowed"}`}
//         >
//           {uploading ? "Uploading..." : "Upload Timetable"}
//         </motion.button>

//         {error && (
//           <p className="mt-4 text-red-500 text-sm font-medium">{error}</p>
//         )}

//         {status?.exists && (
//           <motion.button
//             whileHover={{ scale: 1.03 }}
//             whileTap={{ scale: 0.97 }}
//             onClick={handleClear}
//             type="button"
//             className="mt-6 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-red-600 hover:to-rose-700 transition-all"
//           >
//             🗑️ Clear Timetable
//           </motion.button>
//         )}
//       </motion.form>

//       {/* 🧾 Timetable Preview */}
//       <motion.div
//         initial={{ opacity: 0, y: 15 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="mt-12 w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-x-auto p-6 border border-gray-200"
//       >
//         <h2 className="text-xl font-semibold mb-4 text-emerald-700 flex items-center gap-2">
//           📋 Timetable Preview
//         </h2>

//         {tableData.length > 0 ? (
//           <table className="min-w-full border-collapse border border-gray-300 text-sm">
//             <thead>
//               <tr className="bg-emerald-100">
//                 {tableData[0].map((header, i) => (
//                   <th
//                     key={i}
//                     className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800"
//                   >
//                     {header || "-"}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {tableData.slice(1).map((row, i) => (
//                 <tr
//                   key={i}
//                   className={`${
//                     i % 2 === 0 ? "bg-gray-50" : "bg-white"
//                   } hover:bg-emerald-50 transition`}
//                 >
//                   {row.map((cell, j) => (
//                     <td key={j} className="border border-gray-200 px-3 py-2">
//                       {cell || ""}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="text-gray-500 text-sm">No timetable uploaded yet.</p>
//         )}
//       </motion.div>
//     </motion.div>
//   );
// }

