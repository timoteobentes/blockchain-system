import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'SELVA — Rastreabilidade Amazônica',
  description: 'Sistema Estruturado Legal de Valores Amazônicos — rastreabilidade da cadeia produtiva',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
