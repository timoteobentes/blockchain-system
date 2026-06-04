import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/components/Providers';
import '../styles/globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SELVA — Rastreabilidade Amazônica',
  description: 'Sistema Estruturado Legal de Valores Amazônicos — rastreabilidade da cadeia produtiva',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
