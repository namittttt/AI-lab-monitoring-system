import React from 'react'


export default function DetectionTimeline({ detections=[] }){
return (
<div className="space-y-2">
{detections.slice(0,20).map((d, i)=> (
<div key={i} className="border p-2 rounded flex items-center gap-3">
<div className="w-20 h-12 bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
{d.imagePath ? <img src={d.imagePath} alt="snap" className="object-cover h-full"/> : <span className="text-xs">No image</span>}
</div>
<div>
<div className="text-sm">{new Date(d.timestamp).toLocaleString()}</div>
<div className="text-xs text-slate-500">Objects: {d.detectedObjects?.map(o=> `${o.label}(${o.count})`).join(', ')}</div>
</div>
</div>
))}
</div>
)
}