/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { User, MapPin, Building2, Leaf, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

/* ── Toast ─────────────────────────────────────────────────────────────── */
interface ToastState { message: string; type: 'success' | 'error' }

function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const ok = toast.type === 'success';
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '13px 20px', borderRadius: 12,
      background: ok ? 'rgba(13,14,8,0.92)' : 'rgba(13,14,8,0.92)',
      border: `1px solid ${ok ? 'rgba(195,228,56,0.4)' : 'rgba(239,68,68,0.4)'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(12px)',
      animation: 'toastIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth: 340,
    }}>
      {ok
        ? <CheckCircle size={16} color="#c3e438" style={{ flexShrink: 0 }} />
        : <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
      }
      <span style={{ fontSize: 13, fontWeight: 500, color: ok ? '#c3e438' : '#f87171', lineHeight: 1.4 }}>
        {toast.message}
      </span>
    </div>
  );
}

/* ── Estilos compartilhados ─────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0ee', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const readonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.4)',
  cursor: 'default',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  colorScheme: 'dark',
  cursor: 'pointer',
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{hint}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color = '#c3e438' }: { icon: any; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={color} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ee', margin: 0 }}>{label}</p>
    </div>
  );
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
}

const LAND_TYPES = [
  { value: '', label: 'Selecionar...' },
  { value: 'AGRICULTURA', label: 'Agricultura familiar' },
  { value: 'EXTRATIVISMO', label: 'Extrativismo vegetal' },
  { value: 'PECUARIA', label: 'Pecuária' },
  { value: 'PESCA', label: 'Pesca e aquicultura' },
  { value: 'MISTO', label: 'Uso misto' },
];

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const OPT: React.CSSProperties = { background: '#0d0f07', color: '#f0f0ee' };

/* ── Componente principal ────────────────────────────────────────────────── */
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [form, setForm] = useState({
    name: '', cpf: '', phone: '', phone2: '',
    street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '',
    assocName: '', assocCnpj: '', assocRole: '',
    landSizeHa: '', landType: '',
    bio: '',
  });
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    api.users.me().then((u: any) => {
      setEmail(u.email ?? '');
      setWalletAddress(u.walletAddress ?? '');
      setForm({
        name: u.name ?? '',
        cpf: u.cpf ?? '',
        phone: u.phone ?? '',
        phone2: u.phone2 ?? '',
        street: u.street ?? '',
        addressNumber: u.addressNumber ?? '',
        complement: u.complement ?? '',
        neighborhood: u.neighborhood ?? '',
        city: u.city ?? '',
        state: u.state ?? '',
        zipCode: u.zipCode ?? '',
        assocName: u.assocName ?? '',
        assocCnpj: u.assocCnpj ?? '',
        assocRole: u.assocRole ?? '',
        landSizeHa: u.landSizeHa != null ? String(u.landSizeHa) : '',
        landType: u.landType ?? '',
        bio: u.bio ?? '',
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  /* ViaCEP */
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatCep(e.target.value);
    setForm(f => ({ ...f, zipCode: masked }));
  };

  const handleCepBlur = async () => {
    const digits = form.zipCode.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(f => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf?.toUpperCase() || f.state,
        }));
      }
    } catch {
      // silencia erro de rede
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.users.updateMe({
        ...form,
        landSizeHa: form.landSizeHa ? parseFloat(form.landSizeHa) : null,
      });
      showToast('Perfil salvo com sucesso!', 'success');
    } catch (err: any) {
      showToast(err?.message ?? 'Erro ao salvar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 120, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />)}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Meu Perfil</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
          Informações pessoais, endereço e dados da propriedade
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Dados pessoais */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
          <SectionTitle icon={User} label="Dados pessoais" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="profile-grid">
              <Field label="Nome completo">
                <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Seu nome completo" />
              </Field>
              <Field label="CPF">
                <input style={inputStyle} value={form.cpf}
                  onChange={e => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))}
                  placeholder="000.000.000-00" />
              </Field>
            </div>
            {email && (
              <Field label="E-mail (via conta)">
                <input style={readonlyStyle} value={email} readOnly tabIndex={-1} />
              </Field>
            )}
            {walletAddress && (
              <Field label="Carteira digital">
                <input style={readonlyStyle} value={walletAddress} readOnly tabIndex={-1} />
              </Field>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="profile-grid">
              <Field label="Telefone / WhatsApp">
                <input style={inputStyle} value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                  placeholder="(00) 90000-0000" />
              </Field>
              <Field label="Telefone 2 (opcional)">
                <input style={inputStyle} value={form.phone2}
                  onChange={e => setForm(f => ({ ...f, phone2: formatPhone(e.target.value) }))}
                  placeholder="(00) 90000-0000" />
              </Field>
            </div>
            <Field label="Sobre você (opcional)" hint="Uma breve descrição da sua atividade produtiva">
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={form.bio} onChange={set('bio')}
                placeholder="Ex: Produtor familiar de café orgânico há 15 anos na região do Alto Solimões..."
              />
            </Field>
          </div>
        </div>

        {/* Endereço */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
          <SectionTitle icon={MapPin} label="Endereço / Local de produção" color="#60a5fa" />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '8px 0 16px', lineHeight: 1.5 }}>
            Este endereço será usado como local de produção padrão ao cadastrar novas produções.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="profile-grid">
              <Field label={cepLoading ? 'CEP — buscando...' : 'CEP'}>
                <div style={{ position: 'relative' }}>
                  <input
                    style={inputStyle}
                    value={form.zipCode}
                    onChange={handleCepChange}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Loader2 size={14} color="rgba(255,255,255,0.4)"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', animation: 'spin 0.8s linear infinite' }} />
                  )}
                </div>
              </Field>
              <Field label="Estado (UF)">
                <select style={selectStyle} value={form.state} onChange={set('state')}>
                  <option value="" style={OPT}>Selecionar...</option>
                  {STATES.map(s => <option key={s} value={s} style={OPT}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Município / Cidade">
              <input style={inputStyle} value={form.city} onChange={set('city')} placeholder="Ex: Tefé" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="profile-grid">
              <Field label="Bairro / Comunidade">
                <input style={inputStyle} value={form.neighborhood} onChange={set('neighborhood')} placeholder="Ex: Rio Preto" />
              </Field>
              <Field label="Rua / Estrada / Ramal">
                <input style={inputStyle} value={form.street} onChange={set('street')} placeholder="Ex: Ramal do Castanho" />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }} className="profile-grid">
              <Field label="Número / KM">
                <input style={inputStyle} value={form.addressNumber} onChange={set('addressNumber')} placeholder="s/n" />
              </Field>
              <Field label="Complemento (opcional)">
                <input style={inputStyle} value={form.complement} onChange={set('complement')} placeholder="Ex: Sítio Santa Maria" />
              </Field>
            </div>
          </div>
        </div>

        {/* Associação */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
          <SectionTitle icon={Building2} label="Associação ou Cooperativa (opcional)" color="#4ade80" />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '8px 0 16px', lineHeight: 1.5 }}>
            Preencha se você faz parte de alguma associação, cooperativa ou organização.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome da organização">
              <input style={inputStyle} value={form.assocName} onChange={set('assocName')}
                placeholder="Ex: Cooperativa dos Produtores do Solimões" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="profile-grid">
              <Field label="CNPJ">
                <input style={inputStyle} value={form.assocCnpj}
                  onChange={e => setForm(f => ({ ...f, assocCnpj: formatCnpj(e.target.value) }))}
                  placeholder="00.000.000/0000-00" />
              </Field>
              <Field label="Seu cargo / função">
                <input style={inputStyle} value={form.assocRole} onChange={set('assocRole')}
                  placeholder="Ex: Associado, Diretor" />
              </Field>
            </div>
          </div>
        </div>

        {/* Terreno */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
          <SectionTitle icon={Leaf} label="Informações do terreno (opcional)" color="#c3e438" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }} className="profile-grid">
            <Field label="Área total (hectares)" hint="1 hectare = 10.000 m²">
              <input style={inputStyle} type="number" min="0" step="0.01"
                value={form.landSizeHa} onChange={set('landSizeHa')} placeholder="Ex: 12.5" />
            </Field>
            <Field label="Tipo de uso da terra">
              <select style={selectStyle} value={form.landType} onChange={set('landType')}>
                {LAND_TYPES.map(lt => <option key={lt.value} value={lt.value} style={OPT}>{lt.label}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <Button type="submit" loading={saving}
          style={{ padding: '10px 24px', alignSelf: 'flex-start', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={15} /> Salvar perfil
        </Button>
      </form>

      {toast && <Toast toast={toast} onDone={() => setToast(null)} />}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes toastIn{
          from{opacity:0;transform:translateY(12px) scale(0.96)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @media (max-width: 580px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
