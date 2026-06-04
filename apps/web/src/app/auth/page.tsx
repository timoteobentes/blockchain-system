/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

const G = '#c3e438';

function formatCpf(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const css = `
  .sa { display:flex; min-height:100vh; background:#070a04; }

  .sa-brand {
    position:relative; width:42%; overflow:hidden;
    background-image:url('/back-home.jpg');
    background-size:cover; background-position:center 30%;
    display:flex; flex-direction:column; padding:48px 48px;
  }
  .sa-brand::before {
    content:''; position:absolute; inset:0;
    background:linear-gradient(155deg,rgba(4,10,1,.94) 0%,rgba(14,28,5,.86) 55%,rgba(8,18,2,.92) 100%);
    z-index:0;
  }
  .sa-bc { position:relative; z-index:1; display:flex; flex-direction:column; height:100%; }

  .sa-form {
    flex:1; display:flex; align-items:center; justify-content:center;
    padding:40px 32px; min-height:100vh;
  }
  .sa-fw { width:100%; max-width:420px; }

  .sa-card {
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09);
    border-radius:20px; padding:40px 36px;
  }

  .sa-inp {
    width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
    border-radius:10px; padding:13px 16px; color:#f0f0f0; font-size:15px; outline:none;
    transition:border-color .2s; font-family:inherit; box-sizing:border-box;
  }
  .sa-inp::placeholder { color:rgba(255,255,255,.28); }
  .sa-inp:focus { border-color:${G}; }

  .sa-btn {
    width:100%; background:${G}; color:#1a2200; font-weight:700; font-size:15px;
    border:none; border-radius:12px; padding:14px 24px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; gap:10px;
    transition:opacity .2s, transform .15s; font-family:inherit;
  }
  .sa-btn:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
  .sa-btn:disabled { opacity:.45; cursor:not-allowed; transform:none; }

  .sa-step { display:flex; align-items:center; gap:8px; margin-bottom:28px; }
  .sa-dot {
    width:28px; height:28px; border-radius:50%; display:flex;
    align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0;
  }
  .sa-dot-active { background:${G}; color:#1a2200; }
  .sa-dot-done { background:rgba(195,228,56,.18); border:1px solid rgba(195,228,56,.4); color:${G}; }
  .sa-dot-idle { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.3); }
  .sa-sep { flex:1; height:1px; background:rgba(255,255,255,.08); }

  .sa-feat { display:flex; align-items:flex-start; gap:12px; }
  .sa-fi {
    width:22px; height:22px; border-radius:50%; flex-shrink:0; margin-top:1px;
    background:rgba(195,228,56,.12); border:1px solid rgba(195,228,56,.28);
    display:flex; align-items:center; justify-content:center;
  }

  .sa-alert {
    display:flex; gap:10px; border-radius:10px; padding:12px 14px;
    font-size:13px; line-height:1.45; margin-bottom:14px;
  }
  .sa-alert-err { background:rgba(255,90,90,.08); border:1px solid rgba(255,90,90,.2); color:#ff8080; }
  .sa-alert-warn { background:rgba(195,228,56,.06); border:1px solid rgba(195,228,56,.18); color:rgba(195,228,56,.85); }
  .sa-alert-ok { background:rgba(100,220,100,.08); border:1px solid rgba(100,220,100,.25); color:#7dde7d; }

  .sa-mode {
    display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:20px;
    font-size:12px; font-weight:600; margin-bottom:22px;
  }
  .sa-mode-dot { width:7px; height:7px; border-radius:50%; }

  @keyframes sa-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .sa-spin { animation:sa-spin .9s linear infinite; }

  @media(max-width:767px) {
    .sa { flex-direction:column; }
    .sa-brand { width:100%; padding:28px 24px 24px; }
    .sa-brand-feats { display:none; }
    .sa-brand-quote { display:none; }
    .sa-form { min-height:auto; padding:24px 20px 48px; }
    .sa-card { padding:28px 20px; }
  }
  @media(min-width:768px) {
    .sa-brand-mobile { display:none; }
  }
`;

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, authenticate, loading, error, user } = useAuth();
  const [step, setStep] = useState<'entrar' | 'cadastrar'>('entrar');
  const [name, setName] = useState('');
  const [cpfRaw, setCpfRaw] = useState('');
  const [cpfOpcional, setCpfOpcional] = useState(false);
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [registerError, setRegisterError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.isRegistered) {
        setRedirecting(true);
        router.replace('/dashboard');
      } else {
        setStep('cadastrar');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleEntrar = async () => {
    try {
      const u = await authenticate();
      if (u?.isRegistered) router.replace('/dashboard');
      else setStep('cadastrar');
    } catch {}
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfRaw(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterStatus('loading');
    try {
      await api.sync.registerOffline({
        name,
        cpf: cpfOpcional ? undefined : cpfRaw || undefined,
      });
      setRegisterStatus('success');
      setRedirecting(true);
      router.replace('/dashboard');
    } catch (err: any) {
      setRegisterError(err?.message ?? 'Erro no cadastro');
      setRegisterStatus('error');
    }
  };

  const busy = loading || registerStatus === 'loading';

  if (redirecting) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070a04', gap: 20 }}>
        <style>{`@keyframes sa-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid rgba(195,228,56,0.2)', borderTopColor: '#c3e438', animation: 'sa-spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>Acessando o painel...</p>
      </div>
    );
  }

  const ModeTag = () => {
    if (!isOnline) return (
      <div className="sa-mode" style={{ background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.2)' }}>
        <div className="sa-mode-dot" style={{ background: '#fbbf24' }} />
        <span style={{ color: '#fbbf24' }}>Sem conexão — modo local</span>
      </div>
    );
    return (
      <div className="sa-mode" style={{ background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.18)' }}>
        <div className="sa-mode-dot" style={{ background: '#60a5fa' }} />
        <span style={{ color: '#60a5fa' }}>Modo Digital — dados no sistema</span>
      </div>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div className="sa">
        {/* Painel de apresentação */}
        <aside className="sa-brand">
          <div className="sa-bc">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-selva.png"
                alt="SELVA"
                style={{ width: 200, filter: 'grayscale(1) contrast(1.8) invert(1) drop-shadow(0 0 14px rgba(195,228,56,.35))', marginBottom: 40 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ color: '#f2f2f0', fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
                Rastreabilidade da produção <span style={{ color: G }}>Amazônica,</span> do campo ao mercado
              </h1>
              <p style={{ color: 'rgba(255,255,255,.48)', fontSize: 14.5, lineHeight: 1.65, marginBottom: 36 }}>
                Organize os dados da sua produção, comprove a origem e conecte sua produção ao mercado com um sistema digital simples e seguro.
              </p>
              <div className="sa-brand-feats" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  ['Cadastro simples, no celular', 'Registre suas informações em poucos minutos, sem instalar nada'],
                  ['Comprove a origem da sua produção', 'QR Code vinculado ao seu registro — escaneável por compradores e parceiros'],
                  ['Conecte-se ao mercado', 'Dados organizados para associações, compradores e programas de apoio ao produtor'],
                ].map(([title, desc]) => (
                  <div className="sa-feat" key={title}>
                    <div className="sa-fi">
                      <svg width="11" height="9" viewBox="0 0 12 10" fill="none">
                        <path d="M1.5 5l3 3 6-6" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ color: '#e5e5e3', fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{title}</p>
                      <p style={{ color: 'rgba(255,255,255,.38)', fontSize: 12.5 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sa-brand-quote" style={{ paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 32 }}>
              <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                &quot;Conectando a floresta ao mercado global com transparência e tecnologia.&quot;
              </p>
              <p style={{ color: 'rgba(195,228,56,.45)', fontSize: 11.5, marginTop: 7, fontWeight: 600, letterSpacing: '0.06em' }}>
                selva.eco.br
              </p>
            </div>
          </div>
        </aside>

        {/* Painel do formulário */}
        <main className="sa-form">
          <div className="sa-fw">
            {/* Cabeçalho mobile */}
            <div className="sa-brand-mobile" style={{ textAlign: 'center', marginBottom: 28 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-selva.png" alt="SELVA" style={{ width: 64, filter: 'grayscale(1) contrast(1.8) invert(1)', margin: '0 auto 10px' }} />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Rastreabilidade Amazônica</p>
            </div>

            <ModeTag />

            {/* Indicador de etapas */}
            <div className="sa-step">
              <div className={`sa-dot ${step === 'entrar' ? 'sa-dot-active' : 'sa-dot-done'}`}>
                {step === 'cadastrar' ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '1'}
              </div>
              <span style={{ fontSize: 12, color: step === 'entrar' ? '#f0f0f0' : 'rgba(195,228,56,.7)', fontWeight: step === 'entrar' ? 600 : 400 }}>
                Entrar
              </span>
              <div className="sa-sep" />
              <div className={`sa-dot ${step === 'cadastrar' ? 'sa-dot-active' : 'sa-dot-idle'}`}>
                {registerStatus === 'success' ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '2'}
              </div>
              <span style={{ fontSize: 12, color: step === 'cadastrar' ? '#f0f0f0' : 'rgba(255,255,255,.25)', fontWeight: step === 'cadastrar' ? 600 : 400 }}>
                Cadastrar
              </span>
            </div>

            <div className="sa-card">
              {/* Etapa 1: Entrar */}
              {step === 'entrar' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ width: 54, height: 54, background: 'rgba(195,228,56,.1)', border: '1px solid rgba(195,228,56,.22)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                      <svg width="26" height="22" viewBox="0 0 28 24" fill="none">
                        <rect x="1" y="5" width="26" height="16" rx="3" stroke={G} strokeWidth="2" />
                        <path d="M1 10h26" stroke={G} strokeWidth="2" />
                        <rect x="5" y="14" width="6" height="3" rx="1" fill={G} opacity=".6" />
                      </svg>
                    </div>
                    <h2 style={{ color: '#f2f2f0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                      Acessar a plataforma SELVA
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,.42)', fontSize: 13.5, lineHeight: 1.55 }}>
                      Entre com seu <strong style={{ color: 'rgba(255,255,255,.7)' }}>e-mail</strong>, <strong style={{ color: 'rgba(255,255,255,.7)' }}>celular (WhatsApp)</strong> ou <strong style={{ color: 'rgba(255,255,255,.7)' }}>conta Google</strong> — sem precisar instalar nada.
                    </p>
                  </div>

                  {error && (
                    <div className="sa-alert sa-alert-err">
                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      {error}
                    </div>
                  )}

                  {!isOnline && (
                    <div className="sa-alert sa-alert-warn">
                      <WifiOff size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      Você está sem conexão com a internet. Conecte-se para acessar a plataforma.
                    </div>
                  )}

                  <button className="sa-btn" onClick={handleEntrar} disabled={busy || !isOnline}>
                    {busy
                      ? <Loader2 size={18} className="sa-spin" />
                      : <Wifi size={18} />
                    }
                    {busy ? 'Acessando...' : 'Entrar na plataforma'}
                  </button>

                  <div style={{ marginTop: 20, padding: 16, background: 'rgba(195,228,56,.03)', border: '1px solid rgba(195,228,56,.07)', borderRadius: 10 }}>
                    <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>
                      Como funciona
                    </p>
                    {[
                      '1. Escolha como entrar: e-mail, celular ou Google',
                      '2. Confirme seu acesso — código enviado ou clique no link',
                      '3. Pronto — sistema liberado, sem instalar nada',
                    ].map(s => (
                      <p key={s} style={{ color: 'rgba(255,255,255,.32)', fontSize: 13, marginTop: 5 }}>{s}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Etapa 2: Cadastrar */}
              {step === 'cadastrar' && (
                <form onSubmit={handleCadastrar}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ width: 54, height: 54, background: 'rgba(195,228,56,.1)', border: '1px solid rgba(195,228,56,.22)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={G} strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="7" r="4" stroke={G} strokeWidth="2" />
                      </svg>
                    </div>
                    <h2 style={{ color: '#f2f2f0', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                      Criar seu cadastro
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,.42)', fontSize: 13 }}>
                      Dados básicos para começar — você completa o restante depois.
                    </p>
                  </div>

                  {registerStatus === 'success' && (
                    <div className="sa-alert sa-alert-ok" style={{ marginBottom: 16 }}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      Cadastro criado com sucesso! Redirecionando...
                    </div>
                  )}

                  {registerError && registerStatus === 'error' && (
                    <div className="sa-alert sa-alert-err">
                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      {registerError}
                    </div>
                  )}

                  {registerStatus !== 'success' && (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>
                          Nome completo *
                        </label>
                        <input
                          className="sa-inp"
                          placeholder="Maria da Silva"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                          autoComplete="name"
                          disabled={busy}
                        />
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>
                          CPF {cpfOpcional ? <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>(opcional)</span> : ''}
                        </label>
                        {!cpfOpcional && (
                          <input
                            className="sa-inp"
                            placeholder="000.000.000-00"
                            value={formatCpf(cpfRaw)}
                            onChange={handleCpfChange}
                            autoComplete="off"
                            inputMode="numeric"
                            disabled={busy}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => { setCpfOpcional(!cpfOpcional); setCpfRaw(''); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(195,228,56,.5)', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 18, textDecoration: 'underline' }}
                      >
                        {cpfOpcional ? 'Tenho CPF, quero informar' : 'Não tenho CPF agora, informar depois'}
                      </button>

                      <button
                        className="sa-btn"
                        type="submit"
                        disabled={!name.trim() || busy}
                      >
                        {busy && <Loader2 size={18} className="sa-spin" />}
                        {busy ? 'Cadastrando...' : 'Criar meu cadastro'}
                      </button>

                      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 12, marginTop: 14 }}>
                        Você poderá adicionar mais informações da sua produção depois.
                      </p>
                    </>
                  )}
                </form>
              )}
            </div>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.18)', fontSize: 12, marginTop: 20, lineHeight: 1.7 }}>
              Ao continuar você concorda com os{' '}
              <a
                href="https://www.selva.eco.br/lgpd.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(195,228,56,.4)', textDecoration: 'underline' }}
              >
                termos de uso e política de privacidade (LGPD)
              </a>{' '}
              da plataforma SELVA.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
