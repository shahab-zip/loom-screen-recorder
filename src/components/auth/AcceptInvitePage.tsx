import { useEffect, useState } from 'react';
import { invitesRepo } from '../../lib/repos/invites';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export function AcceptInvitePage({ token, onDone }: { token: string; onDone: () => void }) {
  const { state } = useAuth();
  const { switchWorkspace } = useWorkspace();
  const [status, setStatus] = useState<'idle'|'working'|'ok'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isAuthenticated || status !== 'idle') return;
    setStatus('working');
    invitesRepo.accept(token).then(async res => {
      if (res.error) { setError(res.error.message); setStatus('error'); return; }
      if (res.data?.workspace_id) switchWorkspace(res.data.workspace_id);
      setStatus('ok');
      setTimeout(onDone, 800);
    });
  }, [state.isAuthenticated, status, token, switchWorkspace, onDone]);

  if (!state.isAuthenticated) return <div className="p-8 text-center">Sign in to accept this invite.</div>;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        {status === 'working' && <p>Accepting invite…</p>}
        {status === 'ok' && <p className="text-green-600">Joined! Redirecting…</p>}
        {status === 'error' && <p className="text-red-600">Failed: {error}</p>}
      </div>
    </div>
  );
}
