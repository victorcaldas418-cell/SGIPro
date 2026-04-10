import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, User, Trash2, Edit2,
  Eye, EyeOff, Search, AlertCircle, CheckCircle2, Loader2, X, Key, RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { RoleGate } from '../components/PermissionGate';

const MODULES = [
  { key: 'clients', label: 'Clientes' },
  { key: 'properties', label: 'Imóveis' },
  { key: 'contracts', label: 'Contratos' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'reports', label: 'Relatórios' },
];

const PERMISSION_PRESETS = [
  { label: 'Visualizar apenas', icon: Eye, config: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_generate_reports: false } },
  { label: 'Editar (sem excluir)', icon: Edit2, config: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_generate_reports: false } },
  { label: 'Todos os poderes', icon: ShieldCheck, config: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_generate_reports: true } },
];

type UserRec = {
  id: number; name: string; email: string; role: string;
  is_active: boolean; is_deletable: boolean; is_org_admin: boolean;
  avatar_url?: string; joined_at?: string;
  permissions: Array<{ module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_generate_reports: boolean; }>;
};

type PermMap = Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_generate_reports: boolean; }>;

const defaultPerm = { can_view: true, can_create: false, can_edit: false, can_delete: false, can_generate_reports: false };

const roleLabel: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Admin Master', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  admin: { label: 'Administrador', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  agent: { label: 'Advogado/Corretor', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export default function UsersPage() {
  const { user: currentUser, selectedOrgId } = useAuth();
  const [users, setUsers] = useState<UserRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRec | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [showPass, setShowPass] = useState(false);
  const [allModules, setAllModules] = useState(true);
  const [selectedModule, setSelectedModule] = useState('clients');
  const [permPreset, setPermPreset] = useState(0);
  const [customPerms, setCustomPerms] = useState<PermMap>(
    Object.fromEntries(MODULES.map((m) => [m.key, { ...defaultPerm }]))
  );

  const fetchUsers = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/users/?org_id=${selectedOrgId}`);
      setUsers(data);
    } catch { setError('Erro ao carregar usuários.'); }
    finally { setLoading(false); }
  }, [selectedOrgId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Preencha todos os campos obrigatórios.'); return; }
    setSubmitting(true); setError('');

    let permissions = undefined;
    if (form.role === 'agent') {
      if (allModules) {
        const preset = PERMISSION_PRESETS[permPreset].config;
        permissions = [{ module: '*', ...preset }];
      } else {
        permissions = Object.entries(customPerms).map(([module, perm]) => ({ module, ...perm }));
      }
    }

    try {
      await api.post('/users/', {
        name: form.name, email: form.email, password: form.password,
        role: form.role, organization_id: selectedOrgId, permissions,
      });
      setSuccess('Usuário criado com sucesso!');
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao criar usuário.');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (u: UserRec) => {
    if (!confirm(`Excluir o usuário "${u.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setSuccess('Usuário excluído.');
      fetchUsers();
    } catch (e: any) { setError(e.response?.data?.detail || 'Erro ao excluir.'); }
  };

  const handleToggleActive = async (u: UserRec) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      setSuccess(`Usuário ${!u.is_active ? 'ativado' : 'desativado'}.`);
      fetchUsers();
    } catch (e: any) { setError(e.response?.data?.detail || 'Erro ao atualizar.'); }
  };

  const openPermModal = (u: UserRec) => {
    setEditingUser(u);
    const map: PermMap = Object.fromEntries(MODULES.map((m) => [m.key, { ...defaultPerm }]));
    for (const p of u.permissions) {
      if (p.module === '*') {
        MODULES.forEach(m => { map[m.key] = { ...p }; });
      } else if (map[p.module]) {
        map[p.module] = { ...p };
      }
    }
    setCustomPerms(map);
    setShowPermModal(true);
  };

  const handleSavePerms = async () => {
    if (!editingUser) return;
    setSubmitting(true); setError('');
    const permissions = Object.entries(customPerms).map(([module, perm]) => ({ module, ...perm }));
    try {
      await api.put(`/users/${editingUser.id}/permissions?org_id=${selectedOrgId}`, permissions);
      setSuccess('Permissões atualizadas!');
      setShowPermModal(false);
      fetchUsers();
    } catch (e: any) { setError(e.response?.data?.detail || 'Erro ao salvar permissões.'); }
    finally { setSubmitting(false); }
  };

  const applyPresetToModule = (moduleKey: string, presetIdx: number) => {
    setCustomPerms(prev => ({ ...prev, [moduleKey]: { ...PERMISSION_PRESETS[presetIdx].config } }));
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'agent' });
    setAllModules(true); setPermPreset(0); setError('');
    setCustomPerms(Object.fromEntries(MODULES.map((m) => [m.key, { ...defaultPerm }])));
  };

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3500); return () => clearTimeout(t); }
  }, [success]);

  const avatarInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <RoleGate roles={['super_admin', 'admin']} fallback={
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Acesso restrito a administradores.</p>
      </div>
    }>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Usuários</h1>
            <p className="text-muted-foreground mt-1">Gerencie membros e permissões da sua organização.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-md shadow-primary/20 flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" /> <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
            <CheckCircle2 className="w-4 h-4" /> <span>{success}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Buscar por nome ou e-mail..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum usuário encontrado</p>
              <p className="text-sm mt-1">Crie o primeiro usuário para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/40">
                  <tr>
                    {['Usuário', 'Role', 'Módulos', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => {
                    const role = roleLabel[u.role] || { label: u.role, color: 'bg-secondary text-foreground' };
                    const isSelf = u.id === currentUser?.id;
                    const moduleCount = u.permissions.some(p => p.module === '*') ? 'Todos' : u.permissions.length;

                    return (
                      <tr key={u.id} className={`hover:bg-secondary/30 transition-colors ${!u.is_active ? 'opacity-55' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                              {avatarInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {u.name}{isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${role.color}`}>
                            {u.role === 'super_admin' ? <ShieldCheck className="w-3 h-3" /> : u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {role.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-xs">
                          {u.role !== 'agent' ? '— Todos —' : (u.permissions.length === 0 ? 'Sem permissão' : `${moduleCount} módulo${moduleCount === 'Todos' ? 's' : 's'}`)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${u.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                            {u.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            {u.role === 'agent' && (
                              <button onClick={() => openPermModal(u)} title="Editar permissões"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                                <Key className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!u.is_deletable ? null : (
                              <button onClick={() => handleToggleActive(u)} title={u.is_active ? 'Desativar' : 'Ativar'}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                                {u.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {u.is_deletable && !isSelf && (
                              <button onClick={() => handleDelete(u)} title="Excluir"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── CREATE USER MODAL ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="font-bold text-foreground text-lg">Novo Usuário</h3>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" /><span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Nome completo *</label>
                    <input type="text" placeholder="Nome do usuário" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">E-mail *</label>
                    <input type="email" placeholder="email@exemplo.com" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Senha inicial *</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="w-full px-3.5 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Nível de acesso</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all">
                      {currentUser?.role === 'super_admin' && <option value="super_admin">Administrador Master</option>}
                      <option value="admin">Administrador</option>
                      <option value="agent">Advogado / Corretor</option>
                    </select>
                  </div>
                </div>

                {/* ── PERMISSIONS (only for agent) ── */}
                {form.role === 'agent' && (
                  <div className="border border-border rounded-xl p-4 space-y-4">
                    <p className="text-sm font-semibold text-foreground">Permissões</p>

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAllModules(true)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${allModules ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'}`}>
                        Todos os módulos
                      </button>
                      <button type="button" onClick={() => setAllModules(false)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${!allModules ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'}`}>
                        Módulo específico
                      </button>
                    </div>

                    {allModules ? (
                      <div className="grid grid-cols-3 gap-2">
                        {PERMISSION_PRESETS.map((p, i) => (
                          <button key={i} type="button" onClick={() => setPermPreset(i)}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center text-xs transition-all ${permPreset === i ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'}`}>
                            <p.icon className="w-4 h-4" />
                            <span>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {MODULES.map(m => (
                            <button key={m.key} type="button" onClick={() => setSelectedModule(m.key)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${selectedModule === m.key ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground'}`}>
                              {m.label}
                            </button>
                          ))}
                        </div>
                        {/* Actions for selected module */}
                        <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-foreground">{MODULES.find(m => m.key === selectedModule)?.label}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {PERMISSION_PRESETS.map((p, i) => (
                              <button key={i} type="button" onClick={() => applyPresetToModule(selectedModule, i)}
                                className="px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                                {p.label}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries({ can_view: 'Visualizar', can_create: 'Criar', can_edit: 'Editar', can_delete: 'Excluir', can_generate_reports: 'Relatórios' }).map(([key, label]) => (
                              <label key={key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                                <input type="checkbox"
                                  checked={(customPerms[selectedModule] as any)?.[key] ?? false}
                                  onChange={e => setCustomPerms(prev => ({
                                    ...prev,
                                    [selectedModule]: { ...prev[selectedModule], [key]: e.target.checked }
                                  }))}
                                  className="w-3.5 h-3.5 accent-primary" />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-all">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {submitting ? 'Criando...' : 'Criar usuário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── PERMISSIONS MODAL ── */}
        {showPermModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowPermModal(false)}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="font-bold text-foreground text-lg">Permissões</h3>
                  <p className="text-sm text-muted-foreground">{editingUser.name}</p>
                </div>
                <button onClick={() => setShowPermModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-4">
                {MODULES.map(m => (
                  <div key={m.key} className="bg-secondary/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{m.label}</p>
                      <div className="flex gap-1">
                        {PERMISSION_PRESETS.map((p, i) => (
                          <button key={i} type="button" onClick={() => applyPresetToModule(m.key, i)}
                            className="px-2 py-0.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries({ can_view: 'Ver', can_create: 'Criar', can_edit: 'Editar', can_delete: 'Excluir', can_generate_reports: 'Relatórios' }).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                          <input type="checkbox"
                            checked={(customPerms[m.key] as any)?.[key] ?? false}
                            onChange={e => setCustomPerms(prev => ({
                              ...prev, [m.key]: { ...prev[m.key], [key]: e.target.checked }
                            }))}
                            className="w-3.5 h-3.5 accent-primary" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPermModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleSavePerms} disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Salvar permissões
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
