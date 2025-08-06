import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import os
import sys
from .processor import processar_arquivo

class Application(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Processador de XML/TXT Bancário")
        self.geometry("700x500")
        self.resizable(True, True)
        self.configure(bg="#f0f0f0")
        
        self.criar_widgets()
        self.caminho_entrada = ""
        self.caminho_saida = ""
    
    def criar_widgets(self):
        # Frame principal
        main_frame = ttk.Frame(self, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Cabeçalho
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Título
        titulo = ttk.Label(
            header_frame, 
            text="Processador de Arquivos Bancários", 
            font=("Arial", 14, "bold"),
            foreground="#2c3e50"
        )
        titulo.pack(side=tk.LEFT)
        
        # Frame de entrada
        input_frame = ttk.Frame(main_frame)
        input_frame.pack(fill=tk.X, pady=10)
        
        # Botão de seleção de entrada
        btn_entrada = ttk.Button(
            input_frame, 
            text="Selecionar Arquivo (XML/TXT)",
            command=self.selecionar_entrada,
            width=25
        )
        btn_entrada.pack(side=tk.LEFT, padx=(0, 10))
        
        # Label do arquivo de entrada
        self.lbl_entrada = ttk.Label(
            input_frame, 
            text="Nenhum arquivo selecionado",
            foreground="#7f8c8d"
        )
        self.lbl_entrada.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Barra de progresso
        progress_frame = ttk.Frame(main_frame)
        progress_frame.pack(fill=tk.X, pady=10)
        
        self.progress = ttk.Progressbar(
            progress_frame, 
            orient="horizontal", 
            length=500, 
            mode="determinate"
        )
        self.progress.pack(fill=tk.X)
        
        # Status
        self.lbl_status = ttk.Label(
            progress_frame, 
            text="Pronto para iniciar",
            foreground="#2c3e50"
        )
        self.lbl_status.pack(fill=tk.X, pady=(5, 0))
        
        # Frame de botões
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=10)
        
        # Botão de processamento
        self.btn_processar = ttk.Button(
            button_frame, 
            text="Processar Arquivo", 
            command=self.iniciar_processamento,
            state=tk.DISABLED,
            width=20
        )
        self.btn_processar.pack(side=tk.LEFT, padx=(0, 10))
        
        # Botão de abrir pasta
        self.btn_abrir = ttk.Button(
            button_frame, 
            text="Abrir Pasta de Saída",
            command=self.abrir_pasta_saida,
            state=tk.DISABLED,
            width=15
        )
        self.btn_abrir.pack(side=tk.LEFT)
        
        # Área de log
        log_frame = ttk.LabelFrame(main_frame, text="Log de Execução", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True)
        
        self.log_area = scrolledtext.ScrolledText(
            log_frame, 
            height=12,
            font=("Consolas", 9)
        )
        self.log_area.pack(fill=tk.BOTH, expand=True)
        self.log_area.config(state=tk.DISABLED)
        
        # Rodapé
        footer_frame = ttk.Frame(main_frame)
        footer_frame.pack(fill=tk.X, pady=(10, 0))
        
        ttk.Label(
            footer_frame, 
            text="Arquivos de saída são gerados automaticamente com '_ALTERADO' no nome",
            foreground="#7f8c8d",
            font=("Arial", 8)
        ).pack(side=tk.RIGHT)
    
    def log(self, mensagem):
        self.log_area.config(state=tk.NORMAL)
        self.log_area.insert(tk.END, mensagem + "\n")
        self.log_area.see(tk.END)
        self.log_area.config(state=tk.DISABLED)
    
    def selecionar_entrada(self):
        caminho = filedialog.askopenfilename(
            title="Selecione o arquivo XML ou TXT",
            filetypes=[
                ("Arquivos XML/TXT", "*.xml;*.txt"), 
                ("Todos os arquivos", "*.*")
            ]
        )
        if caminho:
            self.caminho_entrada = caminho
            self.lbl_entrada.config(text=os.path.basename(caminho))
            self.btn_processar.config(state=tk.NORMAL)
            self.btn_abrir.config(state=tk.DISABLED)
            self.log(f"Arquivo selecionado: {os.path.basename(caminho)}")
    
    def iniciar_processamento(self):
        if not self.caminho_entrada:
            messagebox.showerror("Erro", "Selecione um arquivo primeiro!")
            return
            
        diretorio = os.path.dirname(self.caminho_entrada)
        nome_arquivo = os.path.basename(self.caminho_entrada)
        nome, ext = os.path.splitext(nome_arquivo)
        novo_nome = f"{nome}_ALTERADO{ext}"
        self.caminho_saida = os.path.join(diretorio, novo_nome)
        
        self.btn_processar.config(state=tk.DISABLED)
        self.lbl_status.config(text="Processando...", foreground="#3498db")
        self.progress["value"] = 0
        self.log(f"Iniciando processamento...")
        self.log(f"Arquivo de saída: {novo_nome}")
        
        threading.Thread(
            target=self.executar_processamento, 
            daemon=True
        ).start()
    
    def executar_processamento(self):
        try:
            sucesso, mensagem = processar_arquivo(
                self.caminho_entrada,
                self.caminho_saida,
                self.atualizar_progresso
            )
            
            if sucesso:
                self.lbl_status.config(text="Processamento concluído!", foreground="#27ae60")
                self.btn_abrir.config(state=tk.NORMAL)
                self.log(f"SUCESSO: {mensagem}")
                self.log(f"Arquivo salvo em: {self.caminho_saida}")
            else:
                self.lbl_status.config(text="Erro no processamento", foreground="#e74c3c")
                self.log(f"ERRO: {mensagem}")
                messagebox.showerror("Erro", mensagem)
                
        except Exception as e:
            error_msg = f"Erro inesperado: {str(e)}"
            self.lbl_status.config(text=error_msg, foreground="#e74c3c")
            self.log(f"ERRO GRAVE: {error_msg}")
            messagebox.showerror("Erro Fatal", error_msg)
        finally:
            self.btn_processar.config(state=tk.NORMAL)
    
    def atualizar_progresso(self, valor):
        self.progress["value"] = valor
        self.lbl_status.config(text=f"Processando... {valor}%")
        self.update_idletasks()
    
    def abrir_pasta_saida(self):
        import subprocess
        import os
        
        if os.path.exists(self.caminho_saida):
            pasta = os.path.dirname(self.caminho_saida)
            try:
                if os.name == 'nt':  # Windows
                    subprocess.Popen(f'explorer "{pasta}"')
                elif os.name == 'posix':  # macOS, Linux
                    subprocess.Popen(['open', pasta] if sys.platform == 'darwin' else ['xdg-open', pasta])
                self.log(f"Pasta aberta: {pasta}")
            except Exception as e:
                self.log(f"Erro ao abrir pasta: {str(e)}")
        else:
            self.log("Arquivo de saída não encontrado")