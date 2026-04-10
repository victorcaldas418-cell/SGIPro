#!/bin/bash
# ============================================
# SGI — Script de Inicialização do Backend
# ============================================

# Vai para a pasta do backend (independente de onde você executar)
cd "$(dirname "$0")"

echo "🔄 Ativando ambiente virtual Python..."
source venv/bin/activate

echo "🚀 Iniciando servidor FastAPI na porta 8000..."
echo "📋 Documentação disponível em: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
