<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import mermaid from 'mermaid';

    // --- 定義 TypeScript 介面 ---
    interface Subgraph { id: string; title: string; }
    interface Node { id: string; label: string; shape: string; subgraph: string; className: string; inlineStyle: string; }
    interface Edge { id: string; from: string; to: string; text: string; type: string; animated: boolean; }
    interface ClassDef { name: string; def: string; }
    interface DiagramState {
        direction: string;
        subgraphs: Subgraph[];
        nodes: Node[];
        edges: Edge[];
        classes: ClassDef[];
    }

    // 初始化 Mermaid
    mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Font Awesome 6 Free"',
        flowchart: {
            htmlLabels: true,
            curve: 'linear', 
            rankSpacing: 100, 
            nodeSpacing: 80   
        }
    });

    let mode: 'builder' | 'manual' = 'builder'; 
    let manualCode: string = '';
    let toastMsg: string = '';
    let renderError: string = '';
    
    let leftPanelWidth: number = 35;
    let isDragging: boolean = false;
    let zoomPercentage: number = 100;

    let showConfirmModal: boolean = false;
    let showClearConfirmModal: boolean = false;
    let pendingMode: 'builder' | 'manual' | '' = '';

    const zoomIn = () => { zoomPercentage = Math.min(zoomPercentage + 20, 500); };
    const zoomOut = () => { zoomPercentage = Math.max(zoomPercentage - 20, 20); };
    const zoomReset = () => { zoomPercentage = 100; };
    const handleWheelZoom = (e: WheelEvent) => { 
        if (e.ctrlKey) {
            e.preventDefault();
            e.deltaY < 0 ? zoomIn() : zoomOut(); 
        }
    };

    // 原始資料狀態
    let state: DiagramState = {
        direction: 'TB',
        subgraphs: [
            { id: 'sg1', title: '人事室 AI Agent' },
            { id: 'sg2', title: '使用者瀏覽器' },
            { id: 'sg3', title: '人事室後臺管理者瀏覽器' },
            { id: 'sg4', title: '人事室承辦人' }
        ],
        nodes: [
            { id: 'od', label: '考核組差勤法規庫', shape: 'rect', subgraph: 'sg1', className: '', inlineStyle: '' },
            { id: 'od2', label: '資料組法規庫', shape: 'rect', subgraph: 'sg1', className: '', inlineStyle: '' },
            { id: 'od3', label: '任免組差勤法規庫', shape: 'rect', subgraph: 'sg1', className: '', inlineStyle: '' },
            { id: 'ro', label: '法規\n向量\n資料庫', shape: 'cylinder', subgraph: 'sg1', className: '', inlineStyle: '' },
            { id: 'di', label: 'fa:fa-robot AI Agent\n鎖定語言回復原則\nRAG', shape: 'diamond', subgraph: 'sg1', className: 'orange', inlineStyle: '' },
            { id: 'od4', label: 'HTML\nCSS', shape: 'rect', subgraph: 'sg2', className: '', inlineStyle: '' },
            { id: 'od5', label: 'JavaScript\nWebGPU', shape: 'rect', subgraph: 'sg2', className: '', inlineStyle: '' },
            { id: 'od6', label: 'HTML\nCSS', shape: 'rect', subgraph: 'sg3', className: '', inlineStyle: '' },
            { id: 'od7', label: 'JavaScript\nWebGPU', shape: 'rect', subgraph: 'sg3', className: '', inlineStyle: '' },
            { id: 'e', label: '外部開源 WebGPU\nLLM 資料庫\n供使用者下載', shape: 'circle', subgraph: '', className: 'green', inlineStyle: '' },
            { id: 'od8', label: '考核組', shape: 'rect', subgraph: 'sg4', className: '', inlineStyle: '' },
            { id: 'od9', label: '資料組', shape: 'rect', subgraph: 'sg4', className: '', inlineStyle: '' },
            { id: 'od10', label: '任免組', shape: 'rect', subgraph: 'sg4', className: '', inlineStyle: '' }
        ],
        edges: [
            { id: 'e1', from: 'od', to: 'ro', text: 'Embedding', type: '-->', animated: true },
            { id: 'e2', from: 'od2', to: 'ro', text: 'Embedding', type: '-->', animated: true },
            { id: 'e3', from: 'od3', to: 'ro', text: 'Embedding', type: '-->', animated: true },
            { id: 'e4', from: 'di', to: 'ro', text: '建立規則', type: '-->', animated: true },
            { id: 'e_link1', from: 'od4', to: 'od5', text: '', type: '---', animated: false },
            { id: 'e5', from: 'od5', to: 'di', text: '自然語言查詢', type: '-->', animated: true },
            { id: 'e_link2', from: 'od6', to: 'od7', text: '', type: '---', animated: false },
            { id: 'e6', from: 'od7', to: 'di', text: '查詢向量資料庫', type: '-->', animated: true },
            { id: 'e7', from: 'e', to: 'od5', text: '', type: '-->', animated: true },
            { id: 'e_link3', from: 'od8', to: 'od', text: '', type: '-->', animated: false },
            { id: 'e_link4', from: 'od9', to: 'od2', text: '', type: '-->', animated: false },
            { id: 'e_link5', from: 'od10', to: 'od3', text: '', type: '-->', animated: false }
        ],
        classes: [
            { name: 'green', def: 'fill:#9f6,stroke:#333,stroke-width:2px' },
            { name: 'orange', def: 'fill:#f96,stroke:#333,stroke-width:4px' }
        ]
    };

    const addSubgraph = () => { state.subgraphs = [...state.subgraphs, { id: `sg${Date.now()}`, title: '新區塊' }]; };
    const removeSubgraph = (idx: number) => { state.subgraphs.splice(idx, 1); state.subgraphs = state.subgraphs; };
    const addNode = () => { state.nodes = [...state.nodes, { id: `n${Date.now()}`, label: '新節點', shape: 'rect', subgraph: '', className: '', inlineStyle: '' }]; };
    const removeNode = (idx: number) => { state.nodes.splice(idx, 1); state.nodes = state.nodes; };
    const addEdge = () => { state.edges = [...state.edges, { id: `e${Date.now()}`, from: '', to: '', text: '', type: '-->', animated: false }]; };
    const removeEdge = (idx: number) => { state.edges.splice(idx, 1); state.edges = state.edges; };

    const confirmClearAll = () => { showClearConfirmModal = true; };
    const executeClearAll = () => {
        state = { direction: 'TB', subgraphs: [], nodes: [], edges: [], classes: [] };
        manualCode = 'graph TB\n';
        showClearConfirmModal = false;
        showToast('已清空所有內容');
    };

    const importCode = async () => {
        try {
            let fileContent = '';
            // @ts-ignore: File System Access API
            if (window.showOpenFilePicker) {
                // @ts-ignore
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{ description: 'Mermaid 或 Markdown 檔案', accept: { 'text/plain': ['.txt', '.md', '.mermaid'] } }]
                });
                const file = await fileHandle.getFile();
                fileContent = await file.text();
            } else {
                fileContent = await new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.md,.txt,.mermaid';
                    input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (!file) { resolve(''); return; }
                        const reader = new FileReader();
                        reader.onload = (evt) => resolve(evt.target?.result as string);
                        reader.readAsText(file);
                    };
                    input.click();
                });
            }

            if (!fileContent) return;

            let extractedCode = fileContent;
            const mdMatch = fileContent.match(/```mermaid\s*\n([\s\S]*?)```/);
            if (mdMatch) { extractedCode = mdMatch[1]; }

            manualCode = extractedCode;
            
            try {
                state = parseMermaidToState(extractedCode);
                showToast('匯入成功！已還原至表單');
            } catch (e) {
                console.error("解析失敗:", e);
                showToast('檔案內容已載入，但部分語法無法轉回表單');
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('匯入失敗:', err);
                alert('匯入失敗或瀏覽器不支援此功能');
            }
        }
    };

    const parseMermaidToState = (code: string): DiagramState => {
        let lines = code.split('\n').map(l => l.trim()).filter(l => l);
        let newState: DiagramState = { direction: 'TB', subgraphs: [], nodes: [], edges: [], classes: [] };
        let currentSubgraph = '';
        let animatedEdges = new Set<string>();
        let edgeCounter = 0;

        const getOrCreateNode = (id: string) => {
            let n = newState.nodes.find(n => n.id === id);
            if (!n) {
                n = { id, label: id, shape: 'rect', subgraph: currentSubgraph, className: '', inlineStyle: '' };
                newState.nodes.push(n);
            }
            return n;
        };

        for (let line of lines) {
            const dirMatch = line.match(/^(?:graph|flowchart)\s+(TB|TD|BT|LR|RL)/);
            if (dirMatch) { newState.direction = dirMatch[1] === 'TD' ? 'TB' : dirMatch[1]; continue; }

            if (line === 'end') { currentSubgraph = ''; continue; }

            const sgMatch = line.match(/^subgraph\s+([^\s\[]+)(?:\s+\[(.*?)\])?/);
            if (sgMatch) {
                const sgId = sgMatch[1];
                const sgTitle = sgMatch[2] || sgId;
                newState.subgraphs.push({ id: sgId, title: sgTitle });
                currentSubgraph = sgId;
                continue;
            }

            const classDefMatch = line.match(/^classDef\s+([a-zA-Z0-9_-]+)\s+(.+)/);
            if (classDefMatch) {
                newState.classes.push({ name: classDefMatch[1], def: classDefMatch[2].replace(/;$/, '') });
                continue;
            }

            const classMatch = line.match(/^class\s+([a-zA-Z0-9_,-]+)\s+([a-zA-Z0-9_-]+)/);
            if (classMatch) {
                const ids = classMatch[1].split(',');
                ids.forEach(id => { getOrCreateNode(id.trim()).className = classMatch[2]; });
                continue;
            }

            const styleMatch = line.match(/^style\s+([a-zA-Z0-9_-]+)\s+(.+)/);
            if (styleMatch) {
                getOrCreateNode(styleMatch[1]).inlineStyle = styleMatch[2];
                continue;
            }

            const animMatch = line.match(/^([a-zA-Z0-9_-]+)@\{\s*animate:\s*true\s*\}/);
            if (animMatch) {
                animatedEdges.add(animMatch[1]);
                continue;
            }

            let cleanLine = line;
            
            const nodeRegex = /([a-zA-Z0-9_-]+)\s*(\[\[|\[\(|\[\/|\[\\|\(\(\(|\(\(|\[|\(|\{\{|\{)\s*"?([\s\S]*?)"?\s*(\]\]|\)\]|\\\]|\/\]|\}\)\)|\)\)|\)|\]|\}\}|\})/g;
            let nodeMatch;
            while ((nodeMatch = nodeRegex.exec(line)) !== null) {
                let id = nodeMatch[1], open = nodeMatch[2], label = nodeMatch[3], close = nodeMatch[4];
                let shape = 'rect';
                if (open === '(((') shape = 'double_circle_bracket';
                else if (open === '((') shape = 'circle';
                else if (open === '[(') shape = 'cylinder';
                else if (open === '([') shape = 'stadium_bracket';
                else if (open === '{{') shape = 'hexagon';
                else if (open === '{') shape = 'diamond';
                else if (open === '(') shape = 'rounded';
                else if (open === '[/') shape = (close === '\\]' || close === ']') ? 'trapezoid' : 'parallelogram';
                else if (open === '\\[') shape = (close === '\\]' || close === ']') ? 'parallelogram_alt' : 'trapezoid_alt';
                
                let n = getOrCreateNode(id);
                n.shape = shape;
                n.label = label.replace(/<br\s*\/?>/g, '\n').replace(/&quot;/g, '"');
                if (currentSubgraph && !n.subgraph) n.subgraph = currentSubgraph;
                
                cleanLine = cleanLine.replace(nodeMatch[0], id);
            }

            const v11NodeRegex = /([a-zA-Z0-9_-]+)@\{\s*shape:\s*([a-zA-Z0-9_-]+)\s*,\s*label:\s*"(.*?)"\s*\}/g;
            let v11Match;
            while ((v11Match = v11NodeRegex.exec(line)) !== null) {
                let n = getOrCreateNode(v11Match[1]);
                n.shape = v11Match[2];
                n.label = v11Match[3].replace(/\\n/g, '\n').replace(/&quot;/g, '"');
                if (currentSubgraph && !n.subgraph) n.subgraph = currentSubgraph;
                cleanLine = cleanLine.replace(v11Match[0], v11Match[1]);
            }

            const edgeRegex = /([a-zA-Z0-9_-]+)\s*(?:([a-zA-Z0-9_-]+)@)?(--(.*?)-->|==(.*?)==>|-\.(.*?)\.->|---|-->|==>|-.->|<-->|o--o|x--x|--o|--x)\s*(?:\|(.*?)\|)?\s*([a-zA-Z0-9_-]+)/;
            const edgeMatch = cleanLine.match(edgeRegex);
            if (edgeMatch) {
                const from = edgeMatch[1];
                const edgeId = edgeMatch[2] || `e_auto_${Date.now()}_${edgeCounter++}`;
                let type = edgeMatch[3];
                let text = edgeMatch[4] || edgeMatch[5] || edgeMatch[6] || edgeMatch[7] || '';
                
                if (text.startsWith('"') && text.endsWith('"')) text = text.substring(1, text.length - 1);
                text = text.replace(/&quot;/g, '"');

                if (type.startsWith('--') && type.endsWith('-->') && type !== '-->') type = '-->';
                else if (type.startsWith('==') && type.endsWith('==>') && type !== '==>') type = '==>';
                else if (type.startsWith('-.') && type.endsWith('.->') && type !== '-.->') type = '-.->';

                newState.edges.push({ id: edgeId, from, to: edgeMatch[8], text, type, animated: false });
                getOrCreateNode(from);
                getOrCreateNode(edgeMatch[8]);
            }
        }

        newState.edges.forEach(e => {
            if (animatedEdges.has(e.id)) e.animated = true;
        });

        return newState;
    };

    $: generatedCode = (() => {
        let code = `graph ${state.direction}\n`;
        const getShapeStr = (n: Node) => {
            let label = n.label.replace(/"/g, '&quot;');
            const v11Shapes = ['docs', 'manual-file', 'manual-input', 'procs', 'paper-tape', 'stadium', 'dbl-circ', 'notch-rect', 'delay', 'das', 'lin-cyl', 'curv-trap', 'tri', 'f-circ', 'lin-doc', 'sl-rect', 'processes', 'bow-rect', 'cross-circ', 'tag-doc'];
            
            if (v11Shapes.includes(n.shape)) {
                let v11Label = label.replace(/\n/g, '\\n');
                return `${n.id}@{ shape: ${n.shape}, label: "${v11Label}" }`;
            }
            
            let classicLabel = label.replace(/\n/g, '<br/>');
            let qL = `"${classicLabel}"`;
            
            switch(n.shape) {
                case 'rect': return `${n.id}[${qL}]`;
                case 'rounded': return `${n.id}(${qL})`;
                case 'cylinder': return `${n.id}[(${qL})]`;
                case 'diamond': return `${n.id}{${qL}}`;
                case 'circle': return `${n.id}((${qL}))`;
                case 'stadium_bracket': return `${n.id}([${qL}])`;
                case 'double_circle_bracket': return `${n.id}((({${qL})))`;
                case 'hexagon': return `${n.id}{{${qL}}}`;
                case 'parallelogram': return `${n.id}[/${qL}/]`;
                case 'parallelogram_alt': return `${n.id}[\\${qL}\\]`;
                case 'trapezoid': return `${n.id}[/${qL}\\]`;
                case 'trapezoid_alt': return `${n.id}[\\${qL}/]`;
                default: return `${n.id}[${qL}]`;
            }
        };

        state.subgraphs.forEach(sg => {
            if (sg.id && sg.id.trim() !== '' && sg.id !== sg.title) code += `    subgraph ${sg.id} [${sg.title}]\n`;
            else code += `    subgraph ${sg.title}\n`;
            
            state.nodes.filter(n => n.subgraph === sg.id || n.subgraph === sg.title).forEach(n => {
                code += `        ${getShapeStr(n)}\n`;
            });
            code += `    end\n\n`;
        });

        state.nodes.filter(n => !n.subgraph).forEach(n => { code += `    ${getShapeStr(n)}\n`; });
        code += '\n';

        state.edges.forEach((e, idx) => {
            let edgeType = e.type || '-->';
            let cleanText = (e.text || '').replace(/[|]/g, ' ').trim();
            let safeText = cleanText ? `|${cleanText}|` : '';
            
            if (e.animated) {
                let edgeId = (e.id || `e_anim_${idx}`).replace(/[^a-zA-Z0-9_]/g, '');
                code += `    ${e.from} ${edgeId}@${edgeType}${safeText} ${e.to}\n`;
                code += `    ${edgeId}@{ animate: true }\n`;
            } else {
                code += `    ${e.from} ${edgeType}${safeText} ${e.to}\n`;
            }
        });
        code += '\n';

        if (state.classes.length > 0) {
            state.classes.forEach(c => { if (c.name && c.def) code += `    classDef ${c.name} ${c.def}\n`; });
        }
        state.nodes.forEach(n => {
            if (n.className) code += `    class ${n.id} ${n.className}\n`;
            if (n.inlineStyle && n.inlineStyle.trim() !== '') code += `    style ${n.id} ${n.inlineStyle}\n`;
        });

        return code;
    })();

    $: currentCode = mode === 'builder' ? generatedCode : manualCode;

    const switchMode = (targetMode: 'builder' | 'manual') => {
        if (targetMode === mode) return;
        
        if (mode === 'manual' && targetMode === 'builder') {
            if (manualCode !== generatedCode) {
                pendingMode = targetMode;
                showConfirmModal = true;
                return;
            }
        } else if (targetMode === 'manual') {
            manualCode = generatedCode;
        }
        mode = targetMode;
    };

    const confirmSwitchMode = () => {
        try {
            state = parseMermaidToState(manualCode);
            showToast('已成功根據程式碼更新表單內容！');
        } catch (e) {
            console.error("解析失敗:", e);
            showToast('解析程式碼時發生部分錯誤，但已盡力還原。');
        }
        mode = pendingMode as 'builder' | 'manual';
        showConfirmModal = false;
    };

    let renderTimeout: number;
    $: {
        const codeToRender = currentCode;
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => { renderDiagram(codeToRender); }, 500) as unknown as number;
    }

    const renderDiagram = async (code: string) => {
        if (!code.trim()) return;
        const container = document.getElementById('mermaid-container');
        if (!container) return; 

        renderError = '';
        const id = `mermaid-svg-${Date.now()}`;
        try {
            container.innerHTML = ''; 
            const { svg } = await mermaid.render(id, code);
            container.innerHTML = svg;
        } catch (e: any) {
            console.error('Mermaid render error:', e);
            renderError = e.message || '語法解析失敗';
        }
    };

    onMount(() => {
        Promise.all([tick(), document.fonts.ready]).then(() => {
            setTimeout(() => {
                if (currentCode) renderDiagram(currentCode);
            }, 200);
        });
    });

    const copyCode = () => {
        navigator.clipboard.writeText(currentCode).then(() => {
            showToast('已複製 Mermaid 語法！');
        });
    };

    const showToast = (msg: string) => {
        toastMsg = msg;
        setTimeout(() => { toastMsg = ''; }, 3000);
    };

    const startDrag = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    };

    const onDrag = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault(); 
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        let newWidth = (clientX / window.innerWidth) * 100;
        if (newWidth < 20) newWidth = 20; 
        if (newWidth > 70) newWidth = 70; 
        leftPanelWidth = newWidth;
    };

    const stopDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', stopDrag);
    };

    const downloadDiagram = async (format: 'md' | 'svg' | 'png') => {
        try {
            let blob: Blob;
            let mimeType: string;
            let extension: string;
            let desc: string;

            if (format === 'md') {
                const mdContent = `\`\`\`mermaid\n${currentCode}\n\`\`\``;
                blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
                mimeType = 'text/markdown';
                extension = '.md';
                desc = 'Markdown 檔案';
            } else {
                const svgEl = document.querySelector('#mermaid-container svg') as SVGSVGElement;
                if (!svgEl) { showToast('圖表尚未渲染完成！'); return; }
                
                if (format === 'svg') {
                    const svgData = new XMLSerializer().serializeToString(svgEl);
                    blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    mimeType = 'image/svg+xml';
                    extension = '.svg';
                    desc = 'SVG 向量圖';
                } else {
                    blob = await convertSvgToPng(svgEl);
                    mimeType = 'image/png';
                    extension = '.png';
                    desc = 'PNG 圖片';
                }
            }

            // @ts-ignore
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: `系統架構圖${extension}`,
                    types: [{ description: desc, accept: { [mimeType]: [extension] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                showToast(`已成功儲存檔案！`);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `系統架構圖${extension}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`檔案已下載`);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('儲存失敗:', err);
                alert('儲存失敗或瀏覽器不支援此功能');
            }
        }
    };

    const convertSvgToPng = (svgEl: SVGSVGElement): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas ctx null')); return; }
            
            const rect = svgEl.getBoundingClientRect();
            const scale = 2; 
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            
            ctx.fillStyle = '#ffffff'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);

            const svgData = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
                URL.revokeObjectURL(url);
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Blob conversion failed'));
                }, 'image/png');
            };
            img.onerror = reject;
            img.src = url;
        });
    };
</script>

<svelte:head>
    <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)">
</svelte:head>

<!-- 註：Svelte body 的 class 綁定 -->
<svelte:body class:dragging={isDragging} />

<!-- 強制預載 FontAwesome -->
<i class="fa-solid fa-robot absolute opacity-0 pointer-events-none" aria-hidden="true"></i>

<div id="app" class="bg-slate-100 h-screen flex flex-col font-sans text-slate-800 overflow-hidden">
    <!-- 頂部導覽列 -->
    <header class="bg-white shadow-sm border-b border-slate-200 py-3 px-4 md:px-6 flex justify-between items-center z-10 shrink-0">
        <div class="flex items-center gap-3">
            <i class="fa-solid fa-diagram-project text-blue-600 text-xl md:text-2xl"></i>
            <div>
                <h1 class="text-lg md:text-xl font-bold text-slate-800">臺北榮總人事室 系統架構圖編輯器</h1>
                <p class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">by Leno Tsai</p>
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <button on:click={importCode} class="px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center">
                <i class="fa-solid fa-file-import mr-1 md:mr-2"></i><span class="hidden md:inline">匯入</span>
            </button>
            <button on:click={confirmClearAll} class="px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-slate-300 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all shadow-sm flex items-center">
                <i class="fa-solid fa-trash-can mr-1 md:mr-2"></i><span class="hidden md:inline">全部清除</span>
            </button>
            
            <div class="w-px h-6 bg-slate-300 mx-1 hidden sm:block"></div>
            
            <button on:click={() => switchMode('builder')} class="{mode === 'builder' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} px-3 md:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center">
                <i class="fa-solid fa-sliders mr-2"></i><span class="hidden md:inline">表單建構模式</span><span class="md:hidden">表單</span>
            </button>
            <button on:click={() => switchMode('manual')} class="{mode === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} px-3 md:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center">
                <i class="fa-solid fa-code mr-2"></i><span class="hidden md:inline">手動編輯原始碼</span><span class="md:hidden">手動</span>
            </button>
        </div>
    </header>

    <!-- 主要內容區 -->
    <main class="flex-1 flex overflow-hidden">
        
        <!-- 左側面板 -->
        <aside style="width: {leftPanelWidth}%" class="bg-white flex flex-col h-full shrink-0 z-0 relative shadow-[2px_0_10px_rgba(0,0,0,0.02)] min-w-[300px]">
            
            <!-- 表單建構器 -->
            <div style="display: {mode === 'builder' ? 'flex' : 'none'};" class="flex-col h-full overflow-hidden">
                <div class="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex justify-between items-center shrink-0">
                    <span>架構元素設定</span>
                    <select bind:value={state.direction} class="text-sm border border-slate-300 rounded-md px-3 py-2 bg-white min-w-[120px]">
                        <option value="TB">由上而下</option>
                        <option value="BT">由下而上</option>
                        <option value="LR">由左至右</option>
                        <option value="RL">由右至左</option>
                    </select>
                </div>
                
                <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <!-- 子圖 (Subgraphs) -->
                    <section>
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-object-group text-slate-400"></i> 子區塊</h3>
                            <button on:click={addSubgraph} class="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"><i class="fa-solid fa-plus"></i> 新增</button>
                        </div>
                        <div class="space-y-3">
                            {#each state.subgraphs as sg, index (sg.id)}
                                <div class="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <input bind:value={sg.title} placeholder="子區塊名稱 (如: 人事室)" class="flex-1 text-sm border border-slate-300 rounded-md px-3 py-2">
                                    <button on:click={() => removeSubgraph(index)} class="text-red-400 hover:text-red-600 p-2" title="刪除子區塊"><i class="fa-solid fa-trash text-lg"></i></button>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- 節點 (Nodes) -->
                    <section>
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-server text-slate-400"></i> 節點與元件</h3>
                            <button on:click={addNode} class="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"><i class="fa-solid fa-plus"></i> 新增</button>
                        </div>
                        <div class="space-y-4">
                            {#each state.nodes as node, index (node.id)}
                                <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                                    <button on:click={() => removeNode(index)} class="absolute top-3 right-3 text-slate-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm border border-slate-100"><i class="fa-solid fa-xmark"></i></button>
                                    <div class="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label class="text-xs text-slate-500 mb-1 block">節點 ID</label>
                                            <input bind:value={node.id} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2">
                                        </div>
                                        <div>
                                            <label class="text-xs text-slate-500 mb-1 block">歸屬區塊</label>
                                            <select bind:value={node.subgraph} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white">
                                                <option value="">(無)</option>
                                                {#each state.subgraphs as sg}
                                                    <option value={sg.id || sg.title}>{sg.title}</option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="text-xs text-slate-500 mb-1 block">標籤文字 (支援直接 Enter 換行)</label>
                                        <textarea bind:value={node.label} rows="2" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 resize-y"></textarea>
                                    </div>
                                    <div>
                                        <label class="text-xs text-slate-500 mb-1 block">形狀</label>
                                        <select bind:value={node.shape} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white">
                                            <option value="rect">矩形 (Rect)</option>
                                            <option value="rounded">圓角矩形 (Rounded)</option>
                                            <option value="cylinder">圓柱/資料庫 (Cylinder)</option>
                                            <option value="diamond">菱形/判斷 (Diamond)</option>
                                            <option value="circle">圓形 (Circle)</option>
                                            <option value="stadium_bracket">體育場/藥丸 (Stadium)</option>
                                            <option value="double_circle_bracket">雙圓/停止 ((( )))</option>
                                            <option value="hexagon">六角形 (Hexagon)</option>
                                            <option value="parallelogram">平行四邊形 (Parallelogram)</option>
                                            <option value="parallelogram_alt">反平行四邊形 (Parallelogram Alt)</option>
                                            <option value="trapezoid">梯形 (Trapezoid)</option>
                                            <option value="trapezoid_alt">反梯形 (Trapezoid Alt)</option>
                                            <option value="docs">多重文件 (Docs)</option>
                                        </select>
                                    </div>
                                    <div class="mt-3 pt-3 border-t border-slate-200">
                                        <label class="text-xs text-slate-500 mb-1 block">套用樣式</label>
                                        <select bind:value={node.className} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white">
                                            <option value="">(無)</option>
                                            {#each state.classes as c}
                                                <option value={c.name}>{c.name}</option>
                                            {/each}
                                        </select>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- 連線 (Edges) -->
                    <section>
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-arrow-right-arrow-left text-slate-400"></i> 連線與資料流</h3>
                            <button on:click={addEdge} class="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"><i class="fa-solid fa-plus"></i> 新增</button>
                        </div>
                        <div class="space-y-4">
                            {#each state.edges as edge, index (edge.id)}
                                <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                                    <button on:click={() => removeEdge(index)} class="absolute top-3 right-3 text-slate-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm border border-slate-100"><i class="fa-solid fa-xmark"></i></button>
                                    <div class="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label class="text-xs text-slate-500 mb-1 block">起點</label>
                                            <select bind:value={edge.from} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white">
                                                {#each state.nodes as n}
                                                    <option value={n.id}>{n.id}</option>
                                                {/each}
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-xs text-slate-500 mb-1 block">終點</label>
                                            <select bind:value={edge.to} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white">
                                                {#each state.nodes as n}
                                                    <option value={n.id}>{n.id}</option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="text-xs text-slate-500 mb-1 block">說明文字</label>
                                        <input bind:value={edge.text} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2">
                                    </div>
                                    <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
                                        <div class="flex-1 w-full">
                                            <label class="text-xs text-slate-500 mb-1 block">樣式</label>
                                            <select bind:value={edge.type} class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white">
                                                <option value="-->">實線箭頭 (-->)</option>
                                                <option value="==>">粗實線箭頭 (==>)</option>
                                                <option value="-.->">虛線箭頭 (-.->)</option>
                                                <option value="---">無箭頭實線 (---)</option>
                                            </select>
                                        </div>
                                        <div class="flex items-center gap-2 mt-2 md:mt-5">
                                            <input type="checkbox" id="anim-{index}" bind:checked={edge.animated} class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                                            <label for="anim-{index}" class="text-sm text-slate-700 cursor-pointer font-medium">啟用動畫</label>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </section>
                    <div class="h-10"></div>
                </div>
            </div>

            <!-- 手動編輯器 -->
            <div style="display: {mode === 'manual' ? 'flex' : 'none'};" class="flex-col h-full bg-slate-900">
                <div class="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center shrink-0">
                    <span class="font-bold text-slate-200"><i class="fa-solid fa-file-code text-blue-400 mr-2"></i>Mermaid 原始碼</span>
                    <button on:click={copyCode} class="text-xs bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 px-3 py-2 rounded-md transition-colors flex items-center gap-1 shadow-sm">
                        <i class="fa-solid fa-copy"></i> 複製
                    </button>
                </div>
                <div class="flex-1 relative p-4">
                    <textarea bind:value={manualCode} class="w-full h-full bg-slate-900 text-blue-300 font-mono text-sm md:text-base focus:outline-none resize-none overflow-y-auto leading-relaxed" placeholder="在此直接輸入 Mermaid 語法..."></textarea>
                </div>
            </div>

        </aside>

        <!-- 分隔拖曳桿 -->
        <div on:mousedown={startDrag} on:touchstart|preventDefault={startDrag} class="w-3 md:w-2 bg-slate-200 hover:bg-blue-400 cursor-col-resize shrink-0 transition-colors z-20 flex items-center justify-center group touch-none border-x border-slate-300" role="separator" tabindex="0">
            <div class="h-12 w-1 bg-slate-400 rounded-full group-hover:bg-white transition-colors"></div>
        </div>

        <!-- 右側面板：預覽區 -->
        <section class="flex-1 flex flex-col min-w-0 relative bg-white">
            <!-- 工具列 -->
            <div class="bg-white border-b border-slate-200 px-4 py-3 flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 gap-3 z-10">
                <div class="flex items-center gap-3">
                    <span class="font-bold text-slate-700"><i class="fa-solid fa-eye text-blue-500 mr-2"></i>即時預覽</span>
                    {#if renderError}
                        <span class="text-xs text-red-500 font-mono bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                            <i class="fa-solid fa-triangle-exclamation"></i> 解析錯誤
                        </span>
                    {:else}
                        <span class="text-xs text-green-600 font-mono bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                            <i class="fa-solid fa-check"></i> 成功
                        </span>
                    {/if}
                </div>
                <div class="flex flex-wrap gap-2">
                    <button on:click={() => downloadDiagram('md')} class="text-sm bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 px-3 md:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm">
                        <i class="fa-brands fa-markdown text-lg"></i> <span class="hidden xl:inline">匯出原始碼</span><span class="xl:hidden">MD</span>
                    </button>
                    <button on:click={() => downloadDiagram('svg')} class="text-sm bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 px-3 md:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm">
                        <i class="fa-solid fa-file-code"></i> <span class="hidden xl:inline">匯出 SVG</span><span class="xl:hidden">SVG</span>
                    </button>
                    <button on:click={() => downloadDiagram('png')} class="text-sm bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 px-3 md:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm">
                        <i class="fa-solid fa-image"></i> <span class="hidden xl:inline">匯出 PNG</span><span class="xl:hidden">PNG</span>
                    </button>
                </div>
            </div>
            
            <!-- 畫布與縮放區 -->
            <div class="relative flex-1 flex flex-col overflow-hidden">
                <div class="absolute bottom-6 right-6 flex bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-30 opacity-90 hover:opacity-100 transition-opacity">
                    <button on:click={zoomOut} class="px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-blue-600 border-r border-slate-200 transition-colors" title="縮小 (或 Ctrl+向下滾輪)"><i class="fa-solid fa-minus"></i></button>
                    <button on:click={zoomReset} class="px-4 py-3 text-slate-700 hover:bg-slate-100 font-mono text-sm font-bold min-w-[75px] border-r border-slate-200 transition-colors" title="重設為左右填滿">{zoomPercentage}%</button>
                    <button on:click={zoomIn} class="px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="放大 (或 Ctrl+向上滾輪)"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="flex-1 overflow-auto relative" style="background-color: #f8fafc; background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 20px 20px;" on:wheel={handleWheelZoom}>
                    <div class="p-6 md:p-10 min-w-full min-h-full flex items-start justify-center">
                        <div style="width: {zoomPercentage}%" class="transition-all duration-200 ease-out flex justify-center">
                            <div id="mermaid-container" class="bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 w-full flex justify-center relative z-10"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        
    </main>

    <!-- 切換模式防呆警告 (Modal) -->
    {#if showConfirmModal}
        <div class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 border border-slate-200">
                <h3 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                    <div class="bg-amber-100 p-2 rounded-full"><i class="fa-solid fa-triangle-exclamation text-amber-500 text-xl"></i></div>
                    警告：即將遺失手動修改
                </h3>
                <p class="text-slate-600 text-base mb-8 leading-relaxed">
                    表單建構器無法完全將您手動修改的語法反向寫回表單。<br><br>若切換回「表單建構模式」，您剛才手動編輯的部分內容可能會遺失。確定要繼續嗎？
                </p>
                <div class="flex flex-col sm:flex-row justify-end gap-3">
                    <button on:click={() => showConfirmModal = false} class="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto text-center">
                        取消，保留修改
                    </button>
                    <button on:click={confirmSwitchMode} class="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto text-center">
                        確定並嘗試解析
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- 全部清除確認警告 (Modal) -->
    {#if showClearConfirmModal}
        <div class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 border border-slate-200">
                <h3 class="text-xl font-bold text-red-600 mb-4 flex items-center gap-3">
                    <div class="bg-red-100 p-2 rounded-full"><i class="fa-solid fa-trash-can text-red-500 text-xl"></i></div>
                    確認清除全部內容？
                </h3>
                <p class="text-slate-600 text-base mb-8 leading-relaxed">
                    這個操作將會清空所有的區塊、節點與連線資料，且無法復原。<br><br>確定要全部清除嗎？
                </p>
                <div class="flex flex-col sm:flex-row justify-end gap-3">
                    <button on:click={() => showClearConfirmModal = false} class="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto text-center">
                        取消
                    </button>
                    <button on:click={executeClearAll} class="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto text-center">
                        確定清除
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- 自訂提示訊息 (Toast) -->
    {#if toastMsg}
        <div transition:fade class="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 font-medium">
            <i class="fa-solid fa-circle-check text-green-400 text-lg"></i>
            {toastMsg}
        </div>
    {/if}
</div>

<style>
    /* 在 Svelte 中，全域套用於非直接掌控的 DOM 元素（例如 SVG）需加上 :global() */
    :global(::-webkit-scrollbar) { width: 8px; height: 8px; }
    :global(::-webkit-scrollbar-track) { background: #f1f5f9; }
    :global(::-webkit-scrollbar-thumb) { background: #cbd5e1; border-radius: 4px; }
    :global(::-webkit-scrollbar-thumb:hover) { background: #94a3b8; }
    
    :global(#mermaid-container svg) { 
        width: 100% !important; 
        height: auto !important; 
        max-width: none !important; 
    }
    
    :global(body.dragging) { user-select: none; }
</style>
