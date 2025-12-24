#!/bin/bash

# ============================================
# RemoveBG - Script de Inicialização
# ============================================

PORT=3000
URL="http://localhost:$PORT"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sem cor

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║           RemoveBG - Iniciando         ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Navegar para o diretório do script
cd "$(dirname "$0")"

# Verificar se Python3 está instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERRO] Python3 não encontrado!${NC}"
    echo "Instale com: sudo apt install python3"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Python3 encontrado: $(python3 --version)"

# Verificar se a porta está em uso
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}[AVISO]${NC} Porta $PORT já está em uso."
    read -p "Deseja encerrar o processo existente? (s/n): " resposta
    if [[ "$resposta" =~ ^[Ss]$ ]]; then
        kill $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null
        echo -e "${GREEN}[OK]${NC} Processo anterior encerrado."
        sleep 1
    else
        echo -e "${RED}[ERRO]${NC} Não é possível iniciar. Porta em uso."
        exit 1
    fi
fi

# Verificar arquivos necessários
if [[ ! -f "index.html" ]]; then
    echo -e "${RED}[ERRO]${NC} Arquivo index.html não encontrado!"
    echo "Execute este script no diretório do projeto."
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Arquivos do projeto encontrados."

# Função para abrir navegador
abrir_navegador() {
    sleep 1
    if command -v xdg-open &> /dev/null; then
        xdg-open "$URL" 2>/dev/null
    elif command -v gnome-open &> /dev/null; then
        gnome-open "$URL" 2>/dev/null
    elif command -v open &> /dev/null; then
        open "$URL" 2>/dev/null
    else
        echo -e "${YELLOW}[INFO]${NC} Abra manualmente: $URL"
    fi
}

# Iniciar servidor em background e abrir navegador
echo ""
echo -e "${BLUE}[INFO]${NC} Iniciando servidor na porta $PORT..."
echo -e "${GREEN}[URL]${NC} $URL"
echo ""
echo -e "${YELLOW}Pressione Ctrl+C para encerrar${NC}"
echo ""

# Abrir navegador em background
abrir_navegador &

# Iniciar servidor HTTP
python3 -m http.server $PORT
