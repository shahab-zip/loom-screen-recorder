import { useEffect, useState } from 'react';
import { profilesRepo, type ProfileRow } from '../lib/repos/profiles';
import { useAuth } from '../contexts/AuthContext';

export function SuperAdminPanel() {
  const { state } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profilesRepo.listAll().then(res => {
      setUsers((res.data ?? []) as ProfileRow[]);
      setLoading(false);
    });
  }, []);

  if (!state.currentUser?.isSuperAdmin) {
    return <div className="p-8 text-center text-sm text-gray-500">Super admin only.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-6">All users</h1>
        {loading ? <p className="text-gray-500">Loading…</p> : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Super admin</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-5 py-3 text-sm">{u.is_super_admin ? 'Yes' : 'No'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
