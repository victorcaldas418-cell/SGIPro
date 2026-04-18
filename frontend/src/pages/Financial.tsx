import { useEffect, useState } from 'react';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Search, TrendingUp, Filter, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

type InstallmentStatus = 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';

interface Installment {
  id: number;
  contract_id: number;
  reference_month: number;
  reference_year: number;
  due_date: string;
  base_value: number;
  iptu_value: number;
  other_fees_value: number;
  penalty_value: number;
  interest_value: number;
  total_value: number;
  status: InstallmentStatus;
  payment_date: string | null;
}

interface Contract {
  id: number;
  locador_id: number;
  locatario_id: number;
  base_rent_value: number;
  status: string;
  installments: Installment[];
}

interface Client {
  id: number;
  name: string;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Financial() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [contractsRes, clientsRes] = await Promise.all([
          api.get('/contracts/'),
          api.get('/clients/'),
        ]);
        setContracts(contractsRes.data);
        setClients(clientsRes.data);
      } catch (err) {
        console.error('Failed to fetch financial data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getClientName = (id: number) => clients.find(c => c.id === id)?.name ?? `#${id}`;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const today = new Date().toISOString().split('T')[0];

  // Achatar todas as parcelas com contexto do contrato
  const allInstallments = contracts.flatMap((contract) =>
    (contract.installments ?? []).map((inst) => ({
      ...inst,
      contract,
      isOverdue: inst.status === 'Pendente' && inst.due_date < today,
    }))
  );

  // Filtro de status
  const filtered = allInstallments.filter((inst) => {
    const matchStatus =
      filterStatus === 'all' ? true
      : filterStatus === 'overdue' ? inst.isOverdue
      : inst.status === filterStatus;

    const contractLabel = `CR-${inst.contract_id.toString().padStart(4, '0')}`;
    const locatario = getClientName(inst.contract.locatario_id).toLowerCase();
    const matchSearch = search === '' || contractLabel.toLowerCase().includes(search.toLowerCase()) || locatario.includes(search.toLowerCase());

    return matchStatus && matchSearch;
  });

  // KPIs do módulo financeiro
  const totalPending = allInstallments.filter(i => i.status === 'Pendente' && !i.isOverdue).reduce((s, i) => s + i.total_value, 0);
  const totalOverdue = allInstallments.filter(i => i.isOverdue).reduce((s, i) => s + i.total_value, 0);
  const totalPaid = allInstallments.filter(i => i.status === 'Pago').reduce((s, i) => s + i.total_value, 0);
  const overdueCount = allInstallments.filter(i => i.isOverdue).length;

  const handleMarkPaid = async (installmentId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.put(`/contracts/installments/${installmentId}`, {
        status: 'Pago',
        payment_date: today,
      });
      // Reload
      const res = await api.get('/contracts/');
      setContracts(res.data);
    } catch (err) {
      console.error('Failed to update installment', err);
      alert('Erro ao confirmar pagamento.');
    }
  };

  const handleUndoPayment = async (installmentId: number) => {
    if (!window.confirm("Deseja realmente desfazer o pagamento desta parcela?")) return;
    try {
      await api.put(`/contracts/installments/${installmentId}`, {
        status: 'Pendente',
        payment_date: null,
      });
      // Reload
      const res = await api.get('/contracts/');
      setContracts(res.data);
    } catch (err) {
      console.error('Failed to undo installment payment', err);
      alert('Erro ao desfazer pagamento.');
    }
  };

  const getStatusConfig = (inst: typeof allInstallments[0]) => {
    if (inst.isOverdue) return { label: 'Vencida', icon: AlertTriangle, cls: 'bg-destructive/10 text-destructive border-destructive/20' };
    if (inst.status === 'Pago') return { label: 'Pago', icon: CheckCircle2, cls: 'bg-success/10 text-success border-success/20' };
    return { label: 'A vencer', icon: Clock, cls: 'bg-accent/10 text-accent-foreground border-border' };
  };

  const generateWhatsappLink = (inst: typeof allInstallments[0]) => {
    const locatario = getClientName(inst.contract.locatario_id);
    const venc = inst.due_date;
    const valor = formatCurrency(inst.total_value);
    const msg = encodeURIComponent(
      `Olá ${locatario}! 👋\n\nPassando para lembrar que o aluguel referente a *${MONTH_NAMES[inst.reference_month - 1]}/${inst.reference_year}* está com vencimento em *${venc}* no valor de *${valor}*.\n\nQualquer dúvida, estou à disposição!\n\nAtenciosamente,\nSGI - Gestão Imobiliária`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-primary" />
            Controle Financeiro
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Parcelas de aluguel, inadimplência e confirmação de pagamentos.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-center">
          <div className="p-3 rounded-xl bg-success/10">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recebido</p>
            <p className="text-2xl font-bold text-foreground">{loading ? '...' : formatCurrency(totalPaid)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-center">
          <div className="p-3 rounded-xl bg-accent/10">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">A Receber</p>
            <p className="text-2xl font-bold text-foreground">{loading ? '...' : formatCurrency(totalPending)}</p>
          </div>
        </div>
        <div className="bg-card border border-destructive/30 rounded-xl p-5 flex gap-4 items-center">
          <div className="p-3 rounded-xl bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Inadimplente</p>
            <p className="text-2xl font-bold text-destructive">{loading ? '...' : formatCurrency(totalOverdue)}</p>
            {overdueCount > 0 && <p className="text-xs text-destructive/70">{overdueCount} parcela(s) vencida(s)</p>}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por contrato ou inquilino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg bg-card border border-border pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 border border-border">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          {[
            { value: 'all', label: 'Todas' },
            { value: 'overdue', label: 'Vencidas' },
            { value: 'Pendente', label: 'A vencer' },
            { value: 'Pago', label: 'Pagas' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === f.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Parcelas */}
      <div className="bg-card glass border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border tracking-wider">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Contrato / Locatário</th>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Carregando parcelas...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  {allInstallments.length === 0 ? 'Nenhuma parcela gerada ainda. Cadastre um contrato!' : 'Nenhuma parcela encontrada para este filtro.'}
                </td></tr>
              ) : (
                filtered.map((inst) => {
                  const cfg = getStatusConfig(inst);
                  const Icon = cfg.icon;
                  return (
                    <tr key={inst.id} className="hover:bg-secondary/40 transition-colors group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.cls}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">CR-{inst.contract_id.toString().padStart(4, '0')}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{getClientName(inst.contract.locatario_id)}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {MONTH_NAMES[inst.reference_month - 1]}/{inst.reference_year}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                        {inst.due_date}
                        {inst.payment_date && (
                          <div className="text-xs text-success">Pago em {inst.payment_date}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-foreground">
                        {formatCurrency(inst.total_value)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* WhatsApp */}
                          {inst.status !== 'Pago' && (
                            <button
                              onClick={() => generateWhatsappLink(inst)}
                              title="Enviar lembrete via WhatsApp"
                              className="p-1.5 text-muted-foreground hover:text-success hover:bg-success/10 rounded-md transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          )}
                          {/* Confirmar Pagamento */}
                          {inst.status !== 'Pago' && (
                            <button
                              onClick={() => handleMarkPaid(inst.id)}
                              title="Confirmar pagamento"
                              className="p-1.5 text-muted-foreground hover:text-success hover:bg-success/10 rounded-md transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {/* Desfazer Pagamento */}
                          {inst.status === 'Pago' && (
                            <button
                              onClick={() => handleUndoPayment(inst.id)}
                              title="Desfazer pagamento"
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
