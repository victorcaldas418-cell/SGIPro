import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, MessageSquare, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_TEMPLATE =
  'Olá {locatario_nome}! Sua parcela referente ao contrato CR-{contrato_id} ' +
  'no valor de {valor} vence em {vencimento}. ' +
  'Por favor, efetue o pagamento até a data de vencimento.';

export default function Settings() {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings/')
      .then(res => setTemplate(res.data.whatsapp_message_template || DEFAULT_TEMPLATE))
      .catch(() => setTemplate(DEFAULT_TEMPLATE))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/settings/', { whatsapp_message_template: template });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const variables = [
    { tag: '{locatario_nome}', desc: 'Nome do locatário' },
    { tag: '{contrato_id}', desc: 'Número do contrato (ex: 0001)' },
    { tag: '{valor}', desc: 'Valor da parcela' },
    { tag: '{vencimento}', desc: 'Data de vencimento' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Personalize as mensagens automáticas do sistema.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Mensagem Automática do WhatsApp
        </h2>

        <p className="text-sm text-muted-foreground">
          Esta mensagem é enviada automaticamente via WhatsApp para o locatário quando uma cobrança é gerada.
          Use as variáveis abaixo para personalizar o texto.
        </p>

        <div className="flex flex-wrap gap-2">
          {variables.map(v => (
            <button
              key={v.tag}
              type="button"
              title={v.desc}
              onClick={() => setTemplate(t => t + v.tag)}
              className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors"
            >
              {v.tag}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Mensagem</label>
          {loading ? (
            <div className="h-32 bg-secondary/40 rounded-lg animate-pulse" />
          ) : (
            <textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition resize-none"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Clique nas variáveis acima para inseri-las no texto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground px-5 py-2 rounded-lg font-medium transition-colors shadow-md shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-success font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Salvo com sucesso!
            </span>
          )}
        </div>
      </div>

      <div className="bg-secondary/40 border border-border rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Prévia da mensagem</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {template
            .replace('{locatario_nome}', 'João Silva')
            .replace('{contrato_id}', '0001')
            .replace('{valor}', 'R$ 1.500,00')
            .replace('{vencimento}', '05/05/2025')}
        </p>
      </div>
    </div>
  );
}
