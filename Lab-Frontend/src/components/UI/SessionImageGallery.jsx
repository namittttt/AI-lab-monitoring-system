import React from 'react'

export default function SessionImageGallery({ sessions }) {
  if (!sessions || sessions.length === 0)
    return <p className="text-gray-500 text-sm">No detection images yet.</p>

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-3">📸 Session Detections</h2>

      <div className="space-y-6">
        {sessions.map((session) => (
          <div key={session._id} className="border rounded-lg p-4 bg-white dark:bg-slate-800 shadow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">
                Session – {new Date(session.startTime).toLocaleTimeString()} → {new Date(session.endTime).toLocaleTimeString()}
              </h3>
              <span className="text-sm text-gray-400">
                {new Date(session.startTime).toLocaleDateString()}
              </span>
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {session.detections && session.detections.length > 0 ? (
                session.detections.map((d, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={d.imagePath}
                      alt={`Detection ${i}`}
                      className="w-full h-40 object-cover rounded-lg shadow-sm hover:shadow-md transition"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 col-span-full text-center">No detections yet</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
