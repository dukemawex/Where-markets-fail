'use client';

import { useEffect, useState } from 'react';
import CalibrationChart from '../../components/CalibrationChart';

type DomainCalibration = {
  domain: string;
  brier_score: number;
  sample_size: number;
  confidence_cliff: number | null;
  overconfidence_index: number;
};

export default function DomainsPage() {
  const [rows, setRows] = useState<DomainCalibration[]>([]);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

  useEffect(() => {
    fetch(`${api}/api/domains/calibration`)
      .then((res) => res.json())
      .then((payload) => setRows(payload.data ?? []))
      .catch(() => setRows([]));
  }, [api]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1>Domain calibration</h1>
      <CalibrationChart data={rows} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Domain</th>
            <th align="left">Brier score</th>
            <th align="left">Sample size</th>
            <th align="left">Confidence cliff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.domain} style={{ color: row.overconfidence_index > 0.1 ? '#fca5a5' : '#86efac' }}>
              <td>{row.domain}</td>
              <td>{row.brier_score.toFixed(3)}</td>
              <td>{row.sample_size}</td>
              <td>{row.confidence_cliff ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
