# Processador de Arquivos Bancários XML/TXT

![Captura de Tela](docs/images/screenshot.gif)

Este programa processa arquivos XML ou TXT contendo dados bancários, transformando cada bloco `<Cli>` em uma única linha.

## Funcionalidades
- Processa arquivos de grande porte (milhões de linhas)
- Interface gráfica amigável
- Gera arquivo de saída automaticamente (mesmo nome + "_ALTERADO")
- Barra de progresso e logs detalhados

## Como Executar

### Pré-requisitos
- Python 3.6 ou superior
- Pip (gerenciador de pacotes)

### Instalação
```bash
git clone https://github.com/seu-usuario/xml-processor.git
cd xml-processor
pip install -r requirements.txt