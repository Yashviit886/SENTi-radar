import { Bell } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '@/hooks/useRealtimeData';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ThemeToggle';

const DashboardHeader = () => {
  const { data: alerts } = useAlerts();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unreadCount = alerts?.filter((a) => !a.is_read).length || 0;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex flex-1 items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded overflow-hidden">
          <img src="/logo.png" alt="Sentiment Radar Logo" className="h-full w-full object-cover" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-tight tracking-tight">Sentiment Radar</h1>
          <p className="text-[10px] text-muted-foreground tracking-wide">Real-time sentiment intelligence platform</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ExportMenu />
        <ThemeToggle />

        <button className="relative rounded border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {!user && (
          <button
            onClick={() => navigate('/auth')}
            className="rounded border border-border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
