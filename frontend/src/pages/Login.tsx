import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Home, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const GOOGLE_CLIENT_ID = '134682293497-r25546h6ofh1kpt4q3umt8a1kp7oin0m.apps.googleusercontent.com';

declare global {
  interface Window { google: any; }
}

// Flag module-level para garantir que initialize() seja chamado apenas uma vez por sessão
let googleSdkInitialized = false;

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, user, requiresOrgSelection, selectedOrgId } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (requiresOrgSelection) navigate('/selecionar-organizacao');
      else if (!selectedOrgId) navigate('/selecionar-organizacao');
      else navigate('/');
    }
  }, [user, requiresOrgSelection, selectedOrgId, navigate]);

  // Callback estável via useCallback — evita stale closure no SDK do Google
  const handleGoogleCallback = useCallback(async (response: any) => {
    if (!response?.credential) return;
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao autenticar com Google.');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle]);

  // Ref sempre aponta para a versão mais recente do callback
  const callbackRef = useRef(handleGoogleCallback);
  useEffect(() => {
    callbackRef.current = handleGoogleCallback;
  }, [handleGoogleCallback]);

  // Initialize Google Identity Services
  useEffect(() => {
    const renderBtn = () => {
      if (!window.google || !googleBtnRef.current) return;
      // Limpa o div antes de renderizar (evita botões duplicados no StrictMode)
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        logo_alignment: 'left',
        size: 'large',
        width: 380,
      });
    };

    const initGoogle = () => {
      if (!window.google) return;
      // initialize() deve ser chamado apenas uma vez por sessão de página
      if (!googleSdkInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => callbackRef.current(response),
          auto_select: false,
        });
        googleSdkInitialized = true;
      }
      renderBtn();
    };

    if (window.google) {
      initGoogle();
    } else {
      // Evita adicionar o script duplicado
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existing) {
        existing.addEventListener('load', initGoogle);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        document.body.appendChild(script);
      }
    }

    return () => {
      // Limpa o botão ao desmontar para evitar duplicatas no remount (StrictMode)
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-blue-700 to-indigo-900 flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute top-0 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-white/10 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SGI Pro</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gestão Imobiliária<br />de Alto Nível
            </h1>
            <p className="text-lg text-blue-100/80 leading-relaxed max-w-sm">
              Controle total de contratos, clientes, imóveis e financeiro — em um único lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Contratos', value: 'Gerenciados' },
              { label: 'Relatórios', value: 'Automáticos' },
              { label: 'Multi-usuário', value: 'Com permissões' },
              { label: 'OAuth Google', value: 'Login seguro' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-blue-200 text-xs mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-200/50 text-sm">
          © 2026 SGI Pro — Todos os direitos reservados
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">SGI Pro</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-1 text-sm">Acesse sua conta para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-lg bg-destructive/8 border border-destructive/20 text-destructive text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="login-email">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground" htmlFor="login-password">Senha</label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">ou continue com</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google button */}
          <div className="relative">
            {googleLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
            <div ref={googleBtnRef} className="w-full flex justify-center" />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Novo no sistema? Faça login com o <strong>Google</strong> para criar sua conta gratuitamente.
          </p>
        </div>
      </div>
    </div>
  );
}
