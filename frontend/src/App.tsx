import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Properties from './pages/Properties';
import Contracts from './pages/Contracts';
import Financial from './pages/Financial';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SelectOrganization from './pages/SelectOrganization';
import UsersPage from './pages/Users';
import Settings from './pages/Settings';
import ContractDetail from './pages/ContractDetail';

/** Protege rotas que exigem autenticação + org selecionada. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, selectedOrgId, requiresOrgSelection } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiresOrgSelection || !selectedOrgId) return <Navigate to="/selecionar-organizacao" replace />;

  return <>{children}</>;
}

/** Redireciona usuários já logados para fora do login. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, selectedOrgId, requiresOrgSelection } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user && selectedOrgId && !requiresOrgSelection) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Protege a tela de selecionar organização (exige login, mas não org selecionada) */
function OrgRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      
      {/* Semi-protected route */}
      <Route path="/selecionar-organizacao" element={<OrgRoute><SelectOrganization /></OrgRoute>} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="imoveis" element={<Properties />} />
        <Route path="contratos" element={<Contracts />} />
        <Route path="contratos/:id" element={<ContractDetail />} />
        <Route path="financeiro" element={<Financial />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="configuracoes" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
