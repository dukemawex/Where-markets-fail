export default function ScoreBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{key.replaceAll('_', ' ')}</span>
            <span>{value}</span>
          </div>
          <div style={{ width: '100%', background: '#1e293b', borderRadius: 999 }}>
            <div style={{ width: `${Math.min(100, value * 4)}%`, height: 8, background: '#f97316', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
