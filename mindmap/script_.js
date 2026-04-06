import * as markmapLib from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm';
import * as markmapView from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm';
import * as markmapCommon from 'https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm';

// 合併模組到全域變數
window.markmap = {
    ...markmapCommon,
    ...markmapView,
    ...markmapLib
};

const { Transformer, Markmap, loadCSS, loadJS, deriveOptions } = window.markmap;
const transformer = new Transformer();

// 預設內容改為變數，初始為空字串或簡單的備用內容
let DEFAULT_MARKDOWN = `# 載入中...`;

let mm;
let currentRoot = null;
let currentOptionsStr = '';
let isFitted = false;
let prevTransform = null;
let isEditorVisible = true;

// UI 元素
const selExpand = document.getElementById('sel-expand');
const selColor = document.getElementById('sel-color');
const btnToggleEditor = document.getElementById('btn-toggle-editor');
const editorPane = document.getElementById('editor-pane');
const resizer = document.getElementById('resizer');
const editor = document.getElementById('editor');
const svgEl = document.getElementById('mindmap');
const btnFit = document.getElementById('btn-fit');
const fitText = document.getElementById('fit-text');
const btnDownload = document.getElementById('btn-download');
const btnDownloadSvg = document.getElementById('btn-download-svg');
const btnDownloadMd = document.getElementById('btn-download-md');
const saveStatus = document.getElementById('save-status');
const btnClearEditor = document.getElementById('btn-clear-editor');
const btnImportFile = document.getElementById('btn-import-file');
const fileImport = document.getElementById('file-import');

// ==========================================
// 非同步載入外部文件
// ==========================================
async function loadExternalMarkdown(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.text();
    } catch (e) {
        console.warn('無法載入外部 sample.md，使用內建備用內容', e);
        return `# 臺北榮民總醫院\n## 載入失敗\n請檢查 sample.md 是否存在。`;
    }
}

// ==========================================
// 收合/展開編輯區
// ==========================================
btnToggleEditor.addEventListener('click', () => {
    isEditorVisible = !isEditorVisible;
    editorPane.style.display = isEditorVisible ? '' : 'none';
    resizer.style.display = isEditorVisible ? '' : 'none';
    
    if (isEditorVisible) {
        btnToggleEditor.classList.replace('bg-white/30', 'bg-white/10');
    } else {
        btnToggleEditor.classList.replace('bg-white/10', 'bg-white/30');
    }

    if (mm) {
        setTimeout(() => mm.fit(), 50);
    }
});

// ==========================================
// 自訂 Modal
// ==========================================
const showModal = (title, message, options = {}) => {
    const modal = document.getElementById('custom-modal');
    const modalInner = modal.querySelector('div.bg-white');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');
    
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    
    btnCancel.style.display = options.isAlert ? 'none' : 'block';
    btnConfirm.innerText = options.confirmText || '確定';
    btnConfirm.className = `px-4 py-2 text-white rounded-xl transition-colors font-medium ${options.confirmColor || 'bg-blue-600 hover:bg-blue-500'}`;

    return new Promise((resolve) => {
        const closeModal = (result) => {
            modal.classList.remove('opacity-100');
            modalInner.classList.remove('scale-100');
            setTimeout(() => {
                modal.classList.replace('flex', 'hidden');
                btnConfirm.removeEventListener('click', onConfirm);
                btnCancel.removeEventListener('click', onCancel);
                resolve(result);
            }, 300);
        };

        const onConfirm = () => closeModal(true);
        const onCancel = () => closeModal(false);

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);

        modal.classList.replace('hidden', 'flex');
        void modal.offsetWidth;
        modal.classList.add('opacity-100');
        modalInner.classList.add('scale-100');
    });
};

// ==========================================
// 狀態儲存邏輯
// ==========================================
let viewStateTimeout;
const saveViewState = () => {
    if (!mm || !currentRoot) return;
    
    const getFoldedPaths = (node, path = "0", folded = []) => {
        if (node.payload && node.payload.fold === 1) folded.push(path);
        if (node.children) {
            node.children.forEach((c, i) => getFoldedPaths(c, `${path}-${i}`, folded));
        }
        return folded;
    };
    
    const state = {
        transform: window.d3.zoomTransform(svgEl),
        foldedPaths: getFoldedPaths(currentRoot),
        isFitted: isFitted
    };
    localStorage.setItem('vghtpe_markmap_viewstate', JSON.stringify(state));
};

const debounceSaveViewState = () => {
    clearTimeout(viewStateTimeout);
    viewStateTimeout = setTimeout(saveViewState, 500);
};

svgEl.addEventListener('click', debounceSaveViewState);

// ==========================================
// Resizer 邏輯
// ==========================================
const mainContainer = document.getElementById('main-container');
let isResizing = false;

const startResize = (e) => {
    isResizing = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = window.innerWidth >= 768 ? 'col-resize' : 'row-resize';
    
    document.addEventListener('mousemove', resizePanel);
    document.addEventListener('touchmove', resizePanel, { passive: false });
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);
};

const resizePanel = (e) => {
    if (!isResizing) return;
    if (e.type === 'touchmove') e.preventDefault(); 
    
    const isDesktop = window.innerWidth >= 768;
    const containerRect = mainContainer.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    if (isDesktop) {
        let newWidth = ((clientX - containerRect.left) / containerRect.width) * 100;
        newWidth = Math.max(10, Math.min(newWidth, 90));
        editorPane.style.width = `${newWidth}%`;
        editorPane.style.height = '100%';
    } else {
        let newHeight = ((clientY - containerRect.top) / containerRect.height) * 100;
        newHeight = Math.max(10, Math.min(newHeight, 90));
        editorPane.style.height = `${newHeight}%`;
        editorPane.style.width = '100%';
    }
};

const stopResize = () => {
    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', resizePanel);
    document.removeEventListener('touchmove', resizePanel);
    if (mm) {
        setTimeout(() => {
            mm.fit();
            debounceSaveViewState();
        }, 50);
    }
};

resizer.addEventListener('mousedown', startResize);
resizer.addEventListener('touchstart', startResize, { passive: false });

// ==========================================
// 檔案下載與匯入功能
// ==========================================
const saveFile = async (blob, suggestedName, description, acceptTypes) => {
    const fallbackDownload = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    try {
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{ description, accept: acceptTypes }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            fallbackDownload();
        }
    } catch (err) {
        if (err.name !== 'AbortError') fallbackDownload();
    }
};

btnDownloadMd.addEventListener('click', async () => {
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    await saveFile(blob, 'mindmap.md', 'Markdown', { 'text/markdown': ['.md'] });
});

btnDownloadSvg.addEventListener('click', async () => {
    const clone = svgEl.cloneNode(true);
    const style = document.createElement('style');
    style.textContent = `.markmap-link { fill: none; } .markmap-node circle { cursor: pointer; }`;
    clone.insertBefore(style, clone.firstChild);
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    await saveFile(blob, 'mindmap.svg', 'SVG', { 'image/svg+xml': ['.svg'] });
});

btnClearEditor.addEventListener('click', async () => {
    const confirmed = await showModal('清除內容', '確定要清除所有內容嗎？', { confirmColor: 'bg-red-500 hover:bg-red-600' });
    if (confirmed) {
        editor.value = '';
        debounceUpdate('');
    }
});

btnImportFile.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        editor.value = ev.target.result;
        debounceUpdate(editor.value);
    };
    reader.readAsText(file);
});

// ==========================================
// 更新心智圖核心邏輯
// ==========================================
const updateMindmap = async (markdown, isInitialLoad = false) => {
    try {
        const safeMarkdown = markdown.replace(/\xA0/g, ' ');
        const { root, features, frontmatter } = transformer.transform(safeMarkdown);
        currentRoot = root;
        
        const { styles, scripts } = transformer.getUsedAssets(features);
        if (styles) loadCSS(styles);
        if (scripts) await loadJS(scripts, { getMarkmap: () => window.markmap });
        
        const optionsRaw = frontmatter?.markmap || {};
        const uiExpand = parseInt(selExpand.value, 10);
        const uiColor = parseInt(selColor.value, 10);
        
        if (uiExpand !== -1) optionsRaw.initialExpandLevel = uiExpand;
        if (uiColor !== -1) optionsRaw.colorFreezeLevel = uiColor;
        
        const optionsStr = JSON.stringify(optionsRaw);
        const optionsChanged = currentOptionsStr !== optionsStr;
        let finalOptions = typeof deriveOptions === 'function' ? deriveOptions(optionsRaw) : {};

        let savedViewState = isInitialLoad ? JSON.parse(localStorage.getItem('vghtpe_markmap_viewstate') || 'null') : null;

        if (isInitialLoad && savedViewState?.foldedPaths) {
            const applyFolded = (node, paths, path = "0") => {
                if (!node.payload) node.payload = {};
                node.payload.fold = paths.includes(path) ? 1 : 0;
                if (node.children) node.children.forEach((c, i) => applyFolded(c, paths, `${path}-${i}`));
            };
            applyFolded(root, savedViewState.foldedPaths);
        } else if (optionsRaw.initialExpandLevel !== undefined) {
            const level = optionsRaw.initialExpandLevel;
            const applyExpand = (node, depth) => {
                if (!node.payload) node.payload = {};
                node.payload.fold = depth >= level ? 1 : 0;
                if (node.children) node.children.forEach(c => applyExpand(c, depth + 1));
            };
            applyExpand(root, 0);
        }

        if (!mm || optionsChanged) {
            if (mm) mm.destroy();
            svgEl.innerHTML = '';
            currentOptionsStr = optionsStr;
            mm = Markmap.create(svgEl, finalOptions, root);
            
            if (isInitialLoad && savedViewState?.transform) {
                const t = savedViewState.transform;
                const d3T = window.d3.zoomIdentity.translate(t.x, t.y).scale(t.k);
                setTimeout(() => window.d3.select(svgEl).call(mm.zoom.transform, d3T), 50);
            } else {
                mm.fit();
            }
        } else {
            mm.setData(root);
        }
    } catch (error) {
        console.error("渲染錯誤:", error);
    }
};

let timeout;
const debounceUpdate = (markdown, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(markdown, isInitialLoad);
        if (!isInitialLoad) {
            localStorage.setItem('vghtpe_markmap_content', markdown);
            saveStatus.classList.remove('opacity-0');
            setTimeout(() => saveStatus.classList.add('opacity-0'), 2000);
        }
    }, isInitialLoad ? 0 : 300);
};

// 鍵盤輸入事件
editor.addEventListener('input', (e) => debounceUpdate(e.target.value));

// 適應螢幕
btnFit.addEventListener('click', () => {
    if (!mm) return;
    if (isFitted && prevTransform) {
        window.d3.select(svgEl).transition().duration(300).call(mm.zoom.transform, prevTransform);
        isFitted = false;
        fitText.innerText = '適應螢幕';
    } else {
        prevTransform = window.d3.zoomTransform(svgEl);
        mm.fit();
        isFitted = true;
        fitText.innerText = '恢復視角';
    }
    debounceSaveViewState();
});

// ==========================================
// 初始化應用程式
// ==========================================
async function initApp() {
    // 1. 嘗試抓取外部文件內容作為預設值
    DEFAULT_MARKDOWN = await loadExternalMarkdown('sample.md');

    // 2. 優先讀取暫存內容，若無暫存則使用剛剛載入的 DEFAULT_MARKDOWN
    const savedContent = localStorage.getItem('vghtpe_markmap_content');
    editor.value = savedContent || DEFAULT_MARKDOWN;
    
    // 3. 初始渲染
    debounceUpdate(editor.value, true);
}

// 執行初始化
initApp();