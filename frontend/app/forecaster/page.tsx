'use client';

import { type FormEvent, useState } from 'react';

type DomainLine = {
  domain: string;
  brier_score: number;
  overconfidence_index: number;
  recommendation?: string;
};

type ForecasterProfile = {
  username: string;
  domains: DomainLine[];
};

export default function ForecasterPage() {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<ForecasterProfile | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!username) return;
    fetch(`${api}/api/forecaster/${encodeURIComponent(username)}/blind-spots`)
      .then((res) => res.json())
      .then((payload) => setProfile(payload.data ?? null))
      .catch(() => setProfile(null));
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1>Forecaster blind spot tool</h1>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Enter your Metaculus username"
          style={{ padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }}
        />
        <button type="submit">Analyze</button>
      </form>

      {profile && (
        <section>
          <h2>{profile.username}</h2>
          <ul>
            {profile.domains.map((domain) => (
              <li
                key={domain.domain}
                style={{ color: domain.overconfidence_index > 0.1 ? '#fca5a5' : '#86efac' }}
              >
                {domain.domain}: brier {domain.brier_score.toFixed(3)}, overconfidence{' '}
                {domain.overconfidence_index.toFixed(3)} — {domain.recommendation}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
