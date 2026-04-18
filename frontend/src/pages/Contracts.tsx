import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, TrendingUp, AlertTriangle, Edit2, Trash2, XCircle, Shield } from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import AuditModal from '../components/AuditModal';
import { useAuth } from '../hooks/useAuth';

type ContractStatus = 'Em Elaboração' | 'Encaminhado para Assinatura' | 'Ativo' | 'Finalizado' | 'Rescindido';

interface Contract {
  id: number;
  locador_id: number;
  locatario_id: number;
  property_id: number;
  base_rent_value: number;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  adjustment_month: number;
  inflation_index: string;
}

interface ClientOption { id: number; name: string; type: string }
interface PropertyOption { id: number; description: string; address: string }

export default function Contracts() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canAudit = hasRole('super_admin');
  const [auditOpen, setAuditOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Contract>>({
    locador_id: 0, locatario_id: 0, property_id: 0,
    base_rent_value: 0, status: 'Em Elaboração', adjustment_month: 1, inflation_index: 'IGPM'
  });

  const isEditing = !!formData.id;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, clientsRes, propertiesRes] = await Promise.all([
        api.get('/contracts/'),
        api.get('/clients/'),
        api.get('/properties/')
      ]);
      setContracts(contractsRes.data);
      setClients(clientsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = () => {
    setFormData({
      locador_id: clients.length > 0 ? clients[0].id : 0,
      locatario_id: clients.length > 0 ? clients[0].id : 0,
      property_id: properties.length > 0 ? properties[0].id : 0,
      base_rent_value: 0, status: 'Em Elaboração', adjustment_month: 1, inflation_index: 'IGPM'
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['locador_id', 'locatario_id', 'property_id', 'base_rent_value', 'adjustment_month'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberField ? parseFloat(value) || 0 : value }));
  };

  const handleEdit = (contract: Contract) => {
    setFormData(contract);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este contrato? Essa ação apagará as parcelas geradas.')) return;
    try {
      await api.delete(`/contracts/${id}`);
      fetchData();
    } catch {
      alert('Erro ao excluir contrato.');
    }
  };

  const handleDisable = async (contract: Contract) => {
    if (!window.confirm(`Deseja rescindir o contrato CR-${contract.id.toString().padStart(4, '0')}? O imóvel será marcado como desocupado.`)) return;
    try {
      await api.put(`/contracts/${contract.id}`, { status: 'Rescindido' });
      fetchData();
    } catch {
      alert('Erro ao rescindir contrato.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/contracts/${formData.id}`, {
          status: formData.status,
          base_rent_value: formData.base_rent_value,
          end_date: formData.end_date,
        });
      } else {
        if (formData.locador_id === formData.locatario_id) {
          alert('Locador e Locatário não podem ser a mesma pessoa!');
          return;
        }
        if (!formData.start_date || !formData.end_date) {
          alert('As datas de início e fim são obrigatórias.');
          return;
        }
        await api.post('/contracts/', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert(isEditing ? 'Erro ao atualizar contrato.' : 'Erro ao gerar contrato. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyle = (status: ContractStatus) => {
    switch (status) {
      case 'Em Elaboração': return 'bg-amber-500/10 text-amber-600';
      case 'Encaminhado para Assinatura': return 'bg-blue-500/10 text-blue-600';
      case 'Ativo': return 'bg-success/10 text-success';
      case 'Finalizado': return 'bg-muted text-muted-foreground';
      case 'Rescindido': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getClientName = (id: number) => clients.find(c => c.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Controle locações, aditivos, reajustes anuais e histórico financeiro.</p>
        </div>
        <div className="flex items-center gap-2">
          {canAudit && (
            <button
              onClick={() => setAuditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium text-sm"
            >
              <Shield className="w-4 h-4" /> Auditar Contratos
            </button>
          )}
          <button onClick={handleOpenModal} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-md shadow-primary/20 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Cadastrar Contrato
          </button>
        </div>
      </div>

      <div className="bg-card glass border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Contrato & Partes</th>
                <th className="px-6 py-4">Vigência</th>
                <th className="px-6 py-4">Valor Base</th>
                <th className="px-6 py-4">Reajuste</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Carregando contratos...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Nenhum contrato cadastrado.</td></tr>
              ) : (
                contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() => navigate(`/contratos/${contract.id}`)}
                    className="hover:bg-secondary/40 group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(contract.status)}`}>
                        {contract.status === 'Ativo' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {contract.status === 'Finalizado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {contract.status === 'Rescindido' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      CR-{contract.id.toString().padStart(4, '0')}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-semibold">Locador:</span> {getClientName(contract.locador_id)}<br />
                        <span className="font-semibold">Locatário:</span> {getClientName(contract.locatario_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{contract.start_date} a {contract.end_date}</td>
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      R$ {contract.base_rent_value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span>Mês {contract.adjustment_month}</span>
                        <span className="text-xs border border-border rounded px-1 ml-1">{contract.inflation_index}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(contract)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {contract.status === 'Ativo' && (
                          <button
                            onClick={() => handleDisable(contract)}
                            className="p-1.5 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors"
                            title="Rescindir contrato"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Auditoria de Contratos"
        entityType="CONTRACT"
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Contrato' : 'Vincular Novo Contrato'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing ? (
            /* Modo edição: apenas campos alteráveis */
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                  <option value="Em Elaboração">Em Elaboração</option>
                  <option value="Encaminhado para Assinatura">Encaminhado para Assinatura</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Rescindido">Rescindido</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Aluguel Mensal (R$)</label>
                <input type="number" step="0.01" name="base_rent_value" required value={formData.base_rent_value || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Data Término</label>
                <input type="date" name="end_date" required value={formData.end_date || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
          ) : (
            /* Modo criação: todos os campos */
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Locador (Proprietário)</label>
                <select name="locador_id" required value={formData.locador_id || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                  <option value="0" disabled>Selecione</option>
                  {clients.map(c => <option key={`locador-${c.id}`} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Locatário (Inquilino)</label>
                <select name="locatario_id" required value={formData.locatario_id || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                  <option value="0" disabled>Selecione</option>
                  {clients.map(c => <option key={`locatario-${c.id}`} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Imóvel Vinculado</label>
                <select name="property_id" required value={formData.property_id || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                  <option value="0" disabled>Selecione o Imóvel</option>
                  {properties.map(p => <option key={`prop-${p.id}`} value={p.id}>{p.description} - {p.address}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Data de Início</label>
                <input type="date" name="start_date" required value={formData.start_date || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Data Término</label>
                <input type="date" name="end_date" required value={formData.end_date || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Aluguel Mensal (R$)</label>
                <input type="number" step="0.01" name="base_rent_value" required value={formData.base_rent_value || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Mês Base Reajuste</label>
                <select name="adjustment_month" value={formData.adjustment_month || 1} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Mês {m}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Índice Acordado</label>
                <select name="inflation_index" value={formData.inflation_index || 'IGPM'} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                  <option value="IGPM">IGPM (FGV)</option>
                  <option value="IPCA">IPCA (IBGE)</option>
                  <option value="INPC">INPC</option>
                </select>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-medium shadow">
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Contrato'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
