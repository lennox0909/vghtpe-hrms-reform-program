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
// 非同步載入外部文件 (針對 GitHub Pages 路徑優化)
// ==========================================
async function loadExternalMarkdown(fileName) {
    // 取得當前網頁的基礎路徑 (解決 GitHub Pages 子目錄問題)
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const timestamp = new Date().getTime();
    const targetUrl = `${baseUrl}${fileName}?t=${timestamp}`;
    
    try {
        console.log(`[Debug] 嘗試讀取: ${targetUrl}`);
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        // 檢查抓回來的內容是否真的是 Markdown (有時候會抓到 404 的 HTML 頁面)
        if (text.trim().startsWith('<!DOCTYPE')) {
            throw new Error("抓取到的是 HTML 頁面而非 Markdown 檔案，請檢查路徑。");
        }
        
        console.log("[Success] 外部 Markdown 載入成功");
        return text;
    } catch (e) {
        console.error('[Error] 無法載入內容:', e);
        
        // 檢查是否有本地緩存作為備援
        const fallback = localStorage.getItem('vghtpe_markmap_content');
        if (fallback && fallback.length > 100) {
            console.log("[Info] 使用本地暫存內容作為備援");
            return fallback;
        }
        
        return `# 讀取失敗\n無法從以下路徑載入 \`${fileName}\`：\n\`${targetUrl}\`\n\n**請檢查：**\n1. 檔案名稱大小寫是否完全正確 (GitHub Pages 區分大小寫)。\n2. 檔案是否確實上傳到 \`mindmap\` 資料夾下。\n3. 嘗試在 Repo 根目錄新增一個名為 \`.nojekyll\` 的空檔案。\n\n錯誤訊息: ${e.message}`;
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
    // 1. 先從伺服器抓取
    const remoteContent = await loadExternalMarkdown('sample.md');
    
    // 2. 判斷要顯示哪份內容
    // 如果遠端抓取成功 (不是錯誤訊息)，則優先使用遠端內容 (確保資料更新)
    // 只有當遠端失敗且本地有舊資料時，才會顯示本地資料
    if (remoteContent.startsWith('# 讀取失敗')) {
        const localContent = localStorage.getItem('vghtpe_markmap_content');
        editor.value = localContent || remoteContent;
    } else {
        editor.value = remoteContent;
    }
    
    debounceUpdate(editor.value, true);
}

// 綁定事件
if (editor) {
    editor.addEventListener('input', (e) => debounceUpdate(e.target.value));
}

initApp();