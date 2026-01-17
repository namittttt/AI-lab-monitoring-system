import React from "react";
import { motion } from "framer-motion";
import { CalendarDays, Download, Activity } from "lucide-react";

export default function ReportCard({ report }) {
  const detections = report?.meta?.totalDetections ?? "—";
  const summary =
    report?.meta?.aiSummary?.slice(0, 150) +
    (report?.meta?.aiSummary?.length > 150 ? "..." : "");

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-5 mb-3 rounded-2xl border border-white/10 
                 bg-white/10 dark:bg-slate-800/60 backdrop-blur-xl 
                 shadow-md hover:shadow-xl flex flex-col sm:flex-row justify-between 
                 items-start sm:items-center transition-all"
    >
      <div>
        <div className="flex items-center gap-2 text-amber-100 font-semibold">
          <CalendarDays size={16} className="text-emerald-400" />
          <span>{new Date(report.date).toLocaleDateString()}</span>
        </div>

        <div className="text-sm text-slate-400 mt-1">
          Mode: {report.mode}
          {report.lab && <span> | Lab: {report.lab}</span>}
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <Activity size={14} className="text-emerald-400" />
          <span>Detections: {detections}</span>
        </div>

        {summary && (
          <p className="mt-3 text-sm text-slate-300 italic line-clamp-2">
            “{summary}”
          </p>
        )}
      </div>

      <a
        href={report.cloudUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 sm:mt-0 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 
                   hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg 
                   font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
      >
        <Download size={16} /> Download
      </a>
    </motion.div>
  );
}
