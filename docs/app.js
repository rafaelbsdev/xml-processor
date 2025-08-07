document.addEventListener('DOMContentLoaded', () => {
    // Constantes de configuração
    const ALLOWED_FILE_TYPES = ['xml', 'txt'];
    const ENCODING = 'utf-8';

    // Elementos da UI
    const UI = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        selectFileBtn: document.getElementById('selectFileBtn'),
        processExcelBtn: document.getElementById('processExcelBtn'), // Botão existente será usado para CSV
        processXmlBtn: document.getElementById('processXmlBtn'),
        downloadSampleBtn: document.getElementById('downloadSampleBtn'),
        clearFileBtn: document.getElementById('clearFileBtn'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        logContent: document.getElementById('logContent'),
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
        UI.fileInput.addEventListener('change', handleFileSelection);
        
        // O botão 'Gerar Excel' agora acionará a lógica de processamento CSV
        UI.processExcelBtn.addEventListener('click', () => processFile('csv'));
        
        UI.processXmlBtn.addEventListener('click', () => processFile('xml'));
        UI.clearFileBtn.addEventListener('click', clearFileSelection);
        UI.downloadSampleBtn.addEventListener('click', downloadSampleFile);
        UI.clearLogBtn.addEventListener('click', clearLog);
        
        const dropZone = document.getElementById('dropZone');
        const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
        dragEvents.forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        dropZone.addEventListener('dragenter', () => dropZone.classList.add('highlight'), false);
        dropZone.addEventListener('dragover', () => dropZone.classList.add('highlight'), false);
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false);
        });
        dropZone.addEventListener('drop', handleFileDrop, false);
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
    
    function sanitizeForCsv(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const sanitized = String(value).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
        return sanitized.includes(',') ? `"${sanitized}"` : sanitized;
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
        UI.processExcelBtn.disabled = false;
        UI.processXmlBtn.disabled = false;
        UI.clearFileBtn.disabled = false;
    }

    function clearFileSelection() {
        UI.fileInput.value = '';
        AppState.selectedFile = null;
        resetFileDisplay();
        addLog('Seleção de arquivo removida.', 'info');
        UI.processExcelBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        UI.clearFileBtn.disabled = true;
    }

    // Atualização da UI
    function updateFileDisplay(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        document.getElementById('fileInfo').style.display = 'flex';
        document.querySelector('.upload-message').style.display = 'none';
        document.querySelector('.upload-icon').style.display = 'none';
        
    }

    function resetFileDisplay() {
        document.getElementById('fileName').textContent = 'Nenhum arquivo selecionado';
        document.getElementById('fileSize').textContent = '';
        document.getElementById('fileInfo').style.display = 'none';
        document.querySelector('.upload-message').style.display = 'block';
        document.querySelector('.upload-icon').style.display = 'flex';
    }

    function showError(message) {
        addLog(`Erro: ${message}`, 'error');
    }

    function updateProgress(percent) {
        document.getElementById('progressBar').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `${percent}%`;
    }

    function addLog(message, type = 'info', replaceLast = false) {
        const logContent = document.getElementById('logContent');
        if (replaceLast) {
            const lastEntry = logContent.lastChild;
            if (lastEntry) {
                const timestamp = new Date().toLocaleTimeString();
                lastEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
                lastEntry.className = `log-entry log-${type}`;
                logContent.scrollTop = logContent.scrollHeight;
                return;
            }
        }
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    function clearLog() {
        document.getElementById('logContent').innerHTML = '<div class="log-entry">Log limpo.</div>';
    }

    // Lógica de processamento para CSV
    async function processFile(outputType) {
        if (!AppState.selectedFile || AppState.isProcessing) return;
        AppState.isProcessing = true;
        UI.processExcelBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        
        addLog(`Iniciando processamento para ${outputType}...`, 'info');
        updateProgress(0);

        const file = AppState.selectedFile;
        const reader = file.stream().getReader();
        const decoder = new TextDecoder(ENCODING);

        let contentBuffer = '';
        let bytesProcessed = 0;
        const totalBytes = file.size;
        
        let outputContent = '';
        // Cabeçalho completo do CSV, unindo todos os atributos das tags <Cli>, <Op> e <Gar>
        const csvHeader = 'cli_Cd,cli_Nom,op_Num,op_Vlr,gar_Cd,gar_Vlr,gar_ClasAtFin,gar_CartProvMin,gar_EstInstFin,gar_VlrContBr,gar_TJE,gar_v330,gar_v320\n';
        if (outputType === 'csv') {
            outputContent += csvHeader;
        }

        let inCliBlock = false;
        let buffer = [];
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                bytesProcessed += value.length;
                contentBuffer += decoder.decode(value, { stream: true });
                
                let lines = contentBuffer.split(/\r?\n/);
                contentBuffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    if (trimmed.startsWith('<Cli')) {
                        if (inCliBlock) {
                            if (outputType === 'csv') {
                                outputContent += processCsvBlock(buffer.join(''));
                            } else {
                                outputContent += buffer.join('\n');
                            }
                        }
                        inCliBlock = true;
                        buffer = [trimmed];
                    } else if (inCliBlock) {
                        buffer.push(trimmed);
                        if (trimmed.endsWith('</Cli>')) {
                            if (outputType === 'csv') {
                                outputContent += processCsvBlock(buffer.join(''));
                            } else {
                                outputContent += buffer.join('\n');
                            }
                            inCliBlock = false;
                            buffer = [];
                        }
                    } else if (outputType === 'xml') {
                        outputContent += line + '\n';
                    }
                }
                const progress = Math.round((bytesProcessed / totalBytes) * 100);
                updateProgress(progress);
                addLog(`Progresso: ${progress}% (${bytesProcessed}/${totalBytes} bytes)`, 'info', true);
            }

            // Processa o buffer final
            if (inCliBlock && buffer.length > 0) {
                 if (outputType === 'csv') {
                     outputContent += processCsvBlock(buffer.join(''));
                 } else {
                     outputContent += buffer.join('\n');
                 }
            }
            if (contentBuffer.length > 0 && outputType === 'xml') {
                 outputContent += contentBuffer + '\n';
            }

            if (outputType === 'csv') {
                createCsvExport(outputContent, AppState.selectedFile.name);
            } else if (outputType === 'xml') {
                createDownload(outputContent, AppState.selectedFile.name);
            }

            addLog(`Processamento para ${outputType} concluído!`, 'success');
            updateProgress(100);

        } catch (error) {
            handleProcessingError(error);
        } finally {
            UI.processExcelBtn.disabled = false;
            UI.processXmlBtn.disabled = false;
            AppState.isProcessing = false;
        }
    }
    
    function processCsvBlock(xmlBlockContent) {
        let csvLines = '';

        const cliMatch = xmlBlockContent.match(/<Cli[^>]*>/);
        if (cliMatch) {
            const cliAttributes = extractAttributes(cliMatch[0]);
            const cliCd = cliAttributes.Cd || '';
            const cliNom = cliAttributes.Nom || '';

            const opRegex = /<Op[^>]*>[\s\S]*?<\/Op>/g;
            const opMatches = xmlBlockContent.match(opRegex) || [];
            
            if (opMatches.length === 0) {
                // Caso não haja Op, cria uma linha apenas com dados do Cli
                csvLines += [
                    sanitizeForCsv(cliCd),
                    sanitizeForCsv(cliNom),
                    '', '', '', '', '', '', '', '', '', '', ''
                ].join(',') + '\n';
            } else {
                opMatches.forEach((opMatch) => {
                    const opMatchTag = opMatch.match(/<Op[^>]*>/);
                    const opAttributes = opMatchTag ? extractAttributes(opMatchTag[0]) : {};
                    const opNum = opAttributes.Num || '';
                    const opVlr = opAttributes.Vlr || '';
                    
                    const garRegex = /<(Venc|ContInstFinRes4966)[^>]*\/>/g;
                    const garMatches = opMatch.match(garRegex) || [];

                    if (garMatches.length === 0) {
                        // Caso não haja Gar, cria uma linha com Cli e Op
                        csvLines += [
                            sanitizeForCsv(cliCd),
                            sanitizeForCsv(cliNom),
                            sanitizeForCsv(opNum),
                            sanitizeForCsv(opVlr),
                            '', '', '', '', '', '', '', '', ''
                        ].join(',') + '\n';
                    } else {
                         garMatches.forEach((garMatch) => {
                            const garAttributes = extractAttributes(garMatch);
                            const garCd = garAttributes.Cd || '';
                            const garVlr = garAttributes.Vlr || '';
                            const garClasAtFin = garAttributes.ClasAtFin || '';
                            const garCartProvMin = garAttributes.CartProvMin || '';
                            const garEstInstFin = garAttributes.EstInstFin || '';
                            const garVlrContBr = garAttributes.VlrContBr || '';
                            const garTJE = garAttributes.TJE || '';
                            const garv330 = garAttributes.v330 || '';
                            const garv320 = garAttributes.v320 || '';

                            // Cria uma linha completa para cada garantia
                            csvLines += [
                                sanitizeForCsv(cliCd),
                                sanitizeForCsv(cliNom),
                                sanitizeForCsv(opNum),
                                sanitizeForCsv(opVlr),
                                sanitizeForCsv(garCd),
                                sanitizeForCsv(garVlr),
                                sanitizeForCsv(garClasAtFin),
                                sanitizeForCsv(garCartProvMin),
                                sanitizeForCsv(garEstInstFin),
                                sanitizeForCsv(garVlrContBr),
                                sanitizeForCsv(garTJE),
                                sanitizeForCsv(garv330),
                                sanitizeForCsv(garv320)
                            ].join(',') + '\n';
                        });
                    }
                });
            }
        }
        return csvLines;
    }

    // Funções de download e manipulação de arquivos
    function createCsvExport(content, originalFilename) {
        try {
            addLog('Criando arquivo CSV...', 'info');
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const newFilename = originalFilename.replace(/(\.\w+)$/, '_ALTERADO.csv');
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
            addLog(`Arquivo CSV "${newFilename}" gerado com sucesso!`, 'success');
        } catch (error) {
            addLog(`Erro ao criar CSV: ${error.message}`, 'error');
        } finally {
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
            UI.processExcelBtn.disabled = false;
            UI.processXmlBtn.disabled = false;
            AppState.isProcessing = false;
        }
    }

    function handleProcessingError(error) {
        addLog(`Erro durante o processamento: ${error.message}`, 'error');
        updateProgress(0);
        UI.processExcelBtn.disabled = false;
        UI.processXmlBtn.disabled = false;
        AppState.isProcessing = false;
    }

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