'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { isAddress } from 'viem';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { shortenAddress } from '@/lib/utils';
import { api } from '@/lib/api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0ee', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'monospace',
};

export default function TransferPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const router = useRouter();
  const { address } = useAccount();
  const [newOwner, setNewOwner] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isAddress(newOwner)) { setError('Endereço Ethereum inválido'); return; }
    if (!address) { setError('Carteira não conectada'); return; }

    if (offlineMode) {
      setOfflineResult('loading');
      try {
        await api.sync.transferOffline({
          lotId: lotId as string,
          fromAddress: address,
          toAddress: newOwner,
        });
        setOfflineResult('success');
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao registrar transferência offline');
        setOfflineResult('error');
      }
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SELVA_ABI,
        functionName: 'transferProduct',
        args: [lotId, newOwner as `0x${string}`],
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
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Transferência realizada!</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '8px 0 0' }}>
            {offlineResult === 'success'
              ? 'Salvo no banco de dados. Será sincronizado com a blockchain em breve.'
              : 'Custódia transferida com sucesso na blockchain.'}
          </p>
        </div>
        <Button onClick={() => router.push(`/products/${lotId}`)}>Ver lote</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/products/${lotId}`} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Transferir Custódia</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lotId}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: offlineMode ? 'rgba(251,191,36,0.1)' : 'rgba(195,228,56,0.1)', border: `1px solid ${offlineMode ? 'rgba(251,191,36,0.2)' : 'rgba(195,228,56,0.2)'}` }}>
          {offlineMode ? <WifiOff size={13} color="#fbbf24" /> : <Wifi size={13} color="#c3e438" />}
          <span style={{ fontSize: 11, fontWeight: 600, color: offlineMode ? '#fbbf24' : '#c3e438' }}>
            {offlineMode ? 'Offline' : 'Online'}
          </span>
        </div>
      </div>

      {offlineMode && (
        <div style={{ display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <WifiOff size={17} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', margin: '0 0 3px' }}>Modo offline ativo</p>
            <p style={{ fontSize: 12.5, color: 'rgba(251,191,36,0.75)', margin: 0, lineHeight: 1.55 }}>
              A transferência será salva e sincronizada com a blockchain quando disponível.
            </p>
          </div>
        </div>
      )}

      {/* Form card */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Novo proprietário
            </label>
            <input
              style={inputStyle}
              placeholder="0x..."
              value={newOwner}
              onChange={e => setNewOwner(e.target.value)}
              required
            />
            {newOwner && isAddress(newOwner) && (
              <p style={{ fontSize: 12, color: '#c3e438', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={12} /> Endereço válido: {shortenAddress(newOwner)}
              </p>
            )}
            {newOwner && !isAddress(newOwner) && newOwner.length > 5 && (
              <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>Endereço inválido</p>
            )}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
            </div>
          )}

          {txPending && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c3e438', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#c3e438' }}>Aguardando confirmação na blockchain...</span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={isBusy}
            disabled={!isAddress(newOwner)}
            style={{ width: '100%', marginTop: 4 }}
          >
            <ArrowRightLeft size={15} />
            {offlineMode ? 'Registrar transferência offline' : 'Transferir propriedade'}
          </Button>
        </form>
      </div>

      {/* Warning */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <AlertCircle size={15} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
          Após a transferência, você perderá a custódia deste lote. Esta ação é irreversível na blockchain.
        </p>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
