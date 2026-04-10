import { type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PermissionGateProps {
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'generate_reports';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Esconde ou mostra elementos baseado na permissão do usuário logado.
 * Admin e Super_Admin sempre passam.
 *
 * Uso: <PermissionGate module="contracts" action="delete">...</PermissionGate>
 */
export default function PermissionGate({ module, action, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useAuth();
  return hasPermission(module, action) ? <>{children}</> : <>{fallback}</>;
}

/** Shorthand para verificar role */
export function RoleGate({ roles, children, fallback = null }: {
  roles: string[]; children: ReactNode; fallback?: ReactNode;
}) {
  const { hasRole } = useAuth();
  return hasRole(...roles) ? <>{children}</> : <>{fallback}</>;
}
