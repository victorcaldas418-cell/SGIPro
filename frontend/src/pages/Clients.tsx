import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, UserCircle2, Shield } from 'lucide-react';
import { api } from '../services/api';
import type { Client } from '../types/client';
import Modal from '../components/Modal';
import AuditModal from '../components/AuditModal';
import { useAuth } from '../hooks/useAuth';

// --- Funções de Máscara ---
function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// --- Componente ---
export default function Clients() {
  const { hasRole } = useAuth();
  const canAudit = hasRole('super_admin');
  const [auditOpen, setAuditOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({ type: 'PF', name: '', status: true });

  // Valores exibidos com máscara (somente para UI)
  const [displayCpf, setDisplayCpf] = useState('');
  const [displayCnpj, setDisplayCnpj] = useState('');
  const [displayWhatsapp, setDisplayWhatsapp] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients/');
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenModal = () => {
    setFormData({ type: 'PF', name: '', status: true });
    setDisplayCpf('');
    setDisplayCnpj('');
    setDisplayWhatsapp('');
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setFormData(client);
    if (client.type === 'PF' && client.cpf) setDisplayCpf(maskCPF(client.cpf));
    else setDisplayCpf('');
    if (client.type === 'PJ' && client.cnpj) setDisplayCnpj(maskCNPJ(client.cnpj));
    else setDisplayCnpj('');
    if (client.whatsapp) setDisplayWhatsapp(maskPhone(client.whatsapp));
    else setDisplayWhatsapp('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir este cliente?")) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (error) {
      console.error('Failed to delete client', error);
      alert('Erro ao excluir cliente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      const masked = maskCPF(value);
      setDisplayCpf(masked);
      setFormData((prev) => ({ ...prev, cpf: onlyDigits(masked) }));
      return;
    }
    if (name === 'cnpj') {
      const masked = maskCNPJ(value);
      setDisplayCnpj(masked);
      setFormData((prev) => ({ ...prev, cnpj: onlyDigits(masked) }));
      return;
    }
    if (name === 'whatsapp') {
      const masked = maskPhone(value);
      setDisplayWhatsapp(masked);
      setFormData((prev) => ({ ...prev, whatsapp: onlyDigits(masked) }));
      return;
    }
    if (name === 'type') {
      // Ao trocar o tipo, limpa os campos de documento
      setDisplayCpf('');
      setDisplayCnpj('');
      setFormData((prev) => ({ ...prev, type: value as 'PF' | 'PJ', cpf: undefined, cnpj: undefined }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // Sanitiza o payload: strings vazias → null
      const payload: Record<string, unknown> = { associates: [] };
      for (const [key, value] of Object.entries(formData)) {
        payload[key] = (value === '' || value === undefined) ? null : value;
      }
      payload.status = formData.status ?? true;

      // Removemos id do payload se existir (não podemos atualizar o ID por PUT se estiver no schema da mesma forma, ou podemos deixar, mas Pydantic ignora)
      if (payload.id) {
        await api.put(`/clients/${formData.id}`, payload);
      } else {
        await api.post('/clients/', payload);
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (error: any) {
      console.error('Server error:', error?.response?.data || error?.message);
      
      // Extrai a mensagem de erro do FastAPI
      const data = error?.response?.data;
      let msg = 'Erro desconhecido ao salvar.';

      if (typeof data === 'string') {
        msg = data;
      } else if (Array.isArray(data?.detail)) {
        msg = data.detail
          .map((d: any) => `• ${d.loc?.slice(1).join(' → ')}: ${d.msg}`)
          .join('\n');
      } else if (typeof data?.detail === 'string') {
        msg = data.detail;
      }

      alert(`Erro ao cadastrar cliente:\n\n${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtro local de pesquisa
  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf ?? '').includes(search) ||
    (c.cnpj ?? '').includes(search)
  );

  const inputClass =
    'w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCircle2 className="w-8 h-8 text-primary" />
            Gestão de Clientes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie proprietários, inquilinos e entidades comerciais.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg bg-card border border-border pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          {canAudit && (
            <button
              onClick={() => setAuditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium text-sm"
            >
              <Shield className="w-4 h-4" /> Auditar Clientes
            </button>
          )}
          <button
            onClick={handleOpenModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-md shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Auditoria de Clientes"
        entityType="CLIENT"
      />

      {/* Tabela */}
      <div className="bg-card glass border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border tracking-wider">
              <tr>
                <th className="px-6 py-4">Nome / Razão Social</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Carregando clientes...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum resultado para a pesquisa.'}
                </td></tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/40 transition-colors group">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {client.name}
                      {client.type === 'PJ' && client.trading_name && (
                        <div className="text-xs text-muted-foreground font-normal">{client.trading_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${client.type === 'PJ' ? 'bg-accent/20 text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
                        {client.type === 'PJ' ? <Building2 className="w-3.5 h-3.5" /> : <UserCircle2 className="w-3.5 h-3.5" />}
                        {client.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {client.type === 'PF'
                        ? (client.cpf ? maskCPF(client.cpf) : '—')
                        : (client.cnpj ? maskCNPJ(client.cnpj) : '—')}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {client.email || '—'}
                      <div className="text-xs text-muted-foreground">
                        {client.whatsapp ? maskPhone(client.whatsapp) : client.phone || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${client.status ? 'bg-success/20 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {client.status ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(client)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(client.id!)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? "Editar Cliente" : "Cadastrar Novo Cliente"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Tipo */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Tipo de Pessoa</label>
              <div className="flex gap-3">
                {(['PF', 'PJ'] as const).map((t) => (
                  <label key={t} className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={formData.type === t}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${formData.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                      {t === 'PF' ? <UserCircle2 className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                {formData.type === 'PF' ? 'Nome Completo' : 'Razão Social'}
                <span className="text-destructive ml-1">*</span>
              </label>
              <input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className={inputClass} placeholder={formData.type === 'PF' ? 'Ex: João da Silva' : 'Ex: Empresa Ltda.'} />
            </div>

            {/* Nome Fantasia (só PJ) */}
            {formData.type === 'PJ' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Nome Fantasia</label>
                <input type="text" name="trading_name" value={formData.trading_name || ''} onChange={handleInputChange} className={inputClass} placeholder="Ex: Empresa Digital" />
              </div>
            )}

            {/* CPF ou CNPJ */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                {formData.type === 'PF' ? 'CPF' : 'CNPJ'}
              </label>
              {formData.type === 'PF' ? (
                <input
                  type="text"
                  name="cpf"
                  value={displayCpf}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              ) : (
                <input
                  type="text"
                  name="cnpj"
                  value={displayCnpj}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              )}
            </div>

            {/* WhatsApp */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1">WhatsApp / Celular</label>
              <input
                type="text"
                name="whatsapp"
                value={displayWhatsapp}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            {/* Email */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className={inputClass} placeholder="email@exemplo.com" />
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground transition-colors font-medium shadow flex items-center gap-2">
              {isSubmitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
              ) : 'Salvar Cadastro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
