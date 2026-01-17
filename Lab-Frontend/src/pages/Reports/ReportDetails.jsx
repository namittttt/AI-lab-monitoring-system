import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "../../services/reportService";
import { motion } from "framer-motion";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

export default function ReportDetails() {
  const { id } = useParams();
  const { data, isFetching } = useQuery({
    queryKey: ["report", id],
    queryFn: () => getReport(id),
  });
  const r = data?.data?.report;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
                 text-slate-100 p-8 transition-colors"
    >
      <div className="flex items-center gap-3 mb-8">
        <FileText className="text-emerald-400" size={26} />
        <h1 className="text-3xl font-bold text-amber-200 drop-shadow-sm">
          Report Details
        </h1>
      </div>

      {isFetching ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="animate-spin w-4 h-4" /> Loading...
        </div>
      ) : r ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white/10 dark:bg-slate-800/60 
                     backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg"
        >
          <div className="text-sm text-slate-300 mb-2">
            Date: {new Date(r.date).toString()}
          </div>
          <div className="text-sm text-slate-300 mb-2">Mode: {r.mode}</div>
          <a
            href={r.cloudUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition text-sm"
          >
            <ExternalLink size={14} /> Open Cloud Report
          </a>

          <div className="mt-4 text-xs text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            Meta: {JSON.stringify(r.meta || {}, null, 2)}
          </div>
        </motion.div>
      ) : (
        <div className="text-slate-500">No report found.</div>
      )}
    </div>
  );
}
