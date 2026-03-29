import * as markmapLib from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm';
import * as markmapView from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm';
import * as markmapCommon from 'https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm';

// 合併模組到全域變數 window.markmap
window.markmap = {
    ...markmapCommon,
    ...markmapView,
    ...markmapLib
};

const { Transformer, Markmap, loadCSS, loadJS, deriveOptions } = window.markmap;
const transformer = new Transformer();

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

// 預設內容 (對應 sample.md)
const DEFAULT_CONTENT = `---
title: markmap
markmap:
  colorFreezeLevel: 3
  initialExpandLevel: 3
---

# 臺北榮民總醫院：院長-->副院長(5位)-->主任秘書
## 業務單位
### 內科部（61）
1. 胃腸肝膽科
2. 血液科
### 外科部（62）
1. 一般外科
2. 胸腔外科
## 輔助單位
### 人事室（10）
1. 任免組
2. 考核組`;

// ==========================================
// 自訂模態框邏輯
// ==========================================
const showModal = (title, message, options = {}) => {
    const modal = document.getElementById('custom-modal');
    const modalInner = modal.querySelector('div.transform');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');
    
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    
    btnCancel.style.display = options.isAlert ? 'none' : 'block';
    btnConfirm.innerText = options.confirmText || '確定';
    btnConfirm.className = `px-4 py-2 text-white rounded-xl transition-colors font-medium \${options.confirmColor || 'bg-blue-600 hover:bg-blue-500'}`;

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
// 核心更新邏輯
// ==========================================
const updateMindmap = async (markdown, isInitialLoad = false) => {
    try {
        const safeMarkdown = markdown.replace(/\\xA0/g, ' ');
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

        // 恢復暫存視角
        let savedViewState = null;
        if (isInitialLoad) {
            const stateStr = localStorage.getItem('vghtpe_markmap_viewstate');
            if (stateStr) savedViewState = JSON.parse(stateStr);
        }

        if (isInitialLoad && savedViewState?.foldedPaths) {
            const applyFolded = (node, paths, path = "0") => {
                if (!node.payload) node.payload = {};
                node.payload.fold = paths.includes(path) ? 1 : 0;
                if (node.children) node.children.forEach((c, i) => applyFolded(c, paths, \`\${path}-\${i}\`));
            };
            applyFolded(root, savedViewState.foldedPaths);
        } else if (optionsRaw.initialExpandLevel !== undefined && (optionsChanged || !mm)) {
            const level = optionsRaw.initialExpandLevel;
            const applyExpand = (node, depth) => {
                if (!node.payload) node.payload = {};
                node.payload.fold = depth >= level ? 1 : 0;
                if (node.children) node.children.forEach(c => applyExpand(c, depth + 1));
            };
            applyExpand(root, 0);
        }

        if (!finalOptions.color && optionsRaw.colorFreezeLevel !== undefined) {
            const freezeLevel = optionsRaw.colorFreezeLevel;
            const colors = ['#00508C', '#00A0E9', '#00B2A9', '#F39200', '#E60012', '#71C5E8', '#C4D600', '#8A8D8F'];
            finalOptions.color = (node) => colors[Math.min(node.depth, freezeLevel) % colors.length];
        }

        if (!mm) {
            currentOptionsStr = optionsStr;
            mm = Markmap.create(svgEl, finalOptions, root);
            if (isInitialLoad && savedViewState?.transform) {
                const t = savedViewState.transform;
                const d3Transform = window.d3.zoomIdentity.translate(t.x, t.y).scale(t.k);
                setTimeout(() => window.d3.select(svgEl).call(mm.zoom.transform, d3Transform), 50);
                isFitted = savedViewState.isFitted;
                fitText.innerText = isFitted ? '恢復視角' : '適應螢幕';
                if (!isFitted) prevTransform = t;
            } else {
                mm.fit();
                isFitted = true;
                fitText.innerText = '恢復視角';
            }
        } else if (optionsChanged) {
            currentOptionsStr = optionsStr;
            mm.destroy();
            svgEl.innerHTML = '';
            mm = Markmap.create(svgEl, finalOptions, root);
            mm.fit();
            isFitted = true;
            fitText.innerText = '恢復視角';
        } else {
            mm.setData(root);
        }
    } catch (e) { console.error(e); }
};

// ==========================================
// 事件監聽與下載功能
// ==========================================
let timeout, saveTimeout;
const debounceUpdate = (markdown, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(markdown, isInitialLoad);
        if (!isInitialLoad) {
            localStorage.setItem('vghtpe_markmap_content', markdown);
            saveStatus.classList.remove('opacity-0');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => saveStatus.classList.add('opacity-0'), 2000);
        }
    }, isInitialLoad ? 0 : 300);
};

const saveFile = async (blob, suggestedName, description, acceptTypes) => {
    const fallback = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = suggestedName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };
    try {
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{ description, accept: acceptTypes }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob); await writable.close();
        } else fallback();
    } catch (e) { if (e.name !== 'AbortError') fallback(); }
};

btnDownloadMd.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    saveFile(blob, 'mindmap.md', 'Markdown File', { 'text/markdown': ['.md'] });
});

btnDownloadSvg.addEventListener('click', () => {
    const clone = svgEl.cloneNode(true);
    const style = document.createElement('style');
    style.textContent = \`.markmap-link { fill: none; } .markmap-node circle { cursor: pointer; } foreignObject { overflow: visible; } svg { background-color: #fff; font-family: sans-serif; }\`;
    clone.insertBefore(style, clone.firstChild);
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    saveFile(blob, 'mindmap.svg', 'SVG Image', { 'image/svg+xml': ['.svg'] });
});

btnDownload.addEventListener('click', async () => {
    // 完整 HTML 匯出邏輯
    const endTag = '</' + 'script>';
    const html = \`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Markmap Export</title>
    <script src="https://cdn.tailwindcss.com">\${endTag}
    <script src="https://cdn.jsdelivr.net/npm/d3@7">\${endTag}
    <style>body{margin:0;overflow:hidden;background:#f8fafc;}svg{width:100vw;height:100vh;}.markmap-link{fill:none;}</style>
    </head><body><svg id="mm"></svg>
    <script type="module">
        import * as mLib from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm';
        import * as mView from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm';
        const { Transformer, Markmap } = { ...mLib, ...mView };
        const md = \\\`\${editor.value.replace(/\\\`/g, '\\\\\\`')}\\\`;
        const transformer = new Transformer();
        const { root } = transformer.transform(md);
        Markmap.create(document.getElementById('mm'), {}, root);
    \${endTag}</body></html>\`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    saveFile(blob, 'mindmap.html', 'HTML Webpage', { 'text/html': ['.html'] });
});

// UI 控制與 Resizer
btnToggleEditor.addEventListener('click', () => {
    isEditorVisible = !isEditorVisible;
    editorPane.style.display = isEditorVisible ? '' : 'none';
    resizer.style.display = isEditorVisible ? '' : 'none';
    if (mm) setTimeout(() => mm.fit(), 50);
});

btnFit.addEventListener('click', () => {
    if (isFitted && prevTransform) {
        window.d3.select(svgEl).transition().duration(300).call(mm.zoom.transform, window.d3.zoomIdentity.translate(prevTransform.x, prevTransform.y).scale(prevTransform.k));
        isFitted = false; fitText.innerText = '適應螢幕';
    } else {
        prevTransform = window.d3.zoomTransform(svgEl);
        mm.fit(); isFitted = true; fitText.innerText = '恢復視角';
    }
});

btnClearEditor.addEventListener('click', async () => {
    if (await showModal('清除內容', '確定要清除所有內容嗎？', { confirmText: '確定清除', confirmColor: 'bg-red-500' })) {
        editor.value = ''; debounceUpdate('');
    }
});

btnImportFile.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        if (editor.value.trim() !== '' && !await showModal('匯入', '將覆蓋當前內容，確定嗎？')) return;
        editor.value = ev.target.result; debounceUpdate(editor.value);
    };
    reader.readAsText(file);
});

// 初始化載入
const savedContent = localStorage.getItem('vghtpe_markmap_content');
editor.value = savedContent || DEFAULT_CONTENT;
debounceUpdate(editor.value, true);

// Resizer 邏輯 (省略重複座標計算，直接套用原始邏輯)
resizer.addEventListener('mousedown', (e) => {
    const move = (me) => {
        const isDesktop = window.innerWidth >= 768;
        const rect = mainContainer.getBoundingClientRect();
        if (isDesktop) editorPane.style.width = \`\${((me.clientX - rect.left) / rect.width) * 100}%\`;
        else editorPane.style.height = \`\${((me.clientY - rect.top) / rect.height) * 100}%\`;
    };
    const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        if (mm) mm.fit();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
});
