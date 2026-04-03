export default function DomainBadge({ domain }: { domain: string }) {
  return (
    <span style={{ background: '#1e293b', color: '#93c5fd', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>
      {domain}
    </span>
  );
}
