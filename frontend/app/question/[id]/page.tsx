'use client';

import { useEffect, useState } from 'react';
import ForecastLineChart from '../../../components/ForecastLineChart';
import ScoreBreakdown from '../../../components/ScoreBreakdown';

type AuditReport = {
  question: { title: string; community_prediction: number };
  red_flag: { red_flag_score: number; llm_synthesis: string; score_breakdown?: Record<string, number> };
  forecast_history: Array<{ timestamp: string; community_prediction: number }>;
  analogs: Array<{ question_id: number; title: string; outcome: number; community_forecast: number }>;
};

export default function QuestionAuditPage({ params }: { params: { id: string } }) {
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

  useEffect(() => {
    fetch(`${api}/api/questions/${params.id}/audit`)
      .then((res) => res.json())
      .then((payload) => setAudit(payload.data ?? null))
      .catch(() => setAudit(null));
  }, [api, params.id]);

  if (!audit) {
    return <p>Loading audit...</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1>{audit.question.title}</h1>
      <p>Current community forecast: {Math.round(audit.question.community_prediction * 100)}%</p>
      <p>Red flag score: {audit.red_flag.red_flag_score}</p>
      <ScoreBreakdown breakdown={audit.red_flag.score_breakdown ?? {}} />

      <div style={{ border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
        {audit.red_flag.llm_synthesis}
      </div>

      <ForecastLineChart data={audit.forecast_history} />

      <section>
        <h2>Historical analogs</h2>
        <ul>
          {audit.analogs.map((analog) => (
            <li key={analog.question_id}>
              {analog.title} — forecast {Math.round(analog.community_forecast * 100)}%, outcome {analog.outcome}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
