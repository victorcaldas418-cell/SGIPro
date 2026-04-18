import { useEffect, useState } from 'react';
import { Shield, X, RefreshCw, Clock, User, Tag } from 'lucide-react';
import { api } from '../services/api';

interface AuditEntry {
  id: number;
  user_name: string;
  entity_type: string;
  entity_id?: number;
  contract_id?: number;
  action: string;
  description: string;
  created_at: string;
}

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityType: string;
  entityId?: number;
  contractId?: number;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CRIAR:     { label: 'Criação',    color: 'bg-success/10 text-success border-success/20' },
  ATUALIZAR: { label: 'Atualização', color: 'bg-primary/10 text-primary border-primary/20' },
  EXCLUIR:   { label: 'Exclusão',   color: 'bg-destructive/10 text-destructive border-destructive/20' },
  STATUS:    { label: 'Status',     color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PAGAMENTO: { label: 'Pagamento',  color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditModal({ isOpen, onClose, title, entityType, entityId, contractId }: AuditModalProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { entity_type: entityType, limit: 200 };
      if (entityId !== undefined) params.entity_id = entityId;
      if (contractId !== undefined) params.contract_id = contractId;
      const res = await api.get('/audit/', { params });
      setEntries(res.data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetch();
  }, [isOpen, entityType, entityId, contractId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {entries.length} registros
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetch}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            entries.map(entry => {
              const badge = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'bg-muted text-muted-foreground border-border' };
              return (
                <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />{entry.user_name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{fmtDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">{entry.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
