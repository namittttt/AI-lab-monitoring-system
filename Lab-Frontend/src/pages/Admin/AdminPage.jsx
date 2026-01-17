import React, { useState } from "react";
import { motion } from "framer-motion";
import { createLab, listLabs, deleteLab } from "../../services/labService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trash2, Loader2, PlusCircle, Building2 } from "lucide-react";

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    capacity: "",
    cameraIP: "",
    ipRange: "",
  });

  const { data: labsData, isLoading, isError } = useQuery({
    queryKey: ["labs"],
    queryFn: listLabs,
  });

  const labs = labsData?.data || [];

  const createMutation = useMutation({
    mutationFn: createLab,
    onSuccess: () => {
      toast.success("✅ Lab created successfully!");
      queryClient.invalidateQueries(["labs"]);
      setForm({ name: "", capacity: "", cameraIP: "", ipRange: "" });
    },
    onError: () => toast.error("❌ Failed to create lab"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLab,
    onSuccess: () => {
      toast.success("🗑️ Lab deleted successfully!");
      queryClient.invalidateQueries(["labs"]);
    },
    onError: () => toast.error("❌ Failed to delete lab"),
  });

  const handleDelete = (lab) => {
    if (window.confirm(`Are you sure you want to delete "${lab.name}"?`)) {
      deleteMutation.mutate(lab._id);
    }
  };

  return (
    <div className="min-h-screen 
                    bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 
                    p-8 sm:p-10 flex flex-col items-center gap-10 text-slate-100">
      {/* 🏷️ Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl text-center"
      >
        <h1 className="text-3xl font-bold text-amber-200 mb-2 drop-shadow-sm">
          Lab Administration
        </h1>
        <p className="text-slate-400">
          Manage labs, capacities, and camera configurations
        </p>
      </motion.div>

      {/* 🧱 Main Grid */}
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">
        {/* ✅ Create Lab Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 shadow-lg 
                     bg-white/10 dark:bg-slate-800/60 border border-white/10 
                     backdrop-blur-xl hover:shadow-2xl transition-all"
        >
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="text-emerald-400" size={22} />
            <h2 className="text-xl font-semibold text-amber-100">
              Create New Lab
            </h2>
          </div>

          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="flex flex-col gap-4"
          >
            <input
              className="w-full p-2 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 
                         focus:ring-emerald-500 outline-none transition"
              placeholder="Lab Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full p-2 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 
                         focus:ring-emerald-500 outline-none transition"
              placeholder="Capacity"
              type="number"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: +e.target.value || "" })
              }
            />
            <input
              className="w-full p-2 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 
                         focus:ring-emerald-500 outline-none transition"
              placeholder="Camera IP"
              value={form.cameraIP}
              onChange={(e) => setForm({ ...form, cameraIP: e.target.value })}
            />
            <input
              className="w-full p-2 border border-slate-700 bg-slate-900/70 
                         text-slate-200 rounded-lg focus:ring-2 
                         focus:ring-emerald-500 outline-none transition"
              placeholder="IP Range"
              value={form.ipRange}
              onChange={(e) => setForm({ ...form, ipRange: e.target.value })}
            />

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="w-full flex justify-center items-center gap-2 px-5 py-2
                         bg-gradient-to-r from-emerald-500 to-teal-600 
                         hover:from-emerald-600 hover:to-teal-700
                         text-white font-semibold rounded-lg shadow-lg transition-all"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Creating...
                </>
              ) : (
                <>
                  <PlusCircle size={16} /> Create Lab
                </>
              )}
            </motion.button>
          </motion.form>
        </motion.div>

        {/* 📋 Existing Labs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 shadow-lg 
                     bg-white/10 dark:bg-slate-800/60 border border-white/10 
                     backdrop-blur-xl hover:shadow-2xl transition-all"
        >
          <h2 className="text-2xl font-bold mb-4 text-amber-100">
            Existing Labs
          </h2>

          {isLoading ? (
            <p className="text-slate-400">Loading labs...</p>
          ) : isError ? (
            <p className="text-red-400">Failed to load labs</p>
          ) : labs.length === 0 ? (
            <p className="text-slate-400">No labs available.</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {labs.map((lab) => (
                <motion.div
                  key={lab._id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-xl border border-white/10 
                             bg-white/5 dark:bg-slate-900/50 
                             backdrop-blur-md flex justify-between items-center transition-all"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-amber-200">
                      {lab.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Capacity: {lab.capacity}
                    </p>
                    {lab.cameraIP && (
                      <p className="text-sm text-slate-400">
                        Camera IP: {lab.cameraIP}
                      </p>
                    )}
                    <p className="text-sm text-slate-400">
                      Status:{" "}
                      <span
                        className={`${
                          lab.cameraStatus === "online"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        } font-medium`}
                      >
                        {lab.cameraStatus || "Unknown"}
                      </span>
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(lab)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2
                               bg-gradient-to-r from-rose-500 to-red-500 
                               hover:from-rose-600 hover:to-red-600
                               text-white rounded-lg shadow-md transition"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} /> Delete
                      </>
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
