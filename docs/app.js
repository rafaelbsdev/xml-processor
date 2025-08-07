document.addEventListener('DOMContentLoaded', () => {
    // Constantes de configuração
    const ALLOWED_FILE_TYPES = ['xml', 'txt'];
    const ENCODING = 'utf-8';

    // Elementos da UI
    const UI = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        selectFileBtn: document.getElementById('selectFileBtn'),
        processExcelBtn: document.getElementById('processExcelBtn'),
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
        
        UI.processExcelBtn.addEventListener('click', () => processFile('zip'));
        UI.processXmlBtn.addEventListener('click', () => processFile('xml_simplificado'));
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

    function extractAttribute(tag, attributeName) {
        const regex = new RegExp(`${attributeName}="([^"]*)"`);
        const match = tag.match(regex);
        return match ? match[1] : '';
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

    // Lógica principal de processamento em streaming
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
        
        let clientesXml = '';
        let operacoesXml = '';
        let garantiasXml = '';
        let simplifiedXml = '';

        let currentCliCd = '';
        let currentOpNum = '';
        let inCmpBlock = false;

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
                    
                    if (outputType === 'zip') {
                        if (trimmed.startsWith('<Cli')) {
                            currentCliCd = extractAttribute(trimmed, 'Cd');
                            clientesXml += `${trimmed}\n`;
                        } else if (trimmed.startsWith('<Op')) {
                            currentOpNum = extractAttribute(trimmed, 'Num');
                            const opWithCliCd = trimmed.replace(/\/?>/, ` CliCd="${currentCliCd}">`);
                            operacoesXml += `${opWithCliCd}\n`;
                        } else if (trimmed.startsWith('<Venc') || trimmed.startsWith('<ContInstFinRes4966')) {
                            const garWithCliOp = trimmed.replace(/\/?>/, ` CliCd="${currentCliCd}" OpNum="${currentOpNum}">`);
                            garantiasXml += `${garWithCliOp}\n`;
                        } else if (trimmed.includes('</Op>')) {
                            operacoesXml += `${trimmed}\n`;
                        } else if (trimmed.includes('</Cli>')) {
                            clientesXml += `${trimmed}\n`;
                            currentCliCd = '';
                        }
                    } else if (outputType === 'xml_simplificado') {
                        if (trimmed.startsWith('<Cmp')) {
                            inCmpBlock = true;
                        } else if (trimmed.startsWith('</Cmp>')) {
                            inCmpBlock = false;
                            continue;
                        }

                        if (!inCmpBlock) {
                            simplifiedXml += `${line}\n`;
                        }
                    }
                }
                const progress = Math.round((bytesProcessed / totalBytes) * 100);
                updateProgress(progress);
                addLog(`Progresso: ${progress}% (${bytesProcessed}/${totalBytes} bytes)`, 'info', true);
            }

            if (contentBuffer.length > 0) {
                 if (outputType === 'zip') {
                     const trimmed = contentBuffer.trim();
                     if (trimmed.startsWith('<Cli') || trimmed.includes('</Cli>')) {
                         clientesXml += `${trimmed}\n`;
                     } else if (trimmed.startsWith('<Op') || trimmed.includes('</Op>')) {
                         const opWithCliCd = trimmed.replace(/\/?>/, ` CliCd="${currentCliCd}">`);
                         operacoesXml += `${opWithCliCd}\n`;
                     } else if (trimmed.startsWith('<Venc') || trimmed.startsWith('<ContInstFinRes4966')) {
                         const garWithCliOp = trimmed.replace(/\/?>/, ` CliCd="${currentCliCd}" OpNum="${currentOpNum}">`);
                         garantiasXml += `${garWithCliOp}\n`;
                     }
                 } else if (outputType === 'xml_simplificado') {
                     const trimmed = contentBuffer.trim();
                     if (trimmed.startsWith('<Cmp')) {
                         inCmpBlock = true;
                     } else if (trimmed.startsWith('</Cmp>')) {
                         inCmpBlock = false;
                     }

                     if (!inCmpBlock) {
                         simplifiedXml += `${contentBuffer}\n`;
                     }
                 }
            }

            if (outputType === 'zip') {
                createZipExport({
                    clientes: clientesXml,
                    operacoes: operacoesXml,
                    garantias: garantiasXml
                }, file.name);
            } else if (outputType === 'xml_simplificado') {
                // Adiciona o cabeçalho e tag raiz somente aqui, após a filtragem
                const finalSimplifiedXml = `<?xml version="1.0" encoding="utf-8"?>\n<root>\n${simplifiedXml.trim()}\n</root>`;
                downloadFile(finalSimplifiedXml, file.name, 'xml');
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
    
    // Funções de download e manipulação de arquivos
    function downloadFile(content, originalFilename, type) {
        const baseName = originalFilename.split('.').slice(0, -1).join('.');
        let newFilename;
        let blobType;

        if (type === 'xml') {
            newFilename = `${baseName}_SIMPLIFICADO.xml`;
            blobType = 'application/xml';
        } else {
            newFilename = `${baseName}.txt`;
            blobType = 'text/plain';
        }
        
        const blob = new Blob([content], { type: blobType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = newFilename;
        document.body.appendChild(a);
        
        // Adicionando um pequeno atraso para garantir que o elemento esteja no DOM antes de ser clicado
        setTimeout(() => {
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 50);
        addLog(`Arquivo "${newFilename}" gerado com sucesso!`, 'success');
    }

    function createZipExport(files, originalFilename) {
        try {
            addLog('Criando arquivo ZIP...', 'info');
            const zip = new JSZip();

            const baseName = originalFilename.split('.').slice(0, -1).join('.');

            const clientesContent = `<?xml version="1.0" encoding="utf-8"?><root>${files.clientes}</root>`;
            const operacoesContent = `<?xml version="1.0" encoding="utf-8"?><root>${files.operacoes}</root>`;
            const garantiasContent = `<?xml version="1.0" encoding="utf-8"?><root>${files.garantias}</root>`;

            zip.file(`${baseName}_CLI.xml`, clientesContent);
            zip.file(`${baseName}_OP.xml`, operacoesContent);
            zip.file(`${baseName}_GAR.xml`, garantiasContent);

            zip.generateAsync({ type: 'blob' }).then(content => {
                const newFilename = originalFilename.replace(/\.[^/.]+$/, '.zip');
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = newFilename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                addLog(`Arquivo ZIP "${newFilename}" gerado com sucesso!`, 'success');
            });
        } catch (error) {
            addLog(`Erro ao criar ZIP: ${error.message}`, 'error');
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
        const sampleContent = `<?xml version="1.0" encoding="utf-8"?><root><Cli Cd="123" Nom="Cliente A"><Op Num="op1" Vlr="1000"><Venc Cd="v1" Vlr="500"/><Cmp>Conteudo a ser removido</Cmp></Op><Op Num="op2" Vlr="2000"><ContInstFinRes4966 Cd="g1" Vlr="1500"/><Cmp>Outro Conteudo a ser removido</Cmp></Op></Cli><Cli Cd="456" Nom="Cliente B"><Op Num="op3" Vlr="3000"><Venc Cd="v2" Vlr="1000"/></Op></Cli></root>`;
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