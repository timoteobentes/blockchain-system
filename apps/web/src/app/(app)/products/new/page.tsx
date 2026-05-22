'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';
import { useAuth } from '@/hooks/useAuth';

async function fileSha256(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return ('0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { address } = useAccount();
  const [form, setForm] = useState({ lotId: '', volume: '', origin: '' });
  const [docHash, setDocHash] = useState<`0x${string}` | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: txPending, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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

  if (txSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#c3e438]/20">
          <CheckCircle className="h-8 w-8 text-[#c3e438]" />
        </div>
        <h2 className="text-xl font-bold text-white">Lote registrado com sucesso!</h2>
        <p className="text-white/50 text-sm">A transação foi confirmada na Polygon Amoy.</p>
        <Button onClick={() => router.push('/products')}>Ver lotes</Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/products"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Lote</h1>
          <p className="text-white/50 text-sm">Registrar lote na blockchain</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lotId">ID do Lote</Label>
              <Input id="lotId" placeholder="ex: COPA-2025-001" value={form.lotId} onChange={e => setForm(f => ({ ...f, lotId: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volume (litros)</Label>
              <Input id="volume" type="number" min="1" placeholder="500" value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin">Origem</Label>
              <Input id="origin" placeholder="ex: Copaifera langsdorffii — Manaus/AM" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} required />
            </div>

            {/* Document upload */}
            <div className="space-y-2">
              <Label>Documento / Licença</Label>
              <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${docHash ? 'border-[#c3e438]/50 bg-[#c3e438]/5' : 'border-white/20 hover:border-white/40'}`}>
                <input type="file" className="hidden" onChange={handleFile} />
                {docHash ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-[#c3e438]" />
                    <span className="text-sm text-[#c3e438] font-medium">{fileName}</span>
                    <span className="text-xs text-white/30 font-mono truncate w-full text-center">{docHash}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-white/30" />
                    <span className="text-sm text-white/50">Clique para fazer upload</span>
                    <span className="text-xs text-white/30">SHA-256 calculado no navegador</span>
                  </>
                )}
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {txPending && <p className="text-center text-sm text-[#c3e438]">Aguardando confirmação na blockchain...</p>}

            <Button type="submit" className="w-full" size="lg" loading={txPending}>
              Registrar na blockchain
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
