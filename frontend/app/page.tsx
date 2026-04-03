'use client';

import { useEffect, useState } from 'react';
import FlagCard from '../components/FlagCard';

type Flag = {
  question_id: number;
  title: string;
  community_forecast: number;
  red_flag_score: number;
  domain: string;
  why_flagged: string[];
  llm_synthesis: string;
};

export default function HomePage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

  useEffect(() => {
    fetch(`${api}/api/questions/flagged?limit=10`)
      .then((res) => res.json())
      .then((payload) => setFlags(payload.data ?? []))
      .catch(() => setFlags([]));
  }, [api]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section>
        <h1>Questions The Crowd Is Probably Wrong About Right Now</h1>
        <p>Crowd overconfidence patterns detected from live Metaculus data.</p>
        <p>Live flagged count: {flags.length}</p>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {flags.map((flag) => (
          <FlagCard key={flag.question_id} flag={flag} />
        ))}
      </section>
    </div>
  );
}
