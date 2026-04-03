'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ForecastLineChart({ data }: { data: Array<{ timestamp: string; community_prediction: number }> }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="timestamp" hide />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Line dataKey="community_prediction" stroke="#3b82f6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
