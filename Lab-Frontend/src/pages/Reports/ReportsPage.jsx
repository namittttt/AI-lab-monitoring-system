import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FilePlus2, BarChart3, Loader2 } from "lucide-react";
import { generateReport } from "../../services/reportService";
import { listLabs } from "../../services/labService";
import ReportCard from "../../components/UI/ReportCard";

export default function ReportsPage() {
  const [form, setForm] = useState({
    mode: "all",
    date: "",
    labId: "",
    uptoTime: "",
  });
  const [latest, setLatest] = useState(null);

  const labsQ = useQuery({
    queryKey: ["labs"],
    queryFn: listLabs,
  });

  const gen = useMutation({
    mutationFn: generateReport,
    onSuccess: (res) => {
      toast.success("✅ Report generated successfully!");
      setLatest(res.data.report);
    },
    onError: () => toast.error("❌ Failed to generate report"),
  });

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
                 text-slate-100 p-8 space-y-10 transition-colors"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-2"
      >
        <BarChart3 className="text-emerald-400" size={28} />
        <h1 className="text-3xl font-bold text-amber-200 drop-shadow-sm">
          Report Management
        </h1>
      </motion.div>

      {/* Generate Report Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-white/10 dark:bg-slate-800/60 
                   backdrop-blur-xl border border-white/10 shadow-lg hover:shadow-2xl transition-all"
      >
        <div className="flex items-center gap-2 mb-4">
          <FilePlus2 className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-amber-100">
            Generate New Report
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            gen.mutate(form);
          }}
          className="space-y-4"
        >
          {/* Mode Selector */}
          <div>
            <label className="block mb-1 text-sm text-slate-400 font-medium">
              Mode
            </label>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
              className="w-full p-2.5 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
            >
              <option value="all">All Labs</option>
              <option value="lab">Specific Lab</option>
            </select>
          </div>

          {/* Lab Selector */}
          {form.mode === "lab" && (
            <div>
              <label className="block mb-1 text-sm text-slate-400 font-medium">
                Select Lab
              </label>
              <select
                value={form.labId}
                onChange={(e) => setForm({ ...form, labId: e.target.value })}
                className="w-full p-2.5 border border-slate-700 bg-slate-900/70 
                           text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                <option value="">Select Lab</option>
                {labsQ.data?.data?.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Field */}
          <div>
            <label className="block mb-1 text-sm text-slate-400 font-medium">
              Report Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full p-2.5 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Upto Time */}
          <div>
            <label className="block mb-1 text-sm text-slate-400 font-medium">
              Upto Time (optional)
            </label>
            <input
              type="datetime-local"
              value={form.uptoTime}
              onChange={(e) => setForm({ ...form, uptoTime: e.target.value })}
              className="w-full p-2.5 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={gen.isPending}
            className="mt-6 w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r 
                       from-emerald-500 to-teal-600 hover:from-emerald-600 
                       hover:to-teal-700 text-white font-semibold rounded-lg 
                       shadow-md hover:shadow-lg transition-all"
          >
            {gen.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </span>
            ) : (
              "Generate Report"
            )}
          </motion.button>
        </form>
      </motion.div>

      {/* Latest Report */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-white/10 dark:bg-slate-800/60 
                   backdrop-blur-xl border border-white/10 shadow-lg hover:shadow-2xl transition-all"
      >
        <h2 className="text-xl font-semibold text-amber-100 mb-4">
          Latest Report
        </h2>
        {gen.isPending ? (
          <div className="text-slate-400">Generating report...</div>
        ) : latest ? (
          <ReportCard report={latest} />
        ) : (
          <div className="text-slate-500 text-sm">
            No report generated yet.
          </div>
        )}
      </motion.div>
    </div>
  );
}
