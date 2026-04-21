import { useEffect, useState, useCallback } from 'react';
import { invitesRepo, type InviteRow } from '../lib/repos/invites';
import { RoleBadge } from './RoleBadge';
import { usePermission } from '../hooks/usePermission';

export function InviteListPanel({ workspaceId, refreshKey = 0 }: { workspaceId: string; refreshKey?: number }) {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const canRevoke = usePermission('workspace:manage-members');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await invitesRepo.listByWorkspace(workspaceId);
    setRows((res.data ?? []) as InviteRow[]);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function revoke(id: string) {
    await invitesRepo.revoke(id);
    load();
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading invites…</div>;
  if (rows.length === 0) return <div className="p-4 text-sm text-gray-500">No invites yet.</div>;

  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left border-b"><th className="py-2">Email</th><th>Role</th><th>Status</th><th>Expires</th><th/></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b">
            <td className="py-2">{r.email}</td>
            <td><RoleBadge role={r.role} /></td>
            <td>{r.status}</td>
            <td>{new Date(r.expires_at).toLocaleDateString()}</td>
            <td className="text-right">
              {canRevoke && r.status === 'pending' && (
                <button onClick={() => revoke(r.id)} className="text-red-600 hover:underline">Revoke</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
