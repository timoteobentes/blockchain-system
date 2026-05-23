/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, AlertCircle, CheckCircle, Wifi, WifiOff, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { api } from '@/lib/api';

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

type LookupState = 'idle' | 'searching' | 'found' | 'not-found' | 'error';

interface Recipient {
  isProducer: any;
  name: string;
  walletAddress: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0ee', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  letterSpacing: '0.05em',
};

export default function TransferPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const router = useRouter();
  const { address } = useAccount();
  const [cpf, setCpf] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupError, setLookupError] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineResult, setOfflineResult] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: txPending, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    api.sync.status().then(s => {
      setOfflineMode(!s.blockchainEnabled || !CONTRACT_ADDRESS);
    }).catch(() => setOfflineMode(true));
  }, []);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCpf(e.target.value);
    setCpf(masked);
    setRecipient(null);
    setLookupError('');

    const digits = masked.replace(/\D/g, '');
    if (digits.length < 11) {
      setLookupState('idle');
      return;
    }

    // Auto-lookup with debounce when 11 digits entered
    setLookupState('searching');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await api.users.lookupByCpf(masked);
        // Prevent transfer to self
        if (result.walletAddress.toLowerCase() === address?.toLowerCase()) {
          setLookupState('error');
          setLookupError('Você não pode transferir uma produção para você mesmo.');
          return;
        }
        setRecipient(result);
        setLookupState('found');
      } catch (err: any) {
        if (err?.message?.includes('não encontrado') || err?.message?.includes('404')) {
          setLookupState('not-found');
          setLookupError('Nenhum produtor encontrado com este CPF. Verifique se ele está cadastrado no sistema.');
        } else {
          setLookupState('error');
          setLookupError(err?.message ?? 'Erro ao buscar produtor. Tente novamente.');
        }
      }
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient) return;
    setSubmitError('');

    if (offlineMode) {
      setOfflineResult('loading');
      try {
        await api.sync.transferOffline({
          lotId: lotId as string,
          fromAddress: address!,
          toAddress: recipient.walletAddress,
        });
        setOfflineResult('success');
      } catch (err: any) {
        setSubmitError(err?.message ?? 'Erro ao registrar transferência');
        setOfflineResult('error');
      }
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SELVA_ABI,
        functionName: 'transferProduct',
        args: [lotId, recipient.walletAddress as `0x${string}`],
      });
    } catch (err: any) {
      setSubmitError(err?.shortMessage ?? err?.message ?? 'Erro ao registrar transferência');
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
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Transferência registrada!</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '8px 0 0' }}>
            {offlineResult === 'success'
              ? 'Salvo localmente. Será enviado para o sistema de rastreabilidade quando a conexão voltar.'
              : 'Responsabilidade transferida com sucesso.'}
          </p>
          {recipient && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '6px 0 0' }}>
              Novo responsável: <strong style={{ color: '#c3e438' }}>{recipient.name}</strong>
            </p>
          )}
        </div>
        <Button onClick={() => router.push(`/products/${lotId}`)} style={{ cursor: 'pointer' }}>Ver produção</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/products/${lotId}`} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Transferir produção</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lotId}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: offlineMode ? 'rgba(251,191,36,0.1)' : 'rgba(195,228,56,0.1)', border: `1px solid ${offlineMode ? 'rgba(251,191,36,0.2)' : 'rgba(195,228,56,0.2)'}` }}>
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
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', margin: '0 0 3px' }}>Modo sem conexão</p>
            <p style={{ fontSize: 12.5, color: 'rgba(251,191,36,0.75)', margin: 0, lineHeight: 1.55 }}>
              A transferência será salva e enviada para o sistema de rastreabilidade quando a conexão voltar.
            </p>
          </div>
        </div>
      )}

      {/* Form card */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              CPF do novo responsável
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 40 }}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                inputMode="numeric"
                autoComplete="off"
              />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }}>
                {lookupState === 'searching'
                  ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c3e438', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                  : <Search size={16} />
                }
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Digite o CPF cadastrado no sistema SELVA
            </p>
          </div>

          {/* Lookup result */}
          {lookupState === 'found' && recipient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(195,228,56,0.07)', border: '1px solid rgba(195,228,56,0.25)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(195,228,56,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} color="#c3e438" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#c3e438', margin: '0 0 2px' }}>{recipient.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {recipient.isProducer ? 'Produtor cadastrado' : 'Usuário cadastrado'} · encontrado ✓
                </p>
              </div>
            </div>
          )}

          {(lookupState === 'not-found' || lookupState === 'error') && lookupError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#f87171' }}>{lookupError}</span>
            </div>
          )}

          {submitError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#f87171' }}>{submitError}</span>
            </div>
          )}

          {txPending && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c3e438', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#c3e438' }}>Aguardando confirmação do registro...</span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={isBusy}
            disabled={lookupState !== 'found' || !recipient}
            style={{ width: '100%', marginTop: 4, cursor: lookupState === 'found' ? 'pointer' : 'not-allowed' }}
          >
            <ArrowRightLeft size={15} />
            {offlineMode ? 'Salvar transferência' : 'Confirmar transferência'}
          </Button>
        </form>
      </div>

      {/* Warning */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <AlertCircle size={15} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
          Após a transferência, você deixará de ser o responsável por esta produção.
          O novo responsável passará a ter o controle completo do registro. Esta ação não pode ser desfeita.
        </p>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
