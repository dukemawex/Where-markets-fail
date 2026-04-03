import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhereMarketsFail',
  description: 'Prediction market blind spot detection',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#020617', color: '#e2e8f0', minHeight: '100vh' }}>
        <header style={{ borderBottom: '1px solid #1e293b', padding: '16px 24px' }}>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link href="/">Home</Link>
            <Link href="/domains">Domains</Link>
            <Link href="/forecaster">Forecaster Tool</Link>
            <Link href="/api-docs">API Docs</Link>
          </nav>
        </header>
        <main style={{ padding: 24 }}>{children}</main>
        <footer style={{ borderTop: '1px solid #1e293b', padding: 24, marginTop: 24 }}>Powered by Metaculus data</footer>
      </body>
    </html>
  );
}
