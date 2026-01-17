import React from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'


export default function OccupancyChart({ percent=0 }){
const data = [{ name: 'Occ', value: percent }]
return (
<div style={{ width:'100%', height:100 }}>
<ResponsiveContainer>
<BarChart data={data} layout="vertical">
<XAxis type="number" domain={[0,100]} hide />
<YAxis type="category" dataKey="name" hide />
<Bar dataKey="value" barSize={20} radius={[8,8,8,8]} />
</BarChart>
</ResponsiveContainer>
</div>
)
}