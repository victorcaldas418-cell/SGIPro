import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, User, Home, Calendar, TrendingUp, AlertTriangle,
  Plus, Edit2, Trash2, CheckCircle2, Clock, Save, X, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import AuditModal from '../components/AuditModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: number; name: string; type: string;
  email?: string; phone?: string; whatsapp?: string;
  cpf?: string; cnpj?: string;
}

interface PropertySummary {
  id: number; description: string; address: string; number: string;
  complement?: string; neighborhood?: string; city?: string; state?: string; zipcode?: string;
  total_area_m2: number;
  municipal_registration?: string;
  current_registry_office?: string;
  current_registry_number?: string;
  cnm?: string;
  iptu_total_value: number;
}

interface Installment {
  id: number; due_date: string; total_value: number;
  base_value: number; status: string; payment_date?: string;
  reference_month: number; reference_year: number;
}

interface Andamento {
  id: number; contract_id: number;
  date: string; title: string; description?: string;
}

interface ContractDetail {
  id: number;
  locador_id: number; locatario_id: number;
  start_date: string; end_date: string;
  status: string; base_rent_value: number;
  adjustment_month: number; adjustment_min_percentage: number;
  inflation_index?: string;
  penalty_default_perc: number; interest_default_perc: number;
  penalty_rescission_value: number;
  locador?: ClientSummary;
  locatario?: ClientSummary;
  property?: PropertySummary;
  installments: Installment[];
  andamentos: Andamento[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function calcAdjustmentDates(adjMonth: number, startDate: string) {
  const start = new Date(startDate);
  const today = new Date();
  let last: Date | null = null;
  let next: Date | null = null;
  for (let y = start.getFullYear(); y <= today.getFullYear() + 2; y++) {
    const d = new Date(y, adjMonth - 1, 1);
    if (d <= today) last = d;
    else if (!next) next = d;
  }
  return { last, next };
}

function statusStyle(s: string) {
  if (s === 'Ativo') return 'bg-success/10 text-success border-success/20';
  if (s === 'Rescindido') return 'bg-destructive/10 text-destructive border-destructive/20';
  return 'bg-muted text-muted-foreground border-border';
}

function instStyle(s: string) {
  if (s === 'Pago') return 'text-success';
  if (s === 'Em Atraso' || s === 'Pendente') return 'text-destructive';
  return 'text-muted-foreground';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground font-medium">{value || '—'}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Andamentos CRUD ──────────────────────────────────────────────────────────

interface AndamentosProps {
  contractId: number;
  andamentos: Andamento[];
  onRefresh: () => void;
  canAudit?: boolean;
  onAudit?: () => void;
}

function AndamentosSection({ contractId, andamentos, onRefresh, canAudit, onAudit }: AndamentosProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Andamento | null>(null);
  const [form, setForm] = useState({ date: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ date: new Date().toISOString().split('T')[0], title: '', description: '' });
    setAdding(true);
  };

  const openEdit = (a: Andamento) => {
    setAdding(false);
    setEditing(a);
    setForm({ date: a.date, title: a.title, description: a.description || '' });
  };

  const cancel = () => { setAdding(false); setEditing(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/contracts/andamentos/${editing.id}`, form);
      } else {
        await api.post(`/contracts/${contractId}/andamentos/`, form);
      }
      cancel();
      onRefresh();
    } catch { alert('Erro ao salvar andamento.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir este andamento?')) return;
    try {
      await api.delete(`/contracts/andamentos/${id}`);
      onRefresh();
    } catch { alert('Erro ao excluir andamento.'); }
  };

  const sorted = [...andamentos].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SectionCard title="Andamentos do Contrato" icon={FileText}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Andamento
        </button>
        {canAudit && onAudit && (
          <button
            onClick={onAudit}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Shield className="w-3.5 h-3.5" /> Auditar Andamentos
          </button>
        )}
      </div>

      {(adding || editing) && (
        <form onSubmit={handleSave} className="border border-border rounded-lg p-4 space-y-3 bg-secondary/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Data</label>
              <input
                type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Título</label>
              <input
                type="text" required placeholder="Ex: Notificação enviada" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Descrição (opcional)</label>
            <textarea
              rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detalhes do andamento..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum andamento registrado.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(a => (
            <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50 group">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(a.date)}</p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">{a.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(a)} className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Installments section ─────────────────────────────────────────────────────

function InstallmentsSection({ installments }: { installments: Installment[] }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const sorted = [...installments].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const display = expanded ? sorted : sorted.slice(0, 6);

  return (
    <SectionCard title="Parcelas" icon={Calendar}>
      <div className="space-y-2">
        {display.map(inst => {
          const isOverdue = inst.status === 'Pendente' && inst.due_date < today;
          return (
            <div key={inst.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-sm ${isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-secondary/30 border-border/50'}`}>
              <div className="flex items-center gap-2 min-w-0">
                {inst.status === 'Pago'
                  ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  : isOverdue
                    ? <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    : <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                <span className="text-foreground font-medium">{MONTHS[inst.reference_month - 1]}/{inst.reference_year}</span>
                <span className="text-muted-foreground text-xs hidden sm:inline">venc. {fmtDate(inst.due_date)}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-semibold ${instStyle(isOverdue ? 'Em Atraso' : inst.status)}`}>
                  {isOverdue ? 'Em Atraso' : inst.status}
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">{fmt(inst.total_value)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length > 6 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver todas ({sorted.length})</>}
        </button>
      )}
    </SectionCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { hasRole } = useAuth();
  const canAudit = hasRole('admin', 'super_admin');
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditTarget, setAuditTarget] = useState<null | 'contract' | 'andamentos'>(null);

  const fetchContract = async () => {
    try {
      const res = await api.get(`/contracts/${id}`);
      setContract(res.data);
    } catch {
      navigate('/contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContract(); }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!contract) return null;

  const { last: lastAdj, next: nextAdj } = calcAdjustmentDates(contract.adjustment_month, contract.start_date);

  const today = new Date().toISOString().split('T')[0];
  const overdueInstallments = contract.installments.filter(
    i => i.status === 'Pendente' && i.due_date < today
  );
  const overdueTotal = overdueInstallments.reduce((s, i) => s + i.total_value, 0);

  const prop = contract.property;
  const propAddress = prop
    ? [prop.address, prop.number, prop.complement, prop.neighborhood, prop.city, prop.state]
        .filter(Boolean).join(', ')
    : '—';

  const CONTRACT_STATUSES = ['Em Elaboração', 'Encaminhado para Assinatura', 'Ativo', 'Finalizado', 'Rescindido'];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === contract.status) return;
    try {
      await api.put(`/contracts/${contract.id}`, { status: newStatus });
      await fetchContract();
      addToast(
        'Andamento lançado automaticamente. Edite-o para incluir mais detalhes.',
        'info',
        { label: 'Ver andamentos ↓', onClick: () => document.getElementById('andamentos-section')?.scrollIntoView({ behavior: 'smooth' }) }
      );
    } catch {
      addToast('Erro ao alterar o status do contrato.', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Audit modals */}
      <AuditModal
        isOpen={auditTarget === 'contract'}
        onClose={() => setAuditTarget(null)}
        title={`Auditoria — CR-${contract.id.toString().padStart(4, '0')}`}
        entityType="CONTRACT"
        entityId={contract.id}
      />
      <AuditModal
        isOpen={auditTarget === 'andamentos'}
        onClose={() => setAuditTarget(null)}
        title={`Auditoria de Andamentos — CR-${contract.id.toString().padStart(4, '0')}`}
        entityType="ANDAMENTO"
        contractId={contract.id}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/contratos')}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              CR-{contract.id.toString().padStart(4, '0')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {fmtDate(contract.start_date)} a {fmtDate(contract.end_date)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={contract.status}
            onChange={e => handleStatusChange(e.target.value)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none ${statusStyle(contract.status)} bg-transparent`}
          >
            {CONTRACT_STATUSES.map(s => (
              <option key={s} value={s} className="text-foreground bg-background font-normal normal-case tracking-normal text-sm">
                {s}
              </option>
            ))}
          </select>
          {/* Audit buttons */}
          {canAudit && (
            <>
              <button
                onClick={() => setAuditTarget('contract')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Shield className="w-3.5 h-3.5" /> Auditar Contrato
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Aluguel Base</p>
          <p className="text-lg font-bold text-foreground mt-1">{fmt(contract.base_rent_value)}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${overdueTotal > 0 ? 'border-destructive/30' : 'border-border'}`}>
          <p className="text-xs text-muted-foreground font-medium">Inadimplência</p>
          <p className={`text-lg font-bold mt-1 ${overdueTotal > 0 ? 'text-destructive' : 'text-success'}`}>
            {fmt(overdueTotal)}
          </p>
          {overdueInstallments.length > 0 && (
            <p className="text-xs text-destructive">{overdueInstallments.length} parcela(s)</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Último Reajuste</p>
          <p className="text-sm font-bold text-foreground mt-1">
            {lastAdj ? `${MONTHS[lastAdj.getMonth()]}/${lastAdj.getFullYear()}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{contract.inflation_index || '—'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Próximo Reajuste
          </p>
          <p className="text-sm font-bold text-foreground mt-1">
            {nextAdj ? `${MONTHS[nextAdj.getMonth()]}/${nextAdj.getFullYear()}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Mês {contract.adjustment_month} · mín. {contract.adjustment_min_percentage}%</p>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard title="Locador (Proprietário)" icon={User}>
          <div className="grid grid-cols-1 gap-3">
            <InfoRow label="Nome" value={contract.locador?.name} />
            <InfoRow label="Tipo" value={contract.locador?.type} />
            <InfoRow label="CPF / CNPJ" value={contract.locador?.cpf || contract.locador?.cnpj} />
            <InfoRow label="Telefone" value={contract.locador?.phone} />
            <InfoRow label="E-mail" value={contract.locador?.email} />
          </div>
        </SectionCard>
        <SectionCard title="Locatário (Inquilino)" icon={User}>
          <div className="grid grid-cols-1 gap-3">
            <InfoRow label="Nome" value={contract.locatario?.name} />
            <InfoRow label="Tipo" value={contract.locatario?.type} />
            <InfoRow label="CPF / CNPJ" value={contract.locatario?.cpf || contract.locatario?.cnpj} />
            <InfoRow label="Telefone" value={contract.locatario?.phone} />
            <InfoRow label="E-mail" value={contract.locatario?.email} />
          </div>
        </SectionCard>
      </div>

      {/* Property */}
      {prop && (
        <SectionCard title="Imóvel" icon={Home}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <InfoRow label="Descrição" value={prop.description} />
            </div>
            <div className="sm:col-span-2">
              <InfoRow label="Endereço" value={propAddress} />
            </div>
            <InfoRow label="CEP" value={prop.zipcode} />
            <InfoRow label="Área Total" value={prop.total_area_m2 ? `${prop.total_area_m2} m²` : undefined} />
          </div>
          <div className="border-t border-border/50 pt-3 mt-1">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">Registros Legais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Inscrição Imobiliária / IPTU" value={prop.municipal_registration} />
              <InfoRow label="IPTU Anual" value={prop.iptu_total_value ? fmt(prop.iptu_total_value) : undefined} />
              <InfoRow label="CNM (Cad. Nacional de Matrículas)" value={prop.cnm} />
              <InfoRow label="Nº Matrícula no Cartório" value={prop.current_registry_number} />
              <div className="sm:col-span-2">
                <InfoRow label="Cartório de Registro" value={prop.current_registry_office} />
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Encargos */}
      <SectionCard title="Encargos Contratuais" icon={AlertTriangle}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoRow label="Multa por Atraso" value={`${contract.penalty_default_perc}%`} />
          <InfoRow label="Juros de Mora" value={`${contract.interest_default_perc}%/mês`} />
          <InfoRow label="Multa Rescisória" value={fmt(contract.penalty_rescission_value)} />
          <InfoRow label="Índice de Reajuste" value={contract.inflation_index} />
        </div>
      </SectionCard>

      {/* Andamentos */}
      <div id="andamentos-section">
        <AndamentosSection
          contractId={contract.id}
          andamentos={contract.andamentos}
          onRefresh={fetchContract}
          canAudit={canAudit}
          onAudit={() => setAuditTarget('andamentos')}
        />
      </div>

      {/* Parcelas */}
      <InstallmentsSection installments={contract.installments} />
    </div>
  );
}
