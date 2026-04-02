'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function CalibrationChart({ data }: { data: Array<{ domain: string; overconfidence_index: number }> }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="domain" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="overconfidence_index" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
