import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const clearBtn = document.getElementById('clearBtn');
const resizer = document.getElementById('resizer');
const editorPane = document.getElementById('editor-pane');
const mainContainer = document.getElementById('main-container');
const saveStatus = document.getElementById('save-status');
const STORAGE_KEY = 'vghtpe_mermaid_editor_content';

// --- 通知系統功能 ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up flex items-center gap-2 pointer-events-auto bg-white dark:bg-slate-800 border-l-4 ${
        type === 'success' ? 'border-emerald-500 text-slate-700 dark:text-slate-100' : 'border-amber-500 text-slate-700 dark:text-slate-100'
    }`;
    
    const icon = type === 'success'
        ? '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        : '<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- 主題切換 ---
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
let isDarkMode = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

function updateTheme(initial = false) {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
    
    mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit'
    });

    if (!initial) renderContent();
}

themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateTheme();
});

// --- 比例調整 (支援滑鼠與觸控) ---
let isResizing = false;

const startResize = (e) => {
    isResizing = true;
    document.body.classList.add('cursor-col-resize');
};

const doResize = (e) => {
    if (!isResizing) return;
    const containerRect = mainContainer.getBoundingClientRect();
    // 自動判斷是滑鼠事件還是觸控事件
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    let newWidthPercent = ((clientX - containerRect.left) / containerRect.width) * 100;
    // 限制拖曳範圍在 15% ~ 85% 之間
    if (newWidthPercent > 15 && newWidthPercent < 85) {
        editorPane.style.width = `${newWidthPercent}%`;
    }
};

const stopResize = () => {
    isResizing = false;
    document.body.classList.remove('cursor-col-resize');
};

// 綁定滑鼠事件
resizer.addEventListener('mousedown', startResize);
document.addEventListener('mousemove', doResize);
document.addEventListener('mouseup', stopResize);

// 綁定觸控事件
resizer.addEventListener('touchstart', startResize, { passive: true });
document.addEventListener('touchmove', doResize, { passive: true });
document.addEventListener('touchend', stopResize);

// --- 隱藏與開啟編輯區邏輯 ---
const editorToggleBtn = document.getElementById('editorToggleBtn');
const sidebarOpenIcon = document.getElementById('sidebarOpenIcon');
const sidebarClosedIcon = document.getElementById('sidebarClosedIcon');
let isEditorVisible = true;

editorToggleBtn.addEventListener('click', () => {
    isEditorVisible = !isEditorVisible;
    if (isEditorVisible) {
        editorPane.style.display = ''; // 恢復原有的版面配置
        resizer.style.display = ''; // 恢復原有的拖曳條
        sidebarOpenIcon.classList.remove('hidden');
        sidebarClosedIcon.classList.add('hidden');
    } else {
        editorPane.style.display = 'none'; // 隱藏編輯區
        resizer.style.display = 'none'; // 隱藏拖曳條
        sidebarOpenIcon.classList.add('hidden');
        sidebarClosedIcon.classList.remove('hidden');
    }
});


// --- 非同步載入外部預設內容 ---
async function loadDefaultContent() {
    try {
        const response = await fetch('sample.md');
        if (!response.ok) throw new Error('無法讀取 sample.md');
        return await response.text();
    } catch (err) {
        console.error('載入預設內容失敗:', err);
        return '# 載入失敗\n請確認您的伺服器環境中是否存在 `sample.md` 檔案，或檢查 CORS 設定。';
    }
}

// --- 檔案匯入邏輯 ---
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

importBtn.addEventListener('click', () => importInput.click());

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        editor.value = event.target.result;
        renderContent();
        localStorage.setItem(STORAGE_KEY, editor.value);
        showToast(`已匯入檔案：${file.name}`);
        // 清除 input 值以利重複匯入同檔名檔案
        importInput.value = '';
    };
    reader.readAsText(file);
});

// --- 檔案匯出邏輯 (TXT/MD) ---
async function handleFileExport(extension) {
    const content = editor.value;
    const mimeType = extension === 'md' ? 'text/markdown' : 'text/plain';
    const suggestedName = `vghtpe-document.${extension}`;
    
    // 首選方案：嘗試使用原生 File System Access API (可選擇資料夾)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: extension === 'md' ? 'Markdown 檔案' : '文字檔案',
                    accept: { [mimeType]: [`.${extension}`] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            showToast(`已成功儲存為 ${handle.name}`);
            return; // 成功儲存，退出函數
        } catch (err) {
            if (err.name === 'AbortError') return; // 使用者主動取消
            console.warn('原生儲存 API 無法使用，切換為備用下載模式', err);
        }
    }
    
    // 備用方案：彈窗輸入檔名並使用 Blob 下載 (系統預設下載路徑)
    const modal = document.getElementById('filename-modal');
    const input = document.getElementById('filename-input');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const extLabel = document.getElementById('filename-ext');
    
    title.innerText = "匯出文件";
    desc.innerText = "目前環境限制直接選擇資料夾，請輸入檔名進行快速下載：";
    extLabel.innerText = `.${extension}`;
    input.value = `vghtpe-document`;
    modal.classList.remove('hidden');
    input.focus();
    
    return new Promise((resolve) => {
        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            const filename = input.value || 'document';
            const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            cleanup();
            showToast(`已匯出為 ${filename}.${extension}`);
            resolve();
        };

        cancelBtn.onclick = () => { cleanup(); resolve(); };
    });
}

document.getElementById('export-md-btn').onclick = () => handleFileExport('md');
document.getElementById('export-txt-btn').onclick = () => handleFileExport('txt');

// --- 圖表 SVG 儲存邏輯 ---
async function handleSvgDownload(svg, index) {
    const svgData = new XMLSerializer().serializeToString(svg);
    const content = '<?xml version="1.0" standalone="no"?>\r\n' + svgData;
    const suggestedName = `vghtpe-chart-${index + 1}.svg`;

    // 首選方案：嘗試使用原生 File System Access API (可選擇資料夾)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: 'SVG 圖片',
                    accept: { 'image/svg+xml': ['.svg'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            showToast(`圖表已成功儲存為 ${handle.name}`);
            return; // 成功儲存，退出函數
        } catch (err) {
            if (err.name === 'AbortError') return; // 使用者主動取消
            console.warn('原生儲存 API 無法使用，切換為備用下載模式', err);
        }
    }

    // 備用方案：彈窗輸入檔名並使用 Blob 下載 (系統預設下載路徑)
    const modal = document.getElementById('filename-modal');
    const input = document.getElementById('filename-input');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const extLabel = document.getElementById('filename-ext');
    
    title.innerText = "儲存圖表 (SVG)";
    desc.innerText = "目前環境限制直接選擇資料夾，請輸入檔名進行快速下載：";
    extLabel.innerText = ".svg";
    input.value = `vghtpe-chart-${index + 1}`;
    modal.classList.remove('hidden');
    input.focus();
    
    return new Promise((resolve) => {
        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            const filename = input.value || 'chart';
            const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.svg`;
            a.click();
            URL.revokeObjectURL(url);
            cleanup();
            showToast(`已成功下載：${filename}.svg`);
            resolve();
        };

        cancelBtn.onclick = () => { cleanup(); resolve(); };
    });
}

// --- 圖表 PNG 儲存邏輯 ---
async function handlePngDownload(svg, index) {
    // 拷貝一份 SVG 以便調整屬性而不會影響畫面上原有的顯示
    const clonedSvg = svg.cloneNode(true);
    const bbox = svg.getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;

    // 顯式設定寬高以利於繪製到 Canvas
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    
    // 確保含有 xmlns
    if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        // 將畫布放大兩倍以產生較高畫質的圖片
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');

        // 依據當前深淺色模式填充背景色，避免透明背景造成文字難以閱讀
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
            const suggestedName = `vghtpe-chart-${index + 1}.png`;

            // 首選方案：嘗試使用原生 File System Access API
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: suggestedName,
                        types: [{
                            description: 'PNG 圖片',
                            accept: { 'image/png': ['.png'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    showToast(`圖表已成功儲存為 ${handle.name}`);
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                }
            }

            // 備用方案：彈窗輸入檔名並使用 Blob 下載
            const modal = document.getElementById('filename-modal');
            const input = document.getElementById('filename-input');
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');
            const title = document.getElementById('modal-title');
            const desc = document.getElementById('modal-desc');
            const extLabel = document.getElementById('filename-ext');
            
            title.innerText = "儲存圖表 (PNG)";
            desc.innerText = "目前環境限制直接選擇資料夾，請輸入檔名進行快速下載：";
            extLabel.innerText = ".png";
            input.value = `vghtpe-chart-${index + 1}`;
            modal.classList.remove('hidden');
            input.focus();
            
            const cleanup = () => {
                modal.classList.add('hidden');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            confirmBtn.onclick = () => {
                const filename = input.value || 'chart';
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.png`;
                a.click();
                URL.revokeObjectURL(url);
                cleanup();
                showToast(`已成功下載：${filename}.png`);
            };

            cancelBtn.onclick = () => { cleanup(); };
        }, 'image/png');
    };
    img.src = svgUrl;
}

// --- 渲染與工具列 ---
async function renderContent() {
    const rawText = editor.value || '';
    if(window.marked) {
       preview.innerHTML = marked.parse(rawText.replace(/\u00A0/g, ' '));
    } else {
        preview.innerHTML = "<p class='text-red-500'>Marked.js 尚未載入完成。</p>";
    }

    const codeBlocks = preview.querySelectorAll('code.language-mermaid');
    codeBlocks.forEach((block) => {
        const pre = block.parentElement;
        const container = document.createElement('div');
        // 移除 overflow-hidden 以允許內部元件放大並產生滾動條
        container.className = 'mermaid-wrapper group relative my-8 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all hover:shadow-md flex flex-col items-center';
        
        const mDiv = document.createElement('div');
        // 移除 flex 避免置中導致圖片左側被切斷，改用 text-center
        mDiv.className = 'mermaid w-full overflow-auto text-center';
        mDiv.textContent = block.textContent;
        
        container.appendChild(mDiv);
        pre.replaceWith(container);
    });

    try {
        const nodes = document.querySelectorAll('.mermaid');
        if (nodes.length > 0) {
            await mermaid.run({ nodes });
            attachToolbars();
        }
    } catch (err) {
        console.error("Mermaid Render Error:", err);
    }
}

function attachToolbars() {
    document.querySelectorAll('.mermaid-wrapper').forEach((container, i) => {
        if (container.querySelector('.toolbar')) return;

        const svg = container.querySelector('svg');
        if (!svg) return;

        let currentZoom = 100;
        svg.style.width = '100%';
        svg.style.minWidth = '100%';
        svg.style.height = 'auto';
        svg.style.transition = 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s';

        const toolbar = document.createElement('div');
        // 移除 opacity-0 與 group-hover:opacity-100 讓工具列永遠顯示
        toolbar.className = 'toolbar absolute top-3 right-3 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-20';
        
        const btnBase = 'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500';
        const flexBtnBase = btnBase + ' flex items-center gap-1';

        const bIn = document.createElement('button');
        bIn.className = btnBase;
        bIn.title = "放大圖表";
        bIn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
        bIn.onclick = () => { currentZoom += 20; svg.style.width = `${currentZoom}%`; svg.style.minWidth = `${currentZoom}%`; };

        const bOut = document.createElement('button');
        bOut.className = btnBase;
        bOut.title = "縮小圖表";
        bOut.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
        bOut.onclick = () => { currentZoom = Math.max(20, currentZoom - 20); svg.style.width = `${currentZoom}%`; svg.style.minWidth = `${currentZoom}%`; };

        // SVG 下載按鈕 (帶有文字標示)
        const bDlSvg = document.createElement('button');
        bDlSvg.className = flexBtnBase;
        bDlSvg.title = "下載 SVG 向量圖";
        bDlSvg.innerHTML = '<span class="text-[10px] font-bold">SVG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        bDlSvg.onclick = () => handleSvgDownload(svg, i);

        // PNG 下載按鈕 (帶有文字標示)
        const bDlPng = document.createElement('button');
        bDlPng.className = flexBtnBase;
        bDlPng.title = "下載 PNG 圖片";
        bDlPng.innerHTML = '<span class="text-[10px] font-bold">PNG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        bDlPng.onclick = () => handlePngDownload(svg, i);

        toolbar.append(bIn, bOut, bDlSvg, bDlPng);
        container.appendChild(toolbar);
    });
}

// --- 事件監聽 ---
let timer;
editor.addEventListener('input', () => {
    // 效能優化：輸入防抖 (Debounce) 機制
    clearTimeout(timer);
    timer = setTimeout(() => {
        renderContent();
        localStorage.setItem(STORAGE_KEY, editor.value);
        saveStatus.style.opacity = '1';
        setTimeout(() => saveStatus.style.opacity = '0', 1500);
    }, 400);
});

clearBtn.addEventListener('click', () => {
    if(editor.value === '') return;
    if(confirm('確定要清空編輯器嗎？')){
        editor.value = '';
        localStorage.removeItem(STORAGE_KEY);
        renderContent();
        editor.focus();
    }
});


// --- 初始化 ---
async function init() {
    updateTheme(true);
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
        editor.value = saved;
    } else {
        editor.value = await loadDefaultContent();
    }
    
    renderContent();
}

// 確保 marked.js 載入後再初始化 (因為 HTML 是以 script tag 引入 marked)
if(window.marked) {
    init();
} else {
    // 若尚未載入，等待 window load 事件
    window.addEventListener('load', init);
}