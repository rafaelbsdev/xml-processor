import os

def processar_arquivo(input_path, output_path, update_progress):
    try:
        ext = os.path.splitext(input_path)[1].lower()
        
        total_lines = 0
        with open(input_path, 'r', encoding='utf-8') as f:
            total_lines = sum(1 for _ in f)
        
        with open(input_path, 'r', encoding='utf-8') as entrada, \
             open(output_path, 'w', encoding='utf-8') as saida:
            
            dentro_cli = False
            buffer = []
            linha_count = 0
            
            for linha in entrada:
                linha = linha.strip()
                linha_count += 1
                
                if linha_count % 1000 == 0 or linha_count == total_lines:
                    progresso = int((linha_count / total_lines) * 100)
                    update_progress(progresso)
                
                if linha.startswith('<Cli') or (ext == '.txt' and '<Cli' in linha):
                    dentro_cli = True
                    
                if dentro_cli:
                    buffer.append(linha)
                    if linha.endswith('</Cli>') or (ext == '.txt' and '</Cli>' in linha):
                        dentro_cli = False
                        linha_processada = ''.join(buffer)
                        saida.write(linha_processada + '\n')
                        buffer = []
            
            if buffer:
                saida.write(''.join(buffer) + '\n')
                
        update_progress(100)
        return True, f"Processamento concluído! Linhas processadas: {linha_count}"
    
    except Exception as e:
        return False, f"Erro durante o processamento: {str(e)}"