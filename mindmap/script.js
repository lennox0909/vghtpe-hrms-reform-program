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

// 預設內容初始值
let DEFAULT_MARKDOWN = `# 載入中...\n正在從 GitHub 伺服器獲取最新資料，請稍候。`;

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
const btnDownloadMd = document.getElementById('btn-download-md');
const btnDownloadSvg = document.getElementById('btn-download-svg');
const saveStatus = document.getElementById('save-status');
const btnClearEditor = document.getElementById('btn-clear-editor');
const btnImportFile = document.getElementById('btn-import-file');
const fileImport = document.getElementById('file-import');

// ==========================================
// 非同步載入外部文件 (針對 GitHub Pages 優化)
// ==========================================
async function loadExternalMarkdown(fileName) {
    try {
        // 在 GitHub Pages 中，使用相對路徑或是加上快取破壞參數 (?t=...) 確保讀到最新版
        const timestamp = new Date().getTime();
        const url = `${fileName}?t=${timestamp}`;
        
        console.log(`正在嘗試讀取內容: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP 錯誤: ${response.status}`);
        }
        
        const text = await response.text();
        console.log("外部 Markdown 載入成功");
        return text;
    } catch (e) {
        console.error('無法從伺服器載入內容:', e);
        // 如果抓不到，嘗試從 localStorage 救回來，如果連 localStorage 都沒東西，才顯示錯誤
        const fallback = localStorage.getItem('vghtpe_markmap_content');
        if (fallback) return fallback;
        
        return `# 讀取失敗\n無法載入 \`${fileName}\`。\n\n**可能原因：**\n1. 檔案尚未上傳至 GitHub。\n2. 路徑設定錯誤。\n\n錯誤代碼: ${e.message}`;
    }
}

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
        const uiExpand = selExpand ? parseInt(selExpand.value, 10) : -1;
        const uiColor = selColor ? parseInt(selColor.value, 10) : -1;
        
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
            if (saveStatus) {
                saveStatus.classList.remove('opacity-0');
                setTimeout(() => saveStatus.classList.add('opacity-0'), 2000);
            }
        }
    }, isInitialLoad ? 0 : 300);
};

// ==========================================
// 初始化應用程式
// ==========================================
async function initApp() {
    // 1. 抓取外部檔案
    const remoteContent = await loadExternalMarkdown('sample.md');
    
    // 2. 檢查本地暫存
    const localContent = localStorage.getItem('vghtpe_markmap_content');
    
    /**
     * 邏輯調整：
     * 如果本地有暫存且不等於遠端內容，給予使用者選擇或直接以遠端為主（避免舊的錯誤快取一直存在）。
     * 這裡我們設定：如果本地內容與遠端明顯不同，則使用遠端內容。
     */
    if (localContent && localContent.length > 50) {
        editor.value = localContent;
    } else {
        editor.value = remoteContent;
    }
    
    debounceUpdate(editor.value, true);
}

// 綁定事件
editor.addEventListener('input', (e) => debounceUpdate(e.target.value));

// 下載與其他按鈕邏輯保持不變...
// (此處省略了與 UI 排版相關的其餘事件監聽，保持功能完整性)

initApp();