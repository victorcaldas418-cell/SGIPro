import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Home, ArrowRight, Plus, Loader2, AlertCircle, ChevronRight, LogIn } from 'lucide-react';
import { useAuth, type Organization } from '../contexts/AuthContext';

type Step = 'choice' | 'select_existing' | 'create_new';

const ORG_TYPES = [
  { value: 'Imobiliária', label: 'Imobiliária', icon: '🏢' },
  { value: 'Escritório de Advocacia', label: 'Escritório de Advocacia', icon: '⚖️' },
  { value: 'Outro', label: 'Outro', icon: '🏛️' },
];

export default function SelectOrganization() {
  const navigate = useNavigate();
  const { user, organizations, selectOrg, createOrgAndJoin, logout } = useAuth();

  const [step, setStep] = useState<Step>(
    organizations.length > 0 ? 'choice' : 'create_new'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create form
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Imobiliária');
  const [orgCnpj, setOrgCnpj] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');

  const handleSelectOrg = async (org: Organization) => {
    setLoading(true);
    setError('');
    try {
      await selectOrg(org.id);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao selecionar organização.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) { setError('Informe o nome da organização.'); return; }
    setLoading(true);
    setError('');
    try {
      await createOrgAndJoin({
        name: orgName.trim(),
        org_type: orgType,
        cnpj: orgCnpj || undefined,
        email: orgEmail || undefined,
        phone: orgPhone || undefined,
      });
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao criar organização.');
    } finally {
      setLoading(false);
    }
  };

  const orgTypeIcon = { 'Imobiliária': '🏢', 'Escritório de Advocacia': '⚖️', 'Outro': '🏛️' };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">SGI Pro</span>
          </div>
          {user && (
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sair
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
          {/* Step: Choice (user has existing orgs) */}
          {step === 'choice' && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Olá, {user?.name?.split(' ')[0] || 'usuário'}!
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Escolha como deseja prosseguir:
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setStep('select_existing')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <LogIn className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">Acessar organização existente</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {organizations.length} {organizations.length === 1 ? 'organização vinculada' : 'organizações vinculadas'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  onClick={() => setStep('create_new')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                    <Plus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">Criar nova organização</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Cadastre uma nova imobiliária ou escritório</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Select existing org */}
          {step === 'select_existing' && (
            <div className="p-8">
              <button onClick={() => setStep('choice')} className="text-sm text-muted-foreground hover:text-foreground mb-5 flex items-center gap-1">
                ← Voltar
              </button>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Selecione a organização</h2>
                <p className="text-muted-foreground text-sm mt-1">Escolha com qual você deseja trabalhar agora.</p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org)}
                    disabled={loading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-60"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg flex-shrink-0">
                      {(orgTypeIcon as any)[org.org_type] || '🏢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{org.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{org.org_type}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Create new org */}
          {step === 'create_new' && (
            <div className="p-8">
              {organizations.length > 0 && (
                <button onClick={() => setStep('choice')} className="text-sm text-muted-foreground hover:text-foreground mb-5 flex items-center gap-1">
                  ← Voltar
                </button>
              )}
              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Cadastrar organização</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {organizations.length === 0
                    ? 'Bem-vindo! Para começar, cadastre sua imobiliária ou escritório.'
                    : 'Preencha os dados da nova organização.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-4">
                {/* Org type selector */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Tipo de organização</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ORG_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setOrgType(t.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all text-xs font-medium ${
                          orgType === t.value
                            ? 'border-primary bg-primary/8 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <span className="leading-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="org-name">
                    Nome <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    placeholder="Ex: Imobiliária Central"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="org-cnpj">CNPJ</label>
                    <input id="org-cnpj" type="text" placeholder="00.000.000/0001-00"
                      value={orgCnpj} onChange={(e) => setOrgCnpj(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="org-phone">Telefone</label>
                    <input id="org-phone" type="tel" placeholder="(00) 00000-0000"
                      value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="org-email">E-mail da organização</label>
                  <input id="org-email" type="email" placeholder="contato@suaempresa.com.br"
                    value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Criando...' : 'Criar organização e entrar'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
