import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../lib/auth-types';

export function RouteGuard({
  permission, children,
}: { permission: Permission; children: ReactNode }) {
  const allowed = usePermission(permission);
  if (allowed) return <>{children}</>;
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <h2 className="text-xl font-semibold mb-2">You don't have access</h2>
        <p className="text-sm text-gray-600">Ask a workspace admin to grant you the required permission.</p>
      </div>
    </div>
  );
}
