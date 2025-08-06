document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const processBtn = document.getElementById('processBtn');
    const downloadSampleBtn = document.getElementById('downloadSampleBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const logContent = document.getElementById('logContent');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const uploadIcon = dropZone.querySelector('.upload-icon i');
    
    let selectedFile = null;
    
    // Event Listeners
    selectFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    processBtn.addEventListener('click', processFile);
    downloadSampleBtn.addEventListener('click', downloadSample);
    clearLogBtn.addEventListener('click', clearLog);
    
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Funções
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('active');
        uploadIcon.className = 'fas fa-file-upload';
        uploadIcon.style.color = '#27ae60';
    }
    
    function unhighlight() {
        dropZone.classList.remove('active');
        uploadIcon.className = 'fas fa-cloud-upload-alt';
        uploadIcon.style.color = '#3498db';
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFileSelect(e) {
        handleFiles(e.target.files);
        // Resetar o input para permitir selecionar o mesmo arquivo novamente
        e.target.value = '';
    }
    
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        if (fileExtension !== 'xml' && fileExtension !== 'txt') {
            addLog('Erro: Apenas arquivos XML ou TXT são suportados', 'error');
            return;
        }
        
        selectedFile = file;
        
        // Atualizar a interface
        uploadIcon.className = 'fas fa-file-alt';
        uploadIcon.style.color = '#f39c12';
        dropZone.querySelector('p').textContent = fileName;
        
        addLog(`Arquivo selecionado: ${fileName}`);
        addLog(`Tamanho: ${formatFileSize(file.size)}`);
        processBtn.disabled = false;
    }
    
    function processFile() {
        if (!selectedFile) return;
        
        addLog('Iniciando processamento...');
        updateProgress(0);
        processBtn.disabled = true;
        
        const reader = new FileReader();
        
        reader.onloadstart = function() {
            addLog('Lendo arquivo...');
        };
        
        reader.onload = function(e) {
            try {
                addLog('Processando conteúdo...');
                const content = e.target.result;
                const processedContent = processXmlTxt(content);
                
                // Criar link de download
                const blob = new Blob([processedContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                
                // Gerar nome do arquivo de saída
                const fileName = selectedFile.name;
                const newFileName = fileName.replace(/(\.\w+)$/, '_ALTERADO$1');
                a.download = newFileName;
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                addLog('Processamento concluído com sucesso!', 'success');
                addLog(`Arquivo "${newFileName}" gerado para download`);
                updateProgress(100);
                
            } catch (error) {
                addLog(`Erro durante o processamento: ${error.message}`, 'error');
                updateProgress(0);
            } finally {
                processBtn.disabled = false;
            }
        };
        
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(percent);
                addLog(`Progresso: ${percent}%`, 'info', true);
            }
        };
        
        reader.onerror = function() {
            addLog('Erro ao ler o arquivo', 'error');
            updateProgress(0);
            processBtn.disabled = false;
        };
        
        reader.readAsText(selectedFile);
    }
    
    function processXmlTxt(content) {
        // Dividir em linhas e processar
        const lines = content.split(/\r?\n/);
        let inCli = false;
        let buffer = [];
        let output = [];
        let cliCount = 0;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed) continue;
            
            // Detectar início do bloco Cli
            if (trimmed.startsWith('<Cli') || trimmed.includes('<Cli')) {
                inCli = true;
                cliCount++;
            }
            
            if (inCli) {
                buffer.push(trimmed);
                
                // Detectar fim do bloco Cli
                if (trimmed.endsWith('</Cli>') || trimmed.includes('</Cli>')) {
                    inCli = false;
                    output.push(buffer.join(''));
                    buffer = [];
                }
            } else {
                output.push(trimmed);
            }
        }
        
        // Adicionar qualquer buffer restante
        if (buffer.length) {
            output.push(buffer.join(''));
        }
        
        addLog(`Total de blocos <Cli> processados: ${cliCount}`);
        return output.join('\n');
    }
    
    function downloadSample() {
        const sampleContent = `<Cli Cd="00709672" Tp="2" Autorzc="S" PorteCli="2" TpCtrl="01" IniRelactCli="2012-05-11" FatAnual="972723.00">
<Op DetCli="00709672000170" IPOC="0490297902992007096720000010" Contrt="000000000010" Mod="0299" OrigemRec="0199" Indx="11" PercIndx="0.0000000" VarCamb="790" CEP="77880000" TaxEft="2.20" DtContr="2012-11-28" VlrContr="22925.56" NatuOp="01" DtVencOp="2013-11-28" ProvConsttd="0.00" DiaAtraso="4354" CaracEspecial="1;11;19">
<Venc v330="10454.94" />
<Gar Tp="0901" Ident="19161565172" PercGar="100.00" />
<Gar Tp="0901" Ident="46867864287" PercGar="100.00" />
<ContInstFinRes4966 ClasAtFin="1" CartProvMin="C5" EstInstFin="3" VlrContBr="10454.94" TJE="2.20" />
</Op>
</Cli>`;
        
        const blob = new Blob([sampleContent], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exemplo_serio.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('Exemplo XML baixado com sucesso!', 'success');
    }
    
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
    }
    
    function addLog(message, type = 'info', replaceLast = false) {
        if (replaceLast && logContent.lastChild) {
            logContent.removeChild(logContent.lastChild);
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    function clearLog() {
        logContent.innerHTML = '<div class="log-entry">Log limpo</div>';
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});