import Link from 'next/link';
import DomainBadge from './DomainBadge';

type Flag = {
  question_id: number;
  title: string;
  community_forecast: number;
  red_flag_score: number;
  domain: string;
  why_flagged: string[];
  llm_synthesis: string;
};

function scoreColor(score: number): string {
  if (score <= 40) return '#16a34a';
  if (score <= 70) return '#f59e0b';
  return '#ef4444';
}

export default function FlagCard({ flag }: { flag: Flag }) {
  return (
    <Link href={`/question/${flag.question_id}`} style={{ display: 'block', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0 }}>{flag.title}</h3>
        <span style={{ background: scoreColor(flag.red_flag_score), color: '#fff', padding: '4px 10px', borderRadius: 999 }}>
          {flag.red_flag_score}
        </span>
      </div>
      <p>{Math.round(flag.community_forecast * 100)}% community forecast</p>
      <DomainBadge domain={flag.domain} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {flag.why_flagged.map((chip) => (
          <span key={chip} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 999, padding: '2px 8px', fontSize: 12 }}>
            {chip}
          </span>
        ))}
      </div>
      <p style={{ color: '#cbd5e1' }}>{flag.llm_synthesis}</p>
    </Link>
  );
}
