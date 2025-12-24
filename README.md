# RemoveBG

Aplicacao web para remocao de fundo e corte de imagens, processando 100% no navegador.

## Funcionalidades

### Remocao de Fundo
- Upload de imagens JPG/PNG
- Remocao automatica de fundo usando IA
- Preview lado a lado (original vs resultado)
- Download em PNG com transparencia

### Corte de Imagens
- Ferramenta de corte independente
- Proporcoes: Livre, 1:1, 4:3, 16:9, 16:7
- Interface interativa com drag e resize
- Suporte a mouse e touch (mobile)
- Pode cortar imagem original ou resultado

## Tecnologias

- HTML5 / CSS3 / JavaScript (ES6+)
- Biblioteca: @imgly/background-removal via CDN
- Canvas API para corte de imagens

## Estrutura do Projeto

```
removebg/
├── index.html   # Interface do usuario
├── style.css    # Estilos (tema escuro)
├── app.js       # Logica de processamento e corte
├── start.sh     # Script para iniciar a aplicacao
└── README.md    # Documentacao
```

## Instalacao e Execucao

### Opcao 1: Script automatico

```bash
chmod +x start.sh
./start.sh
```

### Opcao 2: Manual

```bash
python3 -m http.server 3000
```

Acessar: http://localhost:3000

## Como Usar

### Remover Fundo

1. Clique em "Selecionar Imagem"
2. Escolha uma imagem JPG ou PNG
3. Clique em "Remover BG"
4. Aguarde o processamento
5. Clique em "Baixar Imagem" para salvar

### Cortar Imagem

1. Apos selecionar uma imagem, clique em "Recortar Imagem"
2. Arraste a area de selecao para posicionar
3. Use os handles nas bordas/cantos para redimensionar
4. Escolha uma proporcao fixa se desejar (1:1, 4:3, etc.)
5. Clique em "Aplicar Recorte"

## Requisitos

- Python 3.x (para servidor HTTP local)
- Navegador moderno com suporte a ES Modules

## Notas Tecnicas

- Requer servidor HTTP (nao funciona com file:// por usar ES Modules)
- Primeira execucao baixa modelos de IA (~30MB)
- Imagens sao processadas localmente, nunca enviadas para servidores externos
- O corte usa Canvas API com conversao de coordenadas para precisao em imagens escaladas
- Suporta touch events para dispositivos moveis

## Licenca

MIT
