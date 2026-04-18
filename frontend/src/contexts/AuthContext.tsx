import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../services/api';

export interface Organization {
  id: number;
  name: string;
  org_type: string;
  email?: string;
}

export interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_generate_reports: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'agent';
  avatar_url?: string;
  is_active: boolean;
  is_deletable: boolean;
  permissions: Permission[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  organizations: Organization[];
  selectedOrgId: number | null;
  requiresOrgSelection: boolean;
}

interface AuthContextType extends AuthState {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  logout: () => void;
  selectOrg: (orgId: number) => Promise<void>;
  createOrgAndJoin: (orgData: { name: string; org_type: string; cnpj?: string; email?: string; phone?: string }) => Promise<void>;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'generate_reports') => boolean;
  hasRole: (...roles: string[]) => boolean;
  selectedOrg: Organization | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'sgi_token';
const AUTH_KEY = 'sgi_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    organizations: [],
    selectedOrgId: null,
    requiresOrgSelection: false,
  });

  // Inject Authorization token in all requests
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

  // 401 → logout
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (saved && token) {
      try {
        const parsed = JSON.parse(saved);
        setState({ ...parsed, token });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const _applyAuthResponse = (data: any) => {
    const token = data.access_token;
    const authState: AuthState = {
      token,
      user: data.user,
      organizations: data.organizations,
      selectedOrgId: data.selected_org_id ?? null,
      requiresOrgSelection: data.requires_org_selection,
    };
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    localStorage.setItem(AUTH_KEY, JSON.stringify({
      user: authState.user,
      organizations: authState.organizations,
      selectedOrgId: authState.selectedOrgId,
      requiresOrgSelection: authState.requiresOrgSelection,
    }));
    setState(authState);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    _applyAuthResponse(data);
  }, []);

  const loginWithGoogle = useCallback(async (googleToken: string) => {
    const { data } = await api.post('/auth/google', { token: googleToken });
    _applyAuthResponse(data);
  }, []);

  const selectOrg = useCallback(async (orgId: number) => {
    const { data } = await api.post('/auth/select-org', { organization_id: orgId });
    _applyAuthResponse(data);
  }, []);

  const createOrgAndJoin = useCallback(async (orgData: any) => {
    const { data } = await api.post('/auth/organizations', { org: orgData });
    _applyAuthResponse(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    setState({ token: null, user: null, organizations: [], selectedOrgId: null, requiresOrgSelection: false });
  }, []);

  const hasPermission = useCallback((
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'generate_reports'
  ): boolean => {
    if (!state.user) return false;
    if (state.user.role === 'super_admin' || state.user.role === 'admin') return true;

    const perms = state.user.permissions;
    const actionKey = `can_${action}` as keyof Permission;

    // Check wildcard first
    const wildcard = perms.find((p) => p.module === '*');
    if (wildcard && wildcard[actionKey]) return true;

    // Check specific module
    const specific = perms.find((p) => p.module === module);
    if (specific && specific[actionKey]) return true;

    return false;
  }, [state.user]);

  const hasRole = useCallback((...roles: string[]): boolean => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  const selectedOrg = state.organizations.find(o => o.id === state.selectedOrgId) ?? null;

  return (
    <AuthContext.Provider value={{
      ...state,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      selectOrg,
      createOrgAndJoin,
      hasPermission,
      hasRole,
      selectedOrg,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
