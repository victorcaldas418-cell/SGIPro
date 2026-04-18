import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Home, FileText, Bell, Search,
  Menu, X, Settings, Moon, Sun, DollarSign, Building2, LogOut, ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const DashboardLayout = () => {
  const { user, selectedOrg, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Clientes', icon: Users, path: '/clientes' },
    { name: 'Imóveis', icon: Home, path: '/imoveis' },
    { name: 'Contratos', icon: FileText, path: '/contratos' },
    { name: 'Financeiro', icon: DollarSign, path: '/financeiro' },
    // Apenas admins veem a seção de usuários
    ...(hasRole('admin', 'super_admin') ? [{ name: 'Usuários', icon: Users, path: '/usuarios' }] : []),
  ];

  const avatarInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex bg-background text-foreground transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">SGI Pro</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Org indicator */}
        {selectedOrg && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-primary/5">
              <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{selectedOrg.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedOrg.org_type}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-1">
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 glass shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-secondary"
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar contratos ou clientes..."
                className="w-64 rounded-full bg-secondary/50 border border-transparent pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary transition-all outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="relative p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            </button>

            {/* User avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-secondary transition-all"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  ) : avatarInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-foreground leading-none">{user?.name?.split(' ')[0]}</p>
                  <p className="text-xs text-muted-foreground leading-none mt-0.5 capitalize">
                    {user?.role === 'super_admin' ? 'Admin Master' : user?.role === 'admin' ? 'Admin' : 'Corretor'}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-card border border-border rounded-xl shadow-xl py-1 z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/selecionar-organizacao'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Trocar organização
                  </button>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none z-0" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
