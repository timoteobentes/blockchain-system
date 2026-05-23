/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { api } from '@/lib/api';

async function fileSha256(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return ('0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0ee', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const ORIGIN_TYPES = [
  { value: 'PESSOA', label: 'Pessoa física' },
  { value: 'ASSOCIACAO', label: 'Associação' },
  { value: 'COMUNIDADE', label: 'Comunidade' },
];

export default function NewProductPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [form, setForm] = useState({ lotId: '', volume: '', origin: '', originType: 'PESSOA' });
  const [docHash, setDocHash] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineResult, setOfflineResult] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: txPending, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    api.sync.status().then(s => {
      setOfflineMode(!s.blockchainEnabled || !CONTRACT_ADDRESS);
    }).catch(() => setOfflineMode(true));
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDocHash(await fileSha256(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!docHash) { setError('Anexe o documento de licença'); return; }
    if (!address) { setError('Carteira digital não conectada'); return; }

    if (offlineMode) {
      setOfflineResult('loading');
      try {
        await api.sync.addProductOffline({
          lotId: form.lotId,
          volume: Number(form.volume),
          origin: form.origin,
          documentHash: docHash,
          producerAddress: address,
          originType: form.originType,
        });
        setOfflineResult('success');
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao registrar');
        setOfflineResult('error');
      }
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SELVA_ABI,
        functionName: 'addProduct',
        args: [form.lotId, BigInt(form.volume), form.origin, docHash],
      });
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Erro na transação');
    }
  };

  const isSuccess = txSuccess || offlineResult === 'success';
  const isBusy = txPending || offlineResult === 'loading';

  if (isSuccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(195,228,56,0.15)', border: '1px solid rgba(195,228,56,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={28} color="#c3e438" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Produção registrada com sucesso!</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '8px 0 0' }}>
            {offlineResult === 'success'
              ? 'Salvo localmente. Será enviado para o sistema de rastreabilidade quando disponível.'
              : 'Registro confirmado na rede de verificação.'}
          </p>
        </div>
        <Button onClick={() => router.push('/products')} style={{ padding: "4px 12px", cursor: "pointer" }}>Ver produções</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/products" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Cadastrar produção</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
            {offlineMode ? 'Salvo localmente até ter conexão' : 'Registrar no sistema de rastreabilidade'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: offlineMode ? 'rgba(251,191,36,0.1)' : 'rgba(195,228,56,0.1)', border: `1px solid ${offlineMode ? 'rgba(251,191,36,0.2)' : 'rgba(195,228,56,0.2)'}` }}>
          {offlineMode ? <WifiOff size={13} color="#fbbf24" /> : <Wifi size={13} color="#c3e438" />}
          <span style={{ fontSize: 11, fontWeight: 600, color: offlineMode ? '#fbbf24' : '#c3e438' }}>
            {offlineMode ? 'Sem conexão' : 'Online'}
          </span>
        </div>
      </div>

      {offlineMode && (
        <div style={{ display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <WifiOff size={17} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', margin: '0 0 3px' }}>Modo sem conexão ativado</p>
            <p style={{ fontSize: 12.5, color: 'rgba(251,191,36,0.75)', margin: 0, lineHeight: 1.55 }}>
              As informações ficarão salvas e serão enviadas para o sistema de rastreabilidade quando a conexão voltar.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Tipo de cadastro">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ORIGIN_TYPES.map(({ value, label }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '8px 14px', borderRadius: 9, border: `1px solid ${form.originType === value ? 'rgba(195,228,56,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.originType === value ? 'rgba(195,228,56,0.08)' : 'transparent', transition: 'all 0.15s' }}>
                  <input type="radio" name="originType" value={value} checked={form.originType === value} onChange={e => setForm(f => ({ ...f, originType: e.target.value }))} style={{ accentColor: '#c3e438' }} />
                  <span style={{ fontSize: 13, color: form.originType === value ? '#c3e438' : 'rgba(255,255,255,0.6)' }}>{label}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Código da produção">
            <input
              style={inputStyle} placeholder="ex: COPA-2025-001"
              value={form.lotId} onChange={e => setForm(f => ({ ...f, lotId: e.target.value }))} required
            />
          </Field>

          <Field label="Quantidade produzida (litros)">
            <input
              style={inputStyle} type="number" min="1" placeholder="500"
              value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} required
            />
          </Field>

          <Field label="Local de origem da produção">
            <input
              style={inputStyle} placeholder="ex: Copaifera langsdorffii — Manaus/AM"
              value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} required
            />
          </Field>

          <Field label="Documento ou comprovante (PDF, imagem, etc.)">
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
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                    {docHash.slice(0, 20)}...{docHash.slice(-8)}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={22} color="rgba(255,255,255,0.3)" />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Clique para anexar documento</span>
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)' }}>Comprovante digital gerado automaticamente</span>
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

          <Button type="submit" size="lg" loading={isBusy} style={{ width: '100%', marginTop: 4, cursor: "pointer" }}>
            {offlineMode ? 'Salvar cadastro' : 'Registrar produção'}
          </Button>
        </form>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
