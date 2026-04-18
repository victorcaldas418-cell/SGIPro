import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Home, Building, Loader2, Shield } from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import AuditModal from '../components/AuditModal';
import { useAuth } from '../hooks/useAuth';

type PropertyOccupancyStatus = 'Ocupado' | 'Desocupado';

interface Property {
  id?: number;
  description: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  total_area_m2: number;
  status: PropertyOccupancyStatus;
  iptu_total_value: number;
}

function maskCEP(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

const inputClass = 'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all';

export default function Properties() {
  const { hasRole } = useAuth();
  const canAudit = hasRole('super_admin');
  const [auditOpen, setAuditOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [displayCep, setDisplayCep] = useState('');

  const emptyForm: Partial<Property> = {
    description: '', address: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', zipcode: '',
    total_area_m2: 0, iptu_total_value: 0, status: 'Desocupado',
  };
  const [formData, setFormData] = useState<Partial<Property>>(emptyForm);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/properties/');
      setProperties(res.data);
    } catch (err) {
      console.error('Failed to fetch properties', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleOpenModal = () => {
    setFormData(emptyForm);
    setDisplayCep('');
    setIsModalOpen(true);
  };

  const handleEdit = (prop: Property) => {
    setFormData(prop);
    if (prop.zipcode) setDisplayCep(maskCEP(prop.zipcode));
    else setDisplayCep('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir este imóvel?")) return;
    try {
      await api.delete(`/properties/${id}`);
      fetchProperties();
    } catch (error) {
      console.error('Failed to delete property', error);
      alert('Erro ao excluir imóvel.');
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setDisplayCep(maskCEP(e.target.value));
    setFormData(prev => ({ ...prev, zipcode: raw }));

    if (raw.length === 8) {
      try {
        setCepLoading(true);
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            zipcode: raw,
            address: data.logradouro || prev.address,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch {
        // Silently fail — user can fill manually
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['total_area_m2', 'iptu_total_value'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(formData)) {
        payload[k] = (v === '' || v === undefined) ? null : v;
      }
      if (formData.id) {
        await api.put(`/properties/${formData.id}`, payload);
      } else {
        await api.post('/properties/', payload);
      }
      setIsModalOpen(false);
      fetchProperties();
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = 'Erro desconhecido.';
      if (Array.isArray(data?.detail)) {
        msg = data.detail.map((d: any) => `• ${d.loc?.slice(1).join(' → ')}: ${d.msg}`).join('\n');
      } else if (typeof data?.detail === 'string') msg = data.detail;
      alert(`Erro ao cadastrar imóvel:\n\n${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = properties.filter(p =>
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    (p.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Home className="w-8 h-8 text-primary" />
            Gestão de Imóveis
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie endereços, unidades e rateio de IPTU.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Pesquisar descrição ou cidade..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 rounded-lg bg-card border border-border pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          {canAudit && (
            <button
              onClick={() => setAuditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium text-sm"
            >
              <Shield className="w-4 h-4" /> Auditar Imóveis
            </button>
          )}
          <button onClick={handleOpenModal} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-md shadow-primary/20 flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Novo Imóvel
          </button>
        </div>
      </div>

      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Auditoria de Imóveis"
        entityType="PROPERTY"
      />

      {/* Tabela */}
      <div className="bg-card glass border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border tracking-wider">
              <tr>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Endereço</th>
                <th className="px-6 py-4">Cidade/UF</th>
                <th className="px-6 py-4">Área</th>
                <th className="px-6 py-4">IPTU/ano</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">Carregando imóveis...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                  {properties.length === 0 ? 'Nenhum imóvel cadastrado. Adicione o primeiro!' : 'Nenhum resultado para a pesquisa.'}
                </td></tr>
              ) : (
                filtered.map(prop => (
                  <tr key={prop.id} className="hover:bg-secondary/40 transition-colors group">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                      {prop.description}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {prop.address}{prop.number ? `, ${prop.number}` : ''}
                      {prop.complement && <span className="text-xs ml-1">({prop.complement})</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {prop.city}{prop.state ? ` - ${prop.state}` : ''}
                      {prop.zipcode && <div className="text-xs font-mono">{maskCEP(prop.zipcode)}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{prop.total_area_m2} m²</td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.iptu_total_value ?? 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${prop.status === 'Ocupado' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(prop)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(prop.id!)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? "Editar Imóvel" : "Cadastrar Novo Imóvel"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição Comercial <span className="text-destructive">*</span></label>
            <input type="text" name="description" required value={formData.description || ''} onChange={handleInputChange}
              className={inputClass} placeholder="Ex: Galpão Industrial Norte, Sala 301" />
          </div>

          {/* CEP com auto-preenchimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                CEP
                {cepLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
              </label>
              <input type="text" name="zipcode" value={displayCep} onChange={handleCepChange}
                className={inputClass} placeholder="00000-000" maxLength={9} />
              <p className="text-xs text-muted-foreground mt-0.5">Preenchimento automático</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Número <span className="text-destructive">*</span></label>
              <input type="text" name="number" required value={formData.number || ''} onChange={handleInputChange}
                className={inputClass} placeholder="123 / S/N" />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Logradouro <span className="text-destructive">*</span></label>
            <input type="text" name="address" required value={formData.address || ''} onChange={handleInputChange}
              className={inputClass} placeholder="Rua, Avenida..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Complemento</label>
              <input type="text" name="complement" value={formData.complement || ''} onChange={handleInputChange}
                className={inputClass} placeholder="Sala, Bloco, Galpão..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bairro</label>
              <input type="text" name="neighborhood" value={formData.neighborhood || ''} onChange={handleInputChange}
                className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Cidade</label>
              <input type="text" name="city" value={formData.city || ''} onChange={handleInputChange}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">UF</label>
              <input type="text" name="state" value={formData.state || ''} onChange={handleInputChange}
                className={inputClass} maxLength={2} placeholder="SP" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Área Total (m²) <span className="text-destructive">*</span></label>
              <input type="number" step="0.01" name="total_area_m2" required value={formData.total_area_m2 || ''}
                onChange={handleInputChange} className={inputClass} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">IPTU Anual (R$)</label>
              <input type="number" step="0.01" name="iptu_total_value" value={formData.iptu_total_value || ''}
                onChange={handleInputChange} className={inputClass} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Situação</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className={inputClass}>
                <option value="Desocupado">Desocupado</option>
                <option value="Ocupado">Ocupado</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium shadow flex items-center gap-2 transition-colors">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar Imóvel'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
