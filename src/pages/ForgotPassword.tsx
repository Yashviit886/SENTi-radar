import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Radar, Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Radar className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
            <Mail className="mx-auto h-10 w-10 text-primary" />
            <p className="text-sm text-foreground">Check your email for a password reset link.</p>
            <Button variant="outline" onClick={() => navigate('/auth')}>Back to sign in</Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <button onClick={() => navigate('/auth')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto">
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
