'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { shortenAddress } from '@/lib/utils';

export default function TransferPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const router = useRouter();
  const [newOwner, setNewOwner] = useState('');
  const [error, setError] = useState('');

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: txPending, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isAddress(newOwner)) { setError('Endereço Ethereum inválido'); return; }
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

  if (txSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#c3e438]/20">
          <CheckCircle className="h-8 w-8 text-[#c3e438]" />
        </div>
        <h2 className="text-xl font-bold text-white">Transferência realizada!</h2>
        <p className="text-white/50 text-sm">A custódia foi transferida com sucesso.</p>
        <Button onClick={() => router.push(`/products/${lotId}`)}>Ver lote</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/products/${lotId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Transferir Custódia</h1>
          <p className="text-white/50 text-sm font-mono">{lotId}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newOwner">Endereço do novo proprietário</Label>
              <Input
                id="newOwner"
                placeholder="0x..."
                value={newOwner}
                onChange={e => setNewOwner(e.target.value)}
                className="font-mono"
                required
              />
              {newOwner && isAddress(newOwner) && (
                <p className="text-xs text-[#c3e438]">✓ Endereço válido: {shortenAddress(newOwner)}</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {txPending && <p className="text-center text-sm text-[#c3e438]">Aguardando confirmação na blockchain...</p>}

            <Button type="submit" className="w-full" size="lg" loading={txPending} disabled={!isAddress(newOwner)}>
              <ArrowRightLeft className="h-4 w-4" /> Transferir propriedade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
