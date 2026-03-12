import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, User, Bell, Trash2, Clock } from 'lucide-react';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<{ id: string; query: string; searched_at: string }[]>([]);
  const [alertPrefs, setAlertPrefs] = useState({
    crisis_threshold: 'medium',
    email_notifications: false,
  });

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }

    // Load profile
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    });

    // Load search history
    supabase.from('search_history').select('*').eq('user_id', user.id).order('searched_at', { ascending: false }).limit(20).then(({ data }) => {
      if (data) setSearchHistory(data);
    });

    // Load alert prefs
    supabase.from('user_alert_preferences').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setAlertPrefs({
          crisis_threshold: data.crisis_threshold,
          email_notifications: data.email_notifications,
        });
      }
    });
  }, [user, navigate]);

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName,
      avatar_url: avatarUrl,
    }).eq('id', user.id);
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated!' });
    }
  };

  const saveAlertPrefs = async () => {
    if (!user) return;
    const { error } = await supabase.from('user_alert_preferences').upsert({
      user_id: user.id,
      crisis_threshold: alertPrefs.crisis_threshold,
      email_notifications: alertPrefs.email_notifications,
    }, { onConflict: 'user_id' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Alert preferences saved!' });
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from('search_history').delete().eq('user_id', user.id);
    setSearchHistory([]);
    toast({ title: 'Search history cleared' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>

        {/* Profile Info */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4" /> Profile Information
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground">Email</Label>
              <Input disabled value={user?.email || ''} className="bg-muted/20" />
            </div>
            <div>
              <Label className="text-foreground">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label className="text-foreground">Avatar URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </section>

        {/* Alert Preferences */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4" /> Alert Preferences
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground">Crisis Alert Threshold</Label>
              <select
                value={alertPrefs.crisis_threshold}
                onChange={(e) => setAlertPrefs(p => ({ ...p, crisis_threshold: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Email Notifications</Label>
              <Switch
                checked={alertPrefs.email_notifications}
                onCheckedChange={(v) => setAlertPrefs(p => ({ ...p, email_notifications: v }))}
              />
            </div>
          </div>
          <Button onClick={saveAlertPrefs} variant="outline">Save Preferences</Button>
        </section>

        {/* Search History */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4" /> Search History
            </h2>
            {searchHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          {searchHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No searches yet.</p>
          ) : (
            <ul className="space-y-2">
              {searchHistory.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2 text-sm">
                  <span className="text-foreground">{s.query}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.searched_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sign Out */}
        <Button variant="destructive" onClick={handleSignOut} className="w-full">
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
