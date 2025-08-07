document.addEventListener('DOMContentLoaded', () => {
    // Constantes de configuração
    const ALLOWED_FILE_TYPES = ['xml', 'txt'];
    const ENCODING = 'utf-8';

    // Elementos da UI
    const UI = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        selectFileBtn: document.getElementById('selectFileBtn'),
        // O id do botão de ZIP foi corrigido no HTML
        processZipBtn: document.getElementById('processZipBtn'),
        processExcelBtn: document.getElementById('processExcelBtn'),
        processXmlBtn: document.getElementById('processXmlBtn'),
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
        
        UI.processZipBtn.addEventListener('click', () => processFile('zip'));
        UI.processExcelBtn.addEventListener('click', () => processFile('excel'));
        UI.processXmlBtn.addEventListener('click', () => processFile('xml_simplificado'));
        UI.clearFileBtn.addEventListener('click', clearFileSelection);
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
        
        UI.clearFileBtn.disabled = false;

        const filename = file.name.toLowerCase();
        
        UI.processZipBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        UI.processExcelBtn.disabled = true;
        
        if (filename.includes('_cli.xml') || filename.includes('_op.xml') || filename.includes('_gar.xml')) {
            UI.processExcelBtn.disabled = false;
        } else if (filename.includes('.xml')) {
            UI.processZipBtn.disabled = false;
            UI.processXmlBtn.disabled = false;
        }
    }

    function clearFileSelection() {
        UI.fileInput.value = '';
        AppState.selectedFile = null;
        resetFileDisplay();
        addLog('Seleção de arquivo removida.', 'info');
        UI.processZipBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        UI.processExcelBtn.disabled = true;
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

    // Lógica principal de processamento
    async function processFile(outputType) {
        if (!AppState.selectedFile || AppState.isProcessing) return;
        AppState.isProcessing = true;
        
        UI.processZipBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        UI.processExcelBtn.disabled = true;
        
        addLog(`Iniciando processamento para ${outputType}...`, 'info');
        updateProgress(0);

        const file = AppState.selectedFile;

        try {
            const fullText = await file.text();
            
            if (outputType === 'zip') {
                const clientesRegex = /<Cli[\s\S]*?<\/Cli>/g;
                const operacoesRegex = /<Op[\s\S]*?<\/Op>/g;
                const garantiasRegex = /<(Venc|ContInstFinRes4966)[\s\S]*?\/>/g;
            
                const clientesBlocks = (fullText.match(clientesRegex) || []).map(block => block.trim());
                const operacoesBlocks = (fullText.match(operacoesRegex) || []).map(block => block.trim());
                const garantiasBlocks = (fullText.match(garantiasRegex) || []).map(block => block.trim());
                
                createZipExport({
                    clientes: clientesBlocks.join('\n'),
                    operacoes: operacoesBlocks.join('\n'),
                    garantias: garantiasBlocks.join('\n')
                }, file.name);
                
            } else if (outputType === 'xml_simplificado') {
                const cliRegex = /<Cli[\s\S]*?<\/Cli>/g;
                const cliBlocks = (fullText.match(cliRegex) || []);
                const simplifiedBlocks = cliBlocks.map(block => block.replace(/\s+/g, ' ').trim());
                const simplifiedXmlContent = simplifiedBlocks.join('\n');
                downloadFile(simplifiedXmlContent, file.name, 'xml');
            } else if (outputType === 'excel') {
                let csvContent = '';
                let regex;
                const filename = file.name.toLowerCase();

                if (filename.includes('_cli.xml')) {
                    addLog('Processando arquivo _CLI.xml para CSV...', 'info');
                    const headers = ['Cd', 'Tp', 'Autorzc', 'PorteCli', 'IniRelactCli', 'FatAnual', 'TpCtrl'];
                    csvContent += headers.join(';') + '\n';
                    regex = /<Cli([^>]+)>/g;
                    let match;
                    while ((match = regex.exec(fullText)) !== null) {
                        const row = headers.map(header => extractAttribute(match[0], header));
                        csvContent += row.join(';') + '\n';
                    }
                } else if (filename.includes('_op.xml')) {
                    addLog('Processando arquivo _OP.xml para CSV...', 'info');
                    const headers = ['IPOC', 'Contrt', 'Mod', 'OrigemRec', 'Indx', 'PercIndx', 'VarCamb', 'CEP', 'TaxEft', 'DtContr', 'VlrContr', 'NatuOp', 'DtVencOp', 'ProvConsttd', 'DiaAtraso', 'CaracEspecial', 'DetCli', 'CliCd'];
                    csvContent += headers.join(';') + '\n';
                    regex = /<Op([^>]+)>/g;
                    let match;
                    while ((match = regex.exec(fullText)) !== null) {
                        const row = headers.map(header => extractAttribute(match[0], header));
                        csvContent += row.join(';') + '\n';
                    }
                } else if (filename.includes('_gar.xml')) {
                    addLog('Processando arquivo _GAR.xml para CSV...', 'info');
                    const headers = ['CliCd', 'OpNum', 'v320', 'v330', 'ClasAtFin', 'CartProvMin', 'EstInstFin', 'VlrContBr', 'TJE'];
                    csvContent += headers.join(';') + '\n';
                    const garRegex = /<(Venc|ContInstFinRes4966)[\s\S]*?\/>/g;
                    let match;
                    while ((match = garRegex.exec(fullText)) !== null) {
                        let row = headers.map(header => {
                            if (header === 'CliCd' || header === 'OpNum') {
                                return extractAttribute(match[0], header);
                            } else if (match[0].includes('Venc')) {
                                return extractAttribute(match[0], header);
                            } else if (match[0].includes('ContInstFinRes4966')) {
                                return extractAttribute(match[0], header);
                            }
                            return '';
                        });
                        csvContent += row.join(';') + '\n';
                    }
                } else {
                    showError('Formato de arquivo XML não suportado para conversão em Excel. Nome do arquivo deve conter "_CLI", "_OP" ou "_GAR".');
                    return;
                }

                if (csvContent) {
                    downloadFile(csvContent, file.name, 'csv');
                }
            }

            addLog(`Processamento para ${outputType} concluído!`, 'success');
            updateProgress(100);

        } catch (error) {
            handleProcessingError(error);
        } finally {
            const filename = AppState.selectedFile.name.toLowerCase();
            UI.clearFileBtn.disabled = false;
            AppState.isProcessing = false;
            
            UI.processZipBtn.disabled = true;
            UI.processXmlBtn.disabled = true;
            UI.processExcelBtn.disabled = true;
            
            if (filename.includes('_cli.xml') || filename.includes('_op.xml') || filename.includes('_gar.xml')) {
                UI.processExcelBtn.disabled = false;
            } else if (filename.includes('.xml')) {
                UI.processZipBtn.disabled = false;
                UI.processXmlBtn.disabled = false;
            }
        }
    }
    
    // Funções de download e manipulação de arquivos
    function downloadFile(content, originalFilename, type) {
        const baseName = originalFilename.split('.').slice(0, -1).join('.');
        let newFilename;
        let blobType;

        if (type === 'xml') {
            newFilename = `${baseName}_Alterado.xml`;
            blobType = 'application/xml';
        } else if (type === 'csv') {
            newFilename = `${baseName}.csv`;
            blobType = 'text/csv;charset=utf-8;';
            content = '\ufeff' + content;
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
            const filename = AppState.selectedFile.name.toLowerCase();
            UI.clearFileBtn.disabled = false;
            AppState.isProcessing = false;
            
            UI.processZipBtn.disabled = true;
            UI.processXmlBtn.disabled = true;
            UI.processExcelBtn.disabled = true;
            
            if (filename.includes('_cli.xml') || filename.includes('_op.xml') || filename.includes('_gar.xml')) {
                UI.processExcelBtn.disabled = false;
            } else if (filename.includes('.xml')) {
                UI.processZipBtn.disabled = false;
                UI.processXmlBtn.disabled = false;
            }
        }
    }

    function handleProcessingError(error) {
        addLog(`Erro durante o processamento: ${error.message}`, 'error');
        updateProgress(0);
        
        const filename = AppState.selectedFile.name.toLowerCase();
        UI.clearFileBtn.disabled = false;
        AppState.isProcessing = false;

        UI.processZipBtn.disabled = true;
        UI.processXmlBtn.disabled = true;
        UI.processExcelBtn.disabled = true;
        
        if (filename.includes('_cli.xml') || filename.includes('_op.xml') || filename.includes('_gar.xml')) {
            UI.processExcelBtn.disabled = false;
        } else if (filename.includes('.xml')) {
            UI.processZipBtn.disabled = false;
            UI.processXmlBtn.disabled = false;
        }
    }

    init();
});