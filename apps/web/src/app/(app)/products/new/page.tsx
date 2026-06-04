/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Wifi, WifiOff, User, Building2, TreePine, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { api } from '@/lib/api';
import { useConnectionMode } from '@/hooks/useConnectionMode';
import { useAuth } from '@/hooks/useAuth';

async function fileSha256(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return ('0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0ee', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const readonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.45)',
  cursor: 'default',
};

const ORIGIN_TYPES = [
  { value: 'PESSOA', label: 'Pessoa física', icon: User },
  { value: 'ASSOCIACAO', label: 'Associação', icon: Building2 },
  { value: 'COMUNIDADE', label: 'Comunidade', icon: TreePine },
];

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function composeOrigin(originType: string, fields: any): string {
  const { location, assocNome, assocCnpj, assocEndereco, assocResponsavel, comNome, comMunicipio, comLider } = fields;
  if (originType === 'ASSOCIACAO') {
    const parts = [assocNome, assocCnpj ? `CNPJ: ${assocCnpj}` : '', assocEndereco, assocResponsavel ? `Resp.: ${assocResponsavel}` : '', location].filter(Boolean);
    return parts.join(' — ');
  }
  if (originType === 'COMUNIDADE') {
    const { comCnpj } = fields;
    const parts = [comNome, comCnpj ? `CNPJ: ${comCnpj}` : '', comMunicipio, comLider ? `Liderança: ${comLider}` : '', location].filter(Boolean);
    return parts.join(' — ');
  }
  return location;
}

export default function NewProductPage() {
  const router = useRouter();
  const mode = useConnectionMode();
  const { user } = useAuth();

  const [userCpf, setUserCpf] = useState('');
  const [userCpfLoaded, setUserCpfLoaded] = useState(false);

  const [form, setForm] = useState({
    lotId: '', volume: '', originType: 'PESSOA',
    // Pessoa Física
    pessoaCpf: '',
    // Localização (todos os tipos)
    location: '',
    // Associação
    assocNome: '', assocCnpj: '', assocEndereco: '', assocResponsavel: '',
    // Comunidade
    comNome: '', comCnpj: '', comMunicipio: '', comLider: '',
  });

  const [docHash, setDocHash] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: txPending, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isOffline = mode.mode === 'OFFLINE';
  const isVerified = mode.mode === 'VERIFIED';

  // Busca CPF atual do usuário
  useEffect(() => {
    api.users.me().then((u: any) => {
      setUserCpf(u.cpf ?? '');
      setUserCpfLoaded(true);
    }).catch(() => setUserCpfLoaded(true));
  }, []);

  useEffect(() => {
    if (txSuccess) setStatus('success');
  }, [txSuccess]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDocHash(await fileSha256(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!docHash) { setError('Anexe o comprovante ou documento da produção'); return; }

    // Validações por tipo
    if (form.originType === 'ASSOCIACAO') {
      if (!form.assocNome || !form.assocCnpj || !form.assocEndereco) {
        setError('Preencha nome, CNPJ e endereço da associação'); return;
      }
    }
    if (form.originType === 'COMUNIDADE') {
      if (!form.comNome || !form.comMunicipio) {
        setError('Preencha nome e município da comunidade'); return;
      }
    }

    setStatus('loading');
    const origin = composeOrigin(form.originType, form);

    try {
      if (isVerified && CONTRACT_ADDRESS) {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: SELVA_ABI,
          functionName: 'addProduct',
          args: [form.lotId, BigInt(form.volume), origin, docHash],
        });
        return;
      }

      await api.sync.addProductOffline({
        lotId: form.lotId,
        volume: Number(form.volume),
        origin,
        documentHash: docHash,
        originType: form.originType,
      });
      setStatus('success');
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Erro ao registrar produção');
      setStatus('error');
    }
  };

  const isSuccess = status === 'success';
  const isBusy = status === 'loading' || txPending;

  if (isSuccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(195,228,56,0.15)', border: '1px solid rgba(195,228,56,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={28} color="#c3e438" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Produção registrada com sucesso!</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '8px 0 0' }}>
            {isVerified
              ? 'Registro confirmado e verificado na rede.'
              : 'Dados salvos no sistema. Você pode acessar e compartilhar o QR Code.'}
          </p>
        </div>
        <Button onClick={() => router.push('/products')} style={{ padding: '4px 12px', cursor: 'pointer' }}>Ver produções</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/products" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Registrar produção</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
            {isOffline ? 'Salvo no dispositivo até ter conexão' : isVerified ? 'Registro verificado na rede' : 'Salvo no sistema digital'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: `${mode.color}15`, border: `1px solid ${mode.color}28` }}>
          {isOffline ? <WifiOff size={13} color={mode.color} /> : <Wifi size={13} color={mode.color} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: mode.color }}>{mode.label}</span>
        </div>
      </div>

      {isOffline && (
        <div style={{ display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <WifiOff size={17} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', margin: '0 0 3px' }}>Sem conexão</p>
            <p style={{ fontSize: 12.5, color: 'rgba(251,191,36,0.75)', margin: 0, lineHeight: 1.55 }}>
              Os dados ficarão salvos e serão enviados ao sistema quando a conexão voltar.
            </p>
          </div>
        </div>
      )}

      {/* Formulário */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tipo de origem */}
          <Field label="Tipo de origem">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ORIGIN_TYPES.map(({ value, label, icon: Icon }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '8px 14px', borderRadius: 9, border: `1px solid ${form.originType === value ? 'rgba(195,228,56,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.originType === value ? 'rgba(195,228,56,0.08)' : 'transparent', transition: 'all 0.15s' }}>
                  <input type="radio" name="originType" value={value} checked={form.originType === value} onChange={e => setForm(f => ({ ...f, originType: e.target.value }))} style={{ display: 'none' }} />
                  <Icon size={13} color={form.originType === value ? '#c3e438' : 'rgba(255,255,255,0.4)'} />
                  <span style={{ fontSize: 13, color: form.originType === value ? '#c3e438' : 'rgba(255,255,255,0.6)' }}>{label}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* ── PESSOA FÍSICA ── */}
          {form.originType === 'PESSOA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'rgba(195,228,56,0.04)', border: '1px solid rgba(195,228,56,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <User size={13} color="#c3e438" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#c3e438' }}>Dados do produtor</span>
              </div>
              <Field label="Nome completo">
                <input style={readonlyStyle} value={user?.name ?? ''} readOnly tabIndex={-1} />
              </Field>
              <Field label="CPF" hint={!userCpf && userCpfLoaded ? 'CPF não cadastrado — adicione para uso em documentos.' : ''}>
                {userCpf ? (
                  <input style={readonlyStyle} value={userCpf} readOnly tabIndex={-1} />
                ) : (
                  <input
                    style={inputStyle}
                    placeholder="000.000.000-00"
                    value={form.pessoaCpf}
                    onChange={e => setForm(f => ({ ...f, pessoaCpf: formatCpf(e.target.value) }))}
                  />
                )}
              </Field>
              {!userCpf && userCpfLoaded && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Info size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
                    O CPF é opcional, mas necessário para emissão de documentos fiscais.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── ASSOCIAÇÃO ── */}
          {form.originType === 'ASSOCIACAO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={13} color="#60a5fa" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>Dados da associação</span>
              </div>
              <Field label="Nome da associação">
                <input
                  style={inputStyle} placeholder="ex: Assoc. dos Produtores do Rio Preto"
                  value={form.assocNome} onChange={e => setForm(f => ({ ...f, assocNome: e.target.value }))} required
                />
              </Field>
              <Field label="CNPJ">
                <input
                  style={inputStyle} placeholder="00.000.000/0000-00"
                  value={form.assocCnpj}
                  onChange={e => setForm(f => ({ ...f, assocCnpj: formatCnpj(e.target.value) }))} required
                />
              </Field>
              <Field label="Endereço">
                <input
                  style={inputStyle} placeholder="Rua / Comunidade, Município — Estado"
                  value={form.assocEndereco} onChange={e => setForm(f => ({ ...f, assocEndereco: e.target.value }))} required
                />
              </Field>
              <Field label="Nome do responsável">
                <input
                  style={inputStyle} placeholder="Nome completo do representante"
                  value={form.assocResponsavel} onChange={e => setForm(f => ({ ...f, assocResponsavel: e.target.value }))}
                />
              </Field>
            </div>
          )}

          {/* ── COMUNIDADE ── */}
          {form.originType === 'COMUNIDADE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <TreePine size={13} color="#4ade80" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>Dados da comunidade</span>
              </div>
              <Field label="Nome da comunidade">
                <input
                  style={inputStyle} placeholder="ex: Comunidade Tradicional São João"
                  value={form.comNome} onChange={e => setForm(f => ({ ...f, comNome: e.target.value }))} required
                />
              </Field>
              <Field label="CNPJ (opcional)">
                <input
                  style={inputStyle} placeholder="00.000.000/0000-00"
                  value={form.comCnpj}
                  onChange={e => setForm(f => ({ ...f, comCnpj: formatCnpj(e.target.value) }))}
                />
              </Field>
              <Field label="Município / Localidade">
                <input
                  style={inputStyle} placeholder="ex: Tefé — AM"
                  value={form.comMunicipio} onChange={e => setForm(f => ({ ...f, comMunicipio: e.target.value }))} required
                />
              </Field>
              <Field label="Liderança comunitária (opcional)">
                <input
                  style={inputStyle} placeholder="Nome do líder ou representante"
                  value={form.comLider} onChange={e => setForm(f => ({ ...f, comLider: e.target.value }))}
                />
              </Field>
            </div>
          )}

          {/* Campos comuns a todos os tipos */}
          <Field label="Código da produção">
            <input
              style={inputStyle} placeholder="ex: COPA-2025-001"
              value={form.lotId} onChange={e => setForm(f => ({ ...f, lotId: e.target.value }))} required
            />
          </Field>

          <Field label="Quantidade produzida (litros ou kg)">
            <input
              style={inputStyle} type="number" min="1" placeholder="500"
              value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} required
            />
          </Field>

          <Field label="Local de extração / produção">
            <input
              style={inputStyle} placeholder="ex: Manaus/AM — Comunidade Rio Preto"
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required
            />
          </Field>

          <Field label="Comprovante ou documento (PDF, foto)">
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '28px 16px', borderRadius: 11, cursor: 'pointer', transition: 'all 0.15s',
              border: `2px dashed ${docHash ? 'rgba(195,228,56,0.4)' : 'rgba(255,255,255,0.15)'}`,
              background: docHash ? 'rgba(195,228,56,0.06)' : 'transparent',
            }}>
              <input type="file" style={{ display: 'none' }} onChange={handleFile} />
              {docHash ? (
                <>
                  <CheckCircle size={22} color="#c3e438" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#c3e438' }}>{fileName}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Documento registrado</span>
                </>
              ) : (
                <>
                  <Upload size={22} color="rgba(255,255,255,0.3)" />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Toque para anexar documento</span>
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)' }}>Foto, PDF ou imagem</span>
                </>
              )}
            </label>
          </Field>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
            </div>
          )}

          {txPending && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c3e438', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#c3e438' }}>Aguardando confirmação do registro...</span>
            </div>
          )}

          <Button type="submit" size="lg" loading={isBusy} style={{ width: '100%', marginTop: 4, cursor: 'pointer' }}>
            {isVerified ? 'Registrar com verificação' : 'Salvar produção'}
          </Button>
        </form>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
