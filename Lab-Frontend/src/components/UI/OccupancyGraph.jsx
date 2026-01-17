import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function OccupancyGraph({ data = [] }) {
  // ✅ Prevent crashes if backend sends object/null instead of array
  const safeData = Array.isArray(data) ? data : [];

  // ✅ Convert timestamp + occupancyPercent into chart-friendly format
  const mapped = safeData.map(d => ({
    x: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    y: d.occupancyPercent ?? 0,
  }));

  return (
    <div className="w-full h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
        📈 Occupancy Trend
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mapped}>
          <XAxis dataKey="x" stroke="#94a3b8" />
          <YAxis domain={[0, 100]} stroke="#94a3b8" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            animationDuration={400}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
