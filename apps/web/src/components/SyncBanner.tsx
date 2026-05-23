/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { AlertTriangle, RefreshCw, CheckCircle, X } from 'lucide-react';
import { api } from '@/lib/api';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { Button } from '@/components/ui/button';

export function SyncBanner() {
  const [status, setStatus] = useState<{ blockchainEnabled: boolean; pendingOperations: number } | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);
  const [currentOp, setCurrentOp] = useState<any | null>(null);

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    api.sync.status().then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (txSuccess && currentOp && txHash) {
      api.sync.confirm(currentOp.id, txHash)
        .then(() => processNext())
        .catch(console.error);
    }
  }, [txSuccess]);

  const loadPending = async () => {
    const ops = await api.sync.pending();
    setPending(ops);
    return ops;
  };

  const processNext = async () => {
    const ops = await loadPending();
    if (ops.length === 0) { setSyncing(false); setDone(true); setCurrentOp(null); return; }
    await signOp(ops[0]);
  };

  const signOp = async (op: any) => {
    setCurrentOp(op);
    try {
      if (op.type === 'REGISTER_USER') {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: SELVA_ABI,
          functionName: 'registerUser',
          args: [op.params.name, op.params.cpf],
        });
      } else if (op.type === 'ADD_PRODUCT') {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: SELVA_ABI,
          functionName: 'addProduct',
          args: [op.params.lotId, BigInt(op.params.volume), op.params.origin, op.params.documentHash],
        });
      } else if (op.type === 'TRANSFER_PRODUCT') {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: SELVA_ABI,
          functionName: 'transferProduct',
          args: [op.params.lotId, op.params.toAddress],
        });
      }
    } catch (e) {
      console.error('Sync error:', e);
      setSyncing(false);
      setCurrentOp(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setDone(false);
    const ops = await loadPending();
    if (ops.length === 0) { setSyncing(false); setDone(true); return; }
    await signOp(ops[0]);
  };

  if (!status) return null;

  // Blockchain habilitado e sem pendências → sem banner
  if (status.blockchainEnabled && status.pendingOperations === 0) return null;

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-[#c3e438]/10 border border-[#c3e438]/20 px-4 py-3 text-sm text-[#c3e438]">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>Todas as operações foram sincronizadas com a blockchain.</span>
        <button onClick={() => setDone(false)} className="ml-auto text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-8 text-sm" style={{ padding: "6px" }}>
      <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
      <div className="flex-1 min-w-0">
        {!status.blockchainEnabled ? (
          <span className="text-yellow-300">
            <strong>Sem internet</strong> — dados salvos no aparelho.
          </span>
        ) : (
          <span className="text-yellow-300">
            <strong>{status.pendingOperations} operação(ões) pendente(s)</strong> de sincronização com a blockchain.
          </span>
        )}
        {currentOp && (
          <p className="text-yellow-400/70 text-xs mt-0.5">
            Assinando: {currentOp.type} — confirme no MetaMask...
          </p>
        )}
      </div>
      {status.pendingOperations > 0 && (
        <Button size="sm" variant="ghost" onClick={handleSync} loading={syncing} className="cursor-pointer" style={{ padding: "4px 12px" }}>
          <RefreshCw className="h-3 w-3" /> Enviar dados salvos
        </Button>
      )}
    </div>
  );
}
