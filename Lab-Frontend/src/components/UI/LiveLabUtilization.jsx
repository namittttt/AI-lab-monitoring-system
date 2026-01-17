// src/components/UI/LiveLabUtilization.jsx
import React from "react";
import { useSocketStore } from "../../store/socketStore";

export default function LiveLabUtilization({ labId, capacity }) {
  const { occupancy } = useSocketStore();

  const current = occupancy[labId] || {};
  const currentStudents = current.peopleCount ?? 0;

  // compute utilization percentage (from socket or fallback formula)
  const percent =
    typeof current.occupancyPercent === "number"
      ? Math.round(current.occupancyPercent)
      : Math.round((currentStudents / capacity) * 100);

  return (
    <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
      <div className="flex items-center justify-between text-sm">
        <span>
          👥 Students: <strong>{currentStudents}</strong>
        </span>
        <span>
          Utilization: <strong>{percent}%</strong>
        </span>
      </div>
      <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2 mt-2">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}





