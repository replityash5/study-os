import { LogIn, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { Button, Card } from '../ui';

export function AuthScreen() {
  const { signIn, continueLocally } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError('');
    try {
      await signIn();
    } catch {
      setError('Google sign-in was cancelled or unavailable. You can continue locally.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-white shadow-soft-purple">
          <Sparkles size={28} />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-primary">Study OS</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Your calmer study workspace</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-400">
          Keep your progress and notes synced while preparing with focus.
        </p>
        <Button
          disabled={busy}
          onClick={handleSignIn}
          className="mt-8 flex w-full items-center justify-center gap-2"
        >
          <LogIn size={18} />
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </Button>
        <button
          onClick={continueLocally}
          className="mt-4 text-sm font-semibold text-slate-400 underline-offset-4 hover:text-primary hover:underline"
        >
          Continue without signing in
        </button>
        {error && <p className="mt-4 text-xs text-amber-600">{error}</p>}
      </Card>
    </main>
  );
}
