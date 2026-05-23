'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, ConfigProvider, theme as antdTheme } from 'antd';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { WalletStatus } from '@/components/WalletStatus';
import { NetworkGuard } from '@/components/NetworkGuard';
import { SyncBanner } from '@/components/SyncBanner';
import { useAuth } from '@/hooks/useAuth';

const { Sider } = Layout;

const SIDEBAR_W = 256;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (initialized && !isAuthenticated) router.replace('/auth');
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#080a05' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid #c3e438', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const sidebarVisible = !collapsed;
  const contentMargin = !isMobile && sidebarVisible ? SIDEBAR_W : 0;

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: '#c3e438',
          colorBgContainer: '#060805',
          colorBgLayout: '#080a05',
          colorText: '#f0f0ee',
          colorBorder: 'rgba(255,255,255,0.08)',
          borderRadius: 10,
        },
        components: {
          Layout: {
            siderBg: '#060805',
            bodyBg: '#080a05',
          },
        },
      }}
    >
      <NetworkGuard>
        <div style={{ minHeight: '100vh', background: '#080a05', position: 'relative' }}>
          {/* Mobile backdrop */}
          {isMobile && sidebarVisible && (
            <div
              onClick={() => setCollapsed(true)}
              style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            />
          )}

          {/* Sidebar */}
          <Sider
            width={SIDEBAR_W}
            collapsedWidth={0}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            breakpoint="lg"
            onBreakpoint={(broken) => {
              setIsMobile(broken);
              setCollapsed(broken);
            }}
            trigger={null}
            style={{
              position: 'fixed',
              height: '100vh',
              zIndex: 110,
              overflow: 'hidden',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              transition: 'width 0.2s',
            }}
          >
            <Sidebar onClose={() => setCollapsed(true)} />
          </Sider>

          {/* Content area */}
          <div style={{
            marginLeft: contentMargin,
            transition: 'margin-left 0.2s',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <header style={{
              position: 'sticky', top: 0, zIndex: 20,
              display: 'flex', alignItems: 'center', height: 60,
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(8,10,5,0.92)', backdropFilter: 'blur(12px)',
              padding: '0 20px', gap: 12,
            }}>
              <button
                onClick={() => setCollapsed(c => !c)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {sidebarVisible
                  ? <PanelLeftClose size={17} />
                  : <PanelLeftOpen size={17} />
                }
              </button>
              <div style={{ flex: 1 }} />
              <WalletStatus />
            </header>

            <main style={{ flex: 1, padding: '20px 16px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
              className="md:px-6 md:py-6">
              <div style={{ marginBottom: 16 }}><SyncBanner /></div>
              {children}
            </main>
          </div>
        </div>
      </NetworkGuard>
    </ConfigProvider>
  );
}
