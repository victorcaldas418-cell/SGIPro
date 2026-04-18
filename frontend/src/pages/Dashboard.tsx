import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, Users, Home } from 'lucide-react';
import { api } from '../services/api';

interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  totalClients: number;
  totalProperties: number;
  overdueInstallments: number;
  overdueAmount: number;
  upcomingAdjustments: number;
}

interface RecentContract {
  id: number;
  locador_id: number;
  locatario_id: number;
  start_date: string;
  end_date: string;
  status: string;
  base_rent_value: number;
  installments: Array<{
    id: number;
    due_date: string;
    total_value: number;
    status: string;
    payment_date: string | null;
  }>;
}

interface ClientInfo {
  id: number;
  name: string;
  type: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalContracts: 0, activeContracts: 0, totalClients: 0,
    totalProperties: 0, overdueInstallments: 0, overdueAmount: 0, upcomingAdjustments: 0,
  });
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [contractsRes, clientsRes, propertiesRes] = await Promise.all([
          api.get('/contracts/'),
          api.get('/clients/'),
          api.get('/properties/'),
        ]);

        const contracts: RecentContract[] = contractsRes.data;
        const clientsList: ClientInfo[] = clientsRes.data;
        const properties = propertiesRes.data;

        setClients(clientsList);
        setRecentContracts(contracts.slice(0, 5));

        // Calcular KPIs reais
        const active = contracts.filter((c: any) => c.status === 'Ativo');
        const today = new Date().toISOString().split('T')[0];

        let overdueCount = 0;
        let overdueTotal = 0;
        let adjustmentCount = 0;
        const currentMonth = new Date().getMonth() + 1;

        for (const contract of contracts) {
          // Parcelas inadimplentes (vencidas e não pagas)
          if (contract.installments) {
            for (const inst of contract.installments) {
              if (inst.status === 'Pendente' && inst.due_date < today) {
                overdueCount++;
                overdueTotal += inst.total_value;
              }
            }
          }

          // Reajustes próximos (mês de reajuste no trimestre atual)
          if (contract.status === 'Ativo') {
            const adjMonth = (contract as any).adjustment_month;
            if (adjMonth && Math.abs(adjMonth - currentMonth) <= 2 && Math.abs(adjMonth - currentMonth) >= 0) {
              adjustmentCount++;
            }
          }
        }

        setStats({
          totalContracts: contracts.length,
          activeContracts: active.length,
          totalClients: clientsList.length,
          totalProperties: properties.length,
          overdueInstallments: overdueCount,
          overdueAmount: overdueTotal,
          upcomingAdjustments: adjustmentCount,
        });
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const getClientName = (id: number) => clients.find(c => c.id === id)?.name || `ID ${id}`;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const kpis = [
    { label: "Contratos Ativos", value: stats.activeContracts.toString(), trend: `${stats.totalContracts} total cadastrados`, icon: FileText, color: "text-primary" },
    { label: "Clientes Cadastrados", value: stats.totalClients.toString(), trend: `Base de locadores e locatários`, icon: Users, color: "text-accent-foreground" },
    { label: "Imóveis Gerenciados", value: stats.totalProperties.toString(), trend: `Registrados no sistema`, icon: Home, color: "text-secondary-foreground" },
    { label: "Inadimplência", value: stats.overdueInstallments > 0 ? formatCurrency(stats.overdueAmount) : "R$ 0,00", trend: stats.overdueInstallments > 0 ? `${stats.overdueInstallments} parcela(s) em atraso` : "Nenhuma pendência", icon: AlertCircle, color: stats.overdueInstallments > 0 ? "text-destructive" : "text-success" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? 'Carregando dados do sistema...' : 'Dados em tempo real do Sistema de Gestão Imobiliária.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/contratos')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-md shadow-primary/20 flex items-center gap-2"
        >
          Novo Contrato <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="group flex flex-col p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                <p className="text-3xl font-bold text-foreground tracking-tight">
                  {loading ? '...' : kpi.value}
                </p>
              </div>
              <div className={`p-2 bg-secondary/80 rounded-lg ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 relative z-10">
              <span className={`text-xs font-medium ${kpi.color.includes('destructive') ? 'text-destructive' : 'text-muted-foreground'}`}>
                {loading ? 'Carregando...' : kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Contratos Recentes & Parcelas Pendentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Contratos Recentes */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Contratos Cadastrados
          </h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : recentContracts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
                <button onClick={() => navigate('/contratos')} className="mt-3 text-sm text-primary hover:underline font-medium">
                  Criar seu primeiro contrato →
                </button>
              </div>
            ) : (
              recentContracts.map((contract) => (
                <div key={contract.id} className="flex gap-4 p-4 rounded-lg bg-secondary/40 border border-border/50 hover:bg-secondary/60 transition-colors relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${contract.status === 'Ativo' ? 'bg-success' : contract.status === 'Rescindido' ? 'bg-destructive' : 'bg-muted-foreground'}`}></div>

                  <div className={`mt-0.5 rounded-full p-1.5 h-fit ${contract.status === 'Ativo' ? 'bg-success/10 text-success' : 'bg-muted/50 text-muted-foreground'}`}>
                    {contract.status === 'Ativo' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-foreground text-sm">CR-{contract.id.toString().padStart(4, '0')}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border border-border ${contract.status === 'Ativo' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {contract.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      <span className="font-semibold">Locador:</span> {getClientName(contract.locador_id)} · <span className="font-semibold">Locatário:</span> {getClientName(contract.locatario_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(contract.base_rent_value)}/mês · {contract.start_date} a {contract.end_date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Parcelas Pendentes ou Vencidas */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-accent" />
            Parcelas Pendentes
          </h2>
          <div className="space-y-3 flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : (() => {
              // Coletar todas as parcelas pendentes de todos os contratos
              const pendingInstallments: Array<{
                contractId: number;
                dueDate: string;
                value: number;
                status: string;
                isOverdue: boolean;
              }> = [];

              const today = new Date().toISOString().split('T')[0];

              for (const contract of recentContracts) {
                if (contract.installments) {
                  for (const inst of contract.installments) {
                    if (inst.status === 'Pendente') {
                      pendingInstallments.push({
                        contractId: contract.id,
                        dueDate: inst.due_date,
                        value: inst.total_value,
                        status: inst.status,
                        isOverdue: inst.due_date < today,
                      });
                    }
                  }
                }
              }

              pendingInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
              const display = pendingInstallments.slice(0, 6);

              if (display.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success/40" />
                    Nenhuma parcela pendente no momento. Tudo em dia!
                  </div>
                );
              }

              return display.map((inst, i) => (
                <div key={i} className={`flex gap-4 p-3 rounded-lg border transition-colors ${inst.isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-secondary/40 border-border/50'}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${inst.isOverdue ? 'bg-destructive' : 'bg-accent'}`}></div>
                  <div className={`mt-0.5 rounded-full p-1.5 h-fit ${inst.isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
                    {inst.isOverdue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-foreground text-sm">
                        CR-{inst.contractId.toString().padStart(4, '0')}
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${inst.isOverdue ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-background border-border text-muted-foreground'}`}>
                        {inst.isOverdue ? 'Vencida' : 'A vencer'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vencimento: <span className="font-mono">{inst.dueDate}</span> · Valor: <span className="font-semibold">{formatCurrency(inst.value)}</span>
                    </p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
