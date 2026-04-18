# SGI Pro — Lista de Tarefas (To-Do List)

Esta é a lista principal de tarefas e próximos passos para o desenvolvimento e evolução do Sistema de Gestão Imobiliária (SGI).

## 🗂️ 1. Módulo Financeiro
- [ ] Implementar dashboard de controle de inadimplência.
- [ ] Adicionar funcionalidade de emissão/geração de recibos em PDF.
- [ ] Criar sistema de notificações (webhook) para cobranças via PIX ou Boleto (Integração de pagamentos).
- [ ] Implementar fluxo de repasse para o proprietário (split de pagamentos).

## 📄 2. Módulo de Contratos
- [ ] Criar gerador automático de minutas de contratos a partir de variáveis cadastradas (macros/tags).
- [ ] Adicionar funcionalidade de anexar documentos/PDFs assinados ao contrato.
- [ ] Implementar alertas automáticos para vencimentos e reajustes de aluguel (IGP-M / IPCA).

## 🏠 3. Módulo de Imóveis
- [ ] Melhorar a galeria de imagens para os imóveis (Upload para a nuvem - S3/Cloudinary).
- [ ] Adicionar geolocalização e visualização de mapas.
- [ ] Criar funcionalidade de controle de chaves e vistoria de entrada/saída.

## 👥 4. Módulo de Clientes (Proprietários/Inquilinos)
- [ ] Implementar formulário de qualificação completa (anexo de documentos de identidade, comprovante de renda).
- [ ] Adicionar histórico de interações e anotações para o cliente (Mini-CRM).

## 📊 5. Módulo de Relatórios
- [ ] Desenvolver relatórios dinâmicos de caixa consolidado.
- [ ] Desenvolver relatórios de comissões (vendas/locação) devidas a cada corretor.
- [ ] Criar a funcionalidade de exportação de dados para Excel e PDF.

## 🔐 6. Sistema e Segurança
- [ ] Configurar definitivamente o e-mail real (SMTP) no arquivo `.env` de produção para envio das recuperações de senha.
- [ ] Configurar logs persistentes e auditoria de usuários (ex: qual usuário apagou qual contrato / "audit log").
- [ ] Preparar ambiente final (deploy) ou conteinerização com Docker.
