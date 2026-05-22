'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Leaf, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { SELVA_ABI, CONTRACT_ADDRESS } from '@/contracts/abi';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, connectAndSign, loading, error, user } = useAuth();
  const [step, setStep] = useState<'connect' | 'register' | 'done'>('connect');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [txError, setTxError] = useState('');

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: txPending, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.isRegistered) router.replace('/dashboard');
      else setStep('register');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (txSuccess) router.replace('/dashboard');
  }, [txSuccess, router]);

  const handleConnect = async () => {
    try {
      const u = await connectAndSign();
      if (u?.isRegistered) router.replace('/dashboard');
      else setStep('register');
    } catch {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError('');
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SELVA_ABI,
        functionName: 'registerUser',
        args: [name, cpf],
      });
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? 'Erro na transação');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c3e438]">
              <Leaf className="h-8 w-8 text-[#252705]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">SELVA</h1>
          <p className="text-white/50 mt-1 text-sm">Rastreabilidade da Cadeia Produtiva Amazônica</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          {step === 'connect' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white">Entrar com MetaMask</h2>
                <p className="text-white/50 text-sm mt-1">Conecte sua carteira e assine uma mensagem para autenticar</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <Button className="w-full" size="lg" onClick={handleConnect} loading={loading}>
                <Wallet className="h-5 w-5" />
                Conectar MetaMask
              </Button>
            </div>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white">Cadastro na rede</h2>
                <p className="text-white/50 text-sm mt-1">Registre-se no contrato para usar o sistema</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" placeholder="Maria da Silva" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} required />
              </div>
              {txError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {txError}
                </div>
              )}
              {txPending && (
                <p className="text-center text-sm text-[#c3e438]">Aguardando confirmação na blockchain...</p>
              )}
              <Button className="w-full" size="lg" type="submit" loading={txPending} disabled={!name || !cpf}>
                Registrar na blockchain
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
