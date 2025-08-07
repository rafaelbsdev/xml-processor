document.addEventListener('DOMContentLoaded', () => {
    // Constantes de configuração
    const ALLOWED_FILE_TYPES = ['xml', 'txt'];
    
    // Elementos da UI
    const UI = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        selectFileBtn: document.getElementById('selectFileBtn'),
        processExcelBtn: document.getElementById('processExcelBtn'), // NOVO BOTÃO
        processXmlBtn: document.getElementById('processXmlBtn'),     // NOVO BOTÃO
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
        secondaryMessage: document.querySelector('.secondary-message'),
        clearLogBtn: document.getElementById('clearLogBtn'),
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
        UI.selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            UI.fileInput.click();
        });

        UI.dropZone.addEventListener('click', () => UI.fileInput.click());
        UI.fileInput.addEventListener('change', handleFileSelection);

        // Event listeners para os novos botões
        UI.processExcelBtn.addEventListener('click', () => processFile('excel'));
        UI.processXmlBtn.addEventListener('click', () => processFile('xml'));
        
        UI.clearFileBtn.addEventListener('click', clearFileSelection);
        UI.downloadSampleBtn.addEventListener('click', downloadSampleFile);
        UI.clearLogBtn.addEventListener('click', clearLog);

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

    function extractAttributes(tagContent) {
        const attributes = {};
        const regex = /(\w+)\s*=\s*"([^"]*)"/g;
        let match;
        while ((match = regex.exec(tagContent)) !== null) {
            attributes[match[1]] = match[2];
        }
        return attributes;
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
        const fileExtension = getFileExtension(file.name);
        if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
            showError(`Tipo de arquivo não suportado. Use: ${ALLOWED_FILE_TYPES.join(', ')}`);
            return;
        }

        AppState.selectedFile = file;
        updateFileDisplay(file);
        addLog(`Arquivo selecionado: ${file.name}`, 'success');
        addLog(`Tamanho: ${formatFileSize(file.size)}`, 'info');
        
        // Habilita os dois botões de processamento
        UI.processExcelBtn.disabled = false;
        UI.processXmlBtn.disabled = false;
    }

    function clearFileSelection() {
        UI.fileInput.value = '';
        AppState.selectedFile = null;
        resetFileDisplay();
        addLog('Seleção de arquivo removida.', 'info');
        
        // Desabilita os dois botões de processamento
        UI.processExcelBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
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
        UI.uploadIcon.className = 'fas fa-file-alt';
        UI.uploadIcon.style.color = 'var(--warning)';
        
        UI.fileName.textContent = file.name;
        UI.fileSize.textContent = formatFileSize(file.size);
        UI.fileInfo.classList.add('show');
        
        UI.uploadMessage.style.display = 'none';
    }

    function resetFileDisplay() {
        UI.uploadIcon.className = 'fas fa-cloud-upload-alt';
        UI.uploadIcon.style.color = 'var(--secondary)';
        UI.fileInfo.classList.remove('show');
        UI.uploadMessage.style.display = 'block';
    }

    function showError(message) {
        UI.uploadIcon.className = 'fas fa-exclamation-circle';
        UI.uploadIcon.style.color = 'var(--error)';
        UI.dropZone.classList.add('error-state');
        
        addLog(`Erro: ${message}`, 'error');
        
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

    function addLog(message, type = 'info', replaceLast = false) {
        if (replaceLast) {
            const lastEntry = UI.logContent.lastChild;
            if (lastEntry) {
                const timestamp = new Date().toLocaleTimeString();
                lastEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
                lastEntry.className = `log-entry log-${type}`;
                UI.logContent.scrollTop = UI.logContent.scrollHeight;
                return;
            }
        }
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        
        UI.logContent.appendChild(logEntry);
        UI.logContent.scrollTop = UI.logContent.scrollHeight;
    }

    function clearLog() {
        UI.logContent.innerHTML = '<div class="log-entry">Log limpo.</div>';
    }

    // Processamento do arquivo (AGORA COM UMA FUNÇÃO ÚNICA)
    function processFile(outputType) {
        if (!AppState.selectedFile || AppState.isProcessing) return;
        
        AppState.isProcessing = true;
        UI.processExcelBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        UI.dropZone.classList.add('processing');
        addLog(`Iniciando processamento para ${outputType}...`, 'info');
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
                // AQUI, A FUNÇÃO DE SAÍDA É CHAMADA COM BASE NO outputType
                if (outputType === 'excel') {
                    processFileToExcel(e.target.result);
                } else if (outputType === 'xml') {
                    processFileToXml(e.target.result);
                }
            } catch (error) {
                handleProcessingError(error);
            }
        };
        
        reader.onerror = () => {
            handleProcessingError(new Error('Falha ao ler o arquivo'));
        };
        
        reader.readAsText(AppState.selectedFile);
    }

    // Lógica para processar e gerar Excel
    function processFileToExcel(content) {
        addLog('Processando conteúdo para gerar Excel...', 'info');
        
        const cliData = [];
        const opData = [];
        const garData = [];
        let currentCliId = 0;
        let currentOpId = 0;
        
        const lines = content.split(/\r?\n/);
        let inCliBlock = false;
        let inOpBlock = false;
        let buffer = [];
        let linesProcessed = 0;
        const totalLines = lines.length;
        const updateInterval = Math.floor(totalLines / 100) || 1;
        
        for (const line of lines) {
            const trimmed = line.trim();
            linesProcessed++;
            
            if (linesProcessed % updateInterval === 0) {
                const progress = Math.round((linesProcessed / totalLines) * 100);
                updateProgress(progress);
                addLog(`Processando linha ${linesProcessed} de ${totalLines} (${progress}%)`, 'info', true);
            }
            
            if (!trimmed) continue;
            
            if (trimmed.startsWith('<Cli') || trimmed.includes('<Cli')) {
                inCliBlock = true;
                currentCliId++;
                buffer = [trimmed];
                continue;
            }
            
            if (inCliBlock && (trimmed.startsWith('<Op') || trimmed.includes('<Op'))) {
                inOpBlock = true;
                currentOpId++;
                buffer.push(trimmed);
                continue;
            }
            
            if (inOpBlock && (trimmed.startsWith('<Gar') || trimmed.includes('<Gar'))) {
                const garAttributes = extractAttributes(trimmed);
                garAttributes.idCli = currentCliId;
                garAttributes.idOp = currentOpId;
                garData.push(garAttributes);
                buffer.push(trimmed);
                continue;
            }
            
            if (inOpBlock && (trimmed.endsWith('/>') || trimmed.includes('</Op>'))) {
                inOpBlock = false;
                buffer.push(trimmed);
                const opContent = buffer.join('');
                const opAttributes = extractAttributes(opContent);
                opAttributes.idCli = currentCliId;
                opData.push(opAttributes);
                buffer = [];
                continue;
            }
            
            if (inCliBlock && (trimmed.endsWith('/>') || trimmed.includes('</Cli>'))) {
                inCliBlock = false;
                buffer.push(trimmed);
                const cliContent = buffer.join('');
                const cliAttributes = extractAttributes(cliContent);
                cliAttributes.id = currentCliId;
                cliData.push(cliAttributes);
                buffer = [];
                continue;
            }
            
            if (inCliBlock || inOpBlock) {
                buffer.push(trimmed);
            }
        }
        
        createExcelExport(cliData, opData, garData, AppState.selectedFile.name);
        
        addLog(`Processamento para Excel concluído!`, 'success');
        addLog(`Clientes (Cli) processados: ${cliData.length}`, 'info');
        addLog(`Operações (Op) processadas: ${opData.length}`, 'info');
        addLog(`Garantias (Gar) processadas: ${garData.length}`, 'info');
        updateProgress(100);
    }
    
    // Lógica para processar e gerar XML simplificado
    function processFileToXml(content) {
        addLog('Processando conteúdo para gerar XML simplificado...', 'info');
        
        const lines = content.split(/\r?\n/);
        let inCliBlock = false;
        let buffer = [];
        let output = [];
        let cliBlocksProcessed = 0;
        let linesProcessed = 0;
        const totalLines = lines.length;
        const updateInterval = Math.floor(totalLines / 100) || 1;
        
        for (const line of lines) {
            const trimmed = line.trim();
            linesProcessed++;
            
            if (linesProcessed % updateInterval === 0) {
                const progress = Math.round((linesProcessed / totalLines) * 100);
                updateProgress(progress);
                addLog(`Processando linha ${linesProcessed} de ${totalLines} (${progress}%)`, 'info', true);
            }
            
            if (!trimmed) continue;
            
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
        
        if (buffer.length > 0) {
            output.push(buffer.join(''));
        }
        
        const processedContent = output.join('\n');
        createDownload(processedContent, AppState.selectedFile.name);
        
        addLog(`Processamento para XML concluído!`, 'success');
        addLog(`Linhas processadas: ${linesProcessed}`, 'info');
        addLog(`Blocos <Cli> processados: ${cliBlocksProcessed}`, 'info');
        updateProgress(100);
    }


    // Função para criar o arquivo Excel
    function createExcelExport(cliData, opData, garData, originalFilename) {
        try {
            addLog('Criando arquivo Excel...', 'info');
            
            const workbook = XLSX.utils.book_new();
            
            const cliSheet = XLSX.utils.json_to_sheet(cliData);
            const opSheet = XLSX.utils.json_to_sheet(opData);
            const garSheet = XLSX.utils.json_to_sheet(garData);
            
            XLSX.utils.book_append_sheet(workbook, cliSheet, 'Cli');
            XLSX.utils.book_append_sheet(workbook, opSheet, 'Op');
            XLSX.utils.book_append_sheet(workbook, garSheet, 'Gar');
            
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const newFilename = originalFilename.replace(/(\.\w+)$/, '_ALTERADO.xlsx');
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = newFilename;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            addLog(`Arquivo Excel "${newFilename}" gerado com sucesso!`, 'success');
        } catch (error) {
            addLog(`Erro ao criar Excel: ${error.message}`, 'error');
        } finally {
            UI.dropZone.classList.remove('processing');
            UI.processExcelBtn.disabled = false;
            UI.processXmlBtn.disabled = false;
            AppState.isProcessing = false;
        }
    }

    function createDownload(content, originalFilename) {
        try {
            addLog('Preparando arquivo para download...', 'info');
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            
            const newFilename = originalFilename.replace(/(\.\w+)$/, '_ALTERADO$1');
            
            downloadLink.href = url;
            downloadLink.download = newFilename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            addLog(`Download do arquivo "${newFilename}" iniciado`, 'success');
        } catch (error) {
            addLog(`Erro ao criar download: ${error.message}`, 'error');
        } finally {
            UI.dropZone.classList.remove('processing');
            UI.processExcelBtn.disabled = false;
            UI.processXmlBtn.disabled = false;
            AppState.isProcessing = false;
        }
    }

    function handleProcessingError(error) {
        addLog(`Erro durante o processamento: ${error.message}`, 'error');
        updateProgress(0);
        UI.dropZone.classList.remove('processing');
        UI.processExcelBtn.disabled = false;
        UI.processXmlBtn.disabled = false;
        AppState.isProcessing = false;
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
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            addLog('Exemplo XML baixado com sucesso!', 'success');
        } catch (error) {
            addLog(`Erro ao baixar exemplo: ${error.message}`, 'error');
        }
    }

    init();
});