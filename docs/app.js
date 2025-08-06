document.addEventListener('DOMContentLoaded', () => {
    // Constantes de configuração
    const ALLOWED_FILE_TYPES = ['xml', 'txt'];
    
    // Elementos da UI
    const UI = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        selectFileBtn: document.getElementById('selectFileBtn'),
        processBtn: document.getElementById('processBtn'),
        downloadSampleBtn: document.getElementById('downloadSampleBtn'),
        clearFileBtn: document.getElementById('clearFileBtn'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        logContent: document.getElementById('logContent'),
        uploadIcon: document.querySelector('.upload-icon i'),
        fileName: document.getElementById('fileName'),
        fileSize: document.getElementById('fileSize'),
        fileInfo: document.getElementById('fileInfo'),
        uploadMessage: document.querySelector('.upload-message'),
        mainMessage: document.querySelector('.main-message'),
        secondaryMessage: document.querySelector('.secondary-message')
    };

    // Estado da aplicação
    const AppState = {
        selectedFile: null,
        isProcessing: false
    };

    // Inicialização
    function init() {
        setupEventListeners();
        addLog('Aplicação inicializada. Selecione um arquivo para começar.');
    }

    // Configuração de event listeners
    function setupEventListeners() {
        // Upload por clique
        UI.selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            UI.fileInput.click();
        });

        // Upload por clique na área
        UI.dropZone.addEventListener('click', () => UI.fileInput.click());

        // Seleção de arquivo
        UI.fileInput.addEventListener('change', handleFileSelection);

        // Processamento
        UI.processBtn.addEventListener('click', processFile);

        // Limpar seleção
        UI.clearFileBtn.addEventListener('click', clearFileSelection);

        // Download de exemplo
        UI.downloadSampleBtn.addEventListener('click', downloadSampleFile);

        // Drag and drop
        const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
        dragEvents.forEach(eventName => {
            UI.dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            UI.dropZone.addEventListener(eventName, highlightDropZone, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            UI.dropZone.addEventListener(eventName, unhighlightDropZone, false);
        });

        UI.dropZone.addEventListener('drop', handleFileDrop, false);
    }

    // Funções utilitárias
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, unitIndex)).toFixed(2)} ${units[unitIndex]}`;
    }

    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    // Manipulação de arquivos
    function handleFileSelection(e) {
        const files = e.target.files;
        if (files.length > 0) {
            validateAndLoadFile(files[0]);
        }
    }

    function handleFileDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            validateAndLoadFile(files[0]);
        }
    }

    function validateAndLoadFile(file) {
        // Validação do tipo de arquivo
        const fileExtension = getFileExtension(file.name);
        if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
            showError(`Tipo de arquivo não suportado. Use: ${ALLOWED_FILE_TYPES.join(', ')}`);
            return;
        }

        // Carregar arquivo válido
        AppState.selectedFile = file;
        updateFileDisplay(file);
        addLog(`Arquivo selecionado: ${file.name}`, 'success');
        addLog(`Tamanho: ${formatFileSize(file.size)}`, 'info');
        UI.processBtn.disabled = false;
    }

    function clearFileSelection() {
        UI.fileInput.value = '';
        AppState.selectedFile = null;
        resetFileDisplay();
        addLog('Seleção de arquivo removida.', 'info');
        UI.processBtn.disabled = true;
    }

    // Atualização da UI
    function highlightDropZone() {
        UI.dropZone.classList.add('active');
        UI.mainMessage.textContent = 'Solte o arquivo para carregar';
        UI.secondaryMessage.style.visibility = 'hidden';
        UI.uploadIcon.className = 'fas fa-file-upload';
        UI.uploadIcon.style.color = 'var(--accent)';
    }

    function unhighlightDropZone() {
        UI.dropZone.classList.remove('active');
        UI.mainMessage.textContent = 'Arraste e solte seu arquivo XML/TXT aqui';
        UI.secondaryMessage.style.visibility = 'visible';
        
        if (!AppState.selectedFile) {
            UI.uploadIcon.className = 'fas fa-cloud-upload-alt';
            UI.uploadIcon.style.color = 'var(--secondary)';
        }
    }

    function updateFileDisplay(file) {
        // Atualizar ícone
        UI.uploadIcon.className = 'fas fa-file-alt';
        UI.uploadIcon.style.color = 'var(--warning)';
        
        // Atualizar informações do arquivo
        UI.fileName.textContent = file.name;
        UI.fileSize.textContent = formatFileSize(file.size);
        UI.fileInfo.classList.add('show');
        
        // Ocultar mensagem padrão
        UI.uploadMessage.style.display = 'none';
    }

    function resetFileDisplay() {
        UI.uploadIcon.className = 'fas fa-cloud-upload-alt';
        UI.uploadIcon.style.color = 'var(--secondary)';
        UI.fileInfo.classList.remove('show');
        UI.uploadMessage.style.display = 'block';
    }

    function showError(message) {
        // Feedback visual
        UI.uploadIcon.className = 'fas fa-exclamation-circle';
        UI.uploadIcon.style.color = 'var(--error)';
        UI.dropZone.classList.add('error-state');
        
        // Log do erro
        addLog(`Erro: ${message}`, 'error');
        
        // Reset após timeout
        setTimeout(() => {
            UI.dropZone.classList.remove('error-state');
            if (!AppState.selectedFile) {
                resetFileDisplay();
            }
        }, 2000);
    }

    function updateProgress(percent) {
        UI.progressBar.style.width = `${percent}%`;
        UI.progressText.textContent = `${percent}%`;
    }

    function addLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        
        UI.logContent.appendChild(logEntry);
        UI.logContent.scrollTop = UI.logContent.scrollHeight;
    }

    function clearLog() {
        UI.logContent.innerHTML = '<div class="log-entry">Log limpo</div>';
    }

    // Processamento do arquivo
    function processFile() {
        if (!AppState.selectedFile || AppState.isProcessing) return;
        
        AppState.isProcessing = true;
        UI.processBtn.disabled = true;
        UI.dropZone.classList.add('processing');
        addLog('Iniciando processamento...', 'info');
        updateProgress(0);
        
        const reader = new FileReader();
        
        reader.onloadstart = () => {
            addLog('Lendo conteúdo do arquivo...', 'info');
        };
        
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(percent);
                addLog(`Progresso da leitura: ${percent}%`, 'info', true);
            }
        };
        
        reader.onload = (e) => {
            try {
                processFileContent(e.target.result);
            } catch (error) {
                handleProcessingError(error);
            }
        };
        
        reader.onerror = () => {
            handleProcessingError(new Error('Falha ao ler o arquivo'));
        };
        
        reader.readAsText(AppState.selectedFile);
    }

    function processFileContent(content) {
        addLog('Processando conteúdo...', 'info');
        
        // Processar linhas do arquivo
        const lines = content.split(/\r?\n/);
        let inCliBlock = false;
        let buffer = [];
        let output = [];
        let cliBlocksProcessed = 0;
        let linesProcessed = 0;
        const totalLines = lines.length;
        const updateInterval = Math.floor(totalLines / 100) || 1; // Atualizar a cada ~1%
        
        for (const line of lines) {
            const trimmed = line.trim();
            linesProcessed++;
            
            // Atualizar progresso periodicamente
            if (linesProcessed % updateInterval === 0) {
                const progress = Math.round((linesProcessed / totalLines) * 100);
                updateProgress(progress);
                addLog(`Processando linha ${linesProcessed} de ${totalLines} (${progress}%)`, 'info', true);
            }
            
            if (!trimmed) continue;
            
            // Detectar blocos Cli
            if (trimmed.startsWith('<Cli') || trimmed.includes('<Cli')) {
                inCliBlock = true;
            }
            
            if (inCliBlock) {
                buffer.push(trimmed);
                
                if (trimmed.endsWith('</Cli>') || trimmed.includes('</Cli>')) {
                    inCliBlock = false;
                    output.push(buffer.join(''));
                    buffer = [];
                    cliBlocksProcessed++;
                }
            } else {
                output.push(trimmed);
            }
        }
        
        // Finalizar processamento
        if (buffer.length > 0) {
            output.push(buffer.join(''));
        }
        
        const processedContent = output.join('\n');
        createDownload(processedContent, AppState.selectedFile.name);
        
        addLog(`Processamento concluído!`, 'success');
        addLog(`Linhas processadas: ${linesProcessed}`, 'info');
        addLog(`Blocos <Cli> processados: ${cliBlocksProcessed}`, 'info');
        updateProgress(100);
    }

    function handleProcessingError(error) {
        addLog(`Erro durante o processamento: ${error.message}`, 'error');
        updateProgress(0);
        UI.dropZone.classList.remove('processing');
        UI.processBtn.disabled = false;
        AppState.isProcessing = false;
    }

    function createDownload(content, originalFilename) {
        try {
            addLog('Preparando arquivo para download...', 'info');
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            
            // Criar nome do arquivo de saída
            const newFilename = originalFilename.replace(/(\.\w+)$/, '_ALTERADO$1');
            
            downloadLink.href = url;
            downloadLink.download = newFilename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Liberar memória
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            addLog(`Download do arquivo "${newFilename}" iniciado`, 'success');
        } catch (error) {
            addLog(`Erro ao criar download: ${error.message}`, 'error');
        } finally {
            UI.dropZone.classList.remove('processing');
            UI.processBtn.disabled = false;
            AppState.isProcessing = false;
        }
    }

    // Exemplo de arquivo
    function downloadSampleFile() {
        const sampleContent = `É o Rafa vida.... Ta achando q vai ser mamão assim? Sobe o XML vc ai pô. Quer tudo mamão? Quer docinho? Ai não dá né?`;
        
        try {
            const blob = new Blob([sampleContent], { type: 'text/xml' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            
            downloadLink.href = url;
            downloadLink.download = 'exemplo_bancario.xml';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Liberar memória
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            addLog('Exemplo XML baixado com sucesso!', 'success');
        } catch (error) {
            addLog(`Erro ao baixar exemplo: ${error.message}`, 'error');
        }
    }

    // Iniciar a aplicação
    init();
});