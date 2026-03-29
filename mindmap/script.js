import * as markmapLib from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm';
import * as markmapView from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm';
import * as markmapCommon from 'https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm';

// 核心關鍵：將 lib、view 與 common 所有的模組方法完美合併到全域變數 window.markmap
window.markmap = {
    ...markmapCommon,
    ...markmapView,
    ...markmapLib
};

const { Transformer, Markmap, loadCSS, loadJS, deriveOptions } = window.markmap;

// 初始化 Transformer
const transformer = new Transformer();

// Markmap 實例變數
let mm;
let currentRoot = null; // 追蹤當前的資料樹，用於儲存折疊狀態

// 追蹤目前的 Markmap 設定，用來判斷是否需要重新初始化
let currentOptionsStr = '';

// UI 相關元素
const selExpand = document.getElementById('sel-expand');
const selColor = document.getElementById('sel-color');
const btnToggleEditor = document.getElementById('btn-toggle-editor');
const editorPane = document.getElementById('editor-pane');
const resizer = document.getElementById('resizer');

// 適應螢幕功能變數
let isFitted = false;
let prevTransform = null;
let isEditorVisible = true;

// ==========================================
// 收合/展開編輯區邏輯
// ==========================================
btnToggleEditor.addEventListener('click', () => {
    isEditorVisible = !isEditorVisible;

    // 使用 display 切換可完美與 Flexbox 共存，不會破壞原有拖曳設定的 width/height
    editorPane.style.display = isEditorVisible ? '' : 'none';
    resizer.style.display = isEditorVisible ? '' : 'none';

    // 給按鈕加上不同的背景狀態提示
    if (isEditorVisible) {
        btnToggleEditor.classList.replace('bg-white/30', 'bg-white/10');
    } else {
        btnToggleEditor.classList.replace('bg-white/10', 'bg-white/30');
    }

    // 延遲一點點讓 DOM 完成 Flexbox 重新佈局，然後重新置中心智圖
    if (mm) {
        setTimeout(() => mm.fit(), 50);
    }
});

const editor = document.getElementById('editor');
const svgEl = document.getElementById('mindmap');
const btnFit = document.getElementById('btn-fit');
const fitText = document.getElementById('fit-text');
const btnDownload = document.getElementById('btn-download');
const btnDownloadSvg = document.getElementById('btn-download-svg');
const btnDownloadMd = document.getElementById('btn-download-md');
const saveStatus = document.getElementById('save-status'); // 取得儲存狀態提示元素
const btnClearEditor = document.getElementById('btn-clear-editor'); // 取得清除內容按鈕
const btnImportFile = document.getElementById('btn-import-file'); // 取得匯入檔案按鈕
const fileImport = document.getElementById('file-import'); // 取得隱藏的檔案輸入框

// ==========================================
// 自訂 Modal 邏輯 (取代 confirm / alert)
// ==========================================
const showModal = (title, message, options = {}) => {
    const modal = document.getElementById('custom-modal');
    const modalInner = modal.querySelector('div.bg-white');
    const btnCancel = document.getElementById('modal-cancel');
    const btnConfirm = document.getElementById('modal-confirm');

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;

    // 設定按鈕狀態與文字
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
            }, 300); // 對應 duration-300
        };

        const onConfirm = () => closeModal(true);
        const onCancel = () => closeModal(false);

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);

        modal.classList.replace('hidden', 'flex');
        // 觸發重繪以播放動畫
        void modal.offsetWidth;
        modal.classList.add('opacity-100');
        modalInner.classList.add('scale-100');
    });
};

// ==========================================
// 視覺狀態 (View State) 儲存邏輯：折疊、縮放、平移
let viewStateTimeout;
const saveViewState = () => {
    if (!mm || !currentRoot) return;

    // 遞迴取得所有被使用者折疊的節點路徑
    const getFoldedPaths = (node, path = "0", folded = []) => {
        if (node.payload && node.payload.fold === 1) folded.push(path);
        if (node.children) {
            node.children.forEach((c, i) => getFoldedPaths(c, `${path}-${i}`, folded));
        }
        return folded;
    };

    const state = {
        transform: window.d3.zoomTransform(svgEl), // 取得目前的平移與縮放值
        foldedPaths: getFoldedPaths(currentRoot),  // 取得被收合的節點列表
        isFitted: isFitted                         // 記錄目前是否為「適應螢幕」狀態
    };
    localStorage.setItem('vghtpe_markmap_viewstate', JSON.stringify(state));
};

const debounceSaveViewState = () => {
    clearTimeout(viewStateTimeout);
    viewStateTimeout = setTimeout(saveViewState, 500); // 等待動畫或資料更新完成後再存檔
};

// 點擊節點（展開/收合）時觸發儲存
svgEl.addEventListener('click', debounceSaveViewState);

// ==========================================
// 面板拖曳調整大小 (Resizer) 邏輯支援滑鼠與觸控
// ==========================================
const mainContainer = document.getElementById('main-container');
let isResizing = false;

const startResize = (e) => {
    isResizing = true;
    // 變更游標與防止文字被選取
    document.body.style.userSelect = 'none';
    document.body.style.cursor = window.innerWidth >= 768 ? 'col-resize' : 'row-resize';

    document.addEventListener('mousemove', resizePanel);
    document.addEventListener('touchmove', resizePanel, { passive: false });
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);
};

const resizePanel = (e) => {
    if (!isResizing) return;
    // 防止平板/手機在拖曳調整桿時畫面跟著捲動
    if (e.type === 'touchmove') e.preventDefault();

    const isDesktop = window.innerWidth >= 768; // Tailwind 的 md 斷點
    const containerRect = mainContainer.getBoundingClientRect();

    // 取得觸控點或滑鼠點的位置
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    if (isDesktop) {
        // 桌機/橫式平板：調整寬度比例
        let newWidth = ((clientX - containerRect.left) / containerRect.width) * 100;
        newWidth = Math.max(10, Math.min(newWidth, 90)); // 限制範圍 10% ~ 90%
        editorPane.style.width = `${newWidth}%`;
        editorPane.style.height = '100%';
    } else {
        // 手機/直式平板：調整高度比例
        let newHeight = ((clientY - containerRect.top) / containerRect.height) * 100;
        newHeight = Math.max(10, Math.min(newHeight, 90)); // 限制範圍 10% ~ 90%
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
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchend', stopResize);

    // 拖曳結束後，通知 Markmap 更新並重新置中一次，並儲存狀態
    if (mm) {
        setTimeout(() => {
            mm.fit();
            debounceSaveViewState();
        }, 50);
    }
};

resizer.addEventListener('mousedown', startResize);
resizer.addEventListener('touchstart', startResize, { passive: false });

// 處理視窗大小改變或平板翻轉時的排版切換
let lastIsDesktop = window.innerWidth >= 768;
window.addEventListener('resize', () => {
    const currentIsDesktop = window.innerWidth >= 768;
    if (lastIsDesktop !== currentIsDesktop) {
        // 斷點切換 (如從橫放變直放)，清除手動設定的行內樣式，恢復預設的 Tailwind class 控制
        editorPane.style.width = '';
        editorPane.style.height = '';
        lastIsDesktop = currentIsDesktop;
    }
    if (mm) {
        setTimeout(() => {
            mm.fit();
            debounceSaveViewState();
        }, 200);
    }
});

// 當使用者手動拖曳、縮放或在行動裝置上滑動時，自動解除「已適應」狀態並存檔
const resetFitState = () => {
    if (isFitted) {
        isFitted = false;
        fitText.innerText = '適應螢幕';
    }
    debounceSaveViewState(); // 使用者調整視角後觸發儲存
};
svgEl.addEventListener('mousedown', resetFitState);
svgEl.addEventListener('wheel', resetFitState);
svgEl.addEventListener('touchstart', resetFitState);

// ==========================================
// 匯出與下載功能區塊
// ==========================================

// 建立一個通用的儲存檔案函式，使用 File System Access API 來喚起「另存新檔」對話框
const saveFile = async (blob, suggestedName, description, acceptTypes) => {
    // 定義傳統下載的退回方案 (Fallback)
    const fallbackDownload = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName; // 瀏覽器會根據使用者的設定決定是否跳出視窗詢問
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    try {
        // 檢查瀏覽器是否支援現代的 File System Access API
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{
                    description,
                    accept: acceptTypes
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            // 若本身不支援（例如部分行動裝置），直接退回傳統下載方式
            fallbackDownload();
        }
    } catch (err) {
        // 如果是使用者自己按了「取消」 (AbortError)，則什麼都不做
        if (err.name === 'AbortError') return;

        // 在跨網域 iframe 預覽環境中，呼叫 showSaveFilePicker 會拋出 SecurityError
        // 遇到此安全性阻擋時，不要報錯，而是靜默地退回傳統下載模式，確保功能正常運作
        console.warn('受限於 iframe 安全政策，退回傳統下載模式:', err.message);
        fallbackDownload();
    }
};

// 下載 Markdown 檔案的專屬邏輯
btnDownloadMd.addEventListener('click', async () => {
    const markdownContent = editor.value;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    await saveFile(blob, 'markmap-mindmap.md', 'Markdown 檔案', { 'text/markdown': ['.md', '.markdown'] });
});

// 下載 HTML 檔案的專屬邏輯
btnDownload.addEventListener('click', async () => {
    const endTag = '<' + '/script>';
    const scriptRegex = new RegExp(endTag, 'gi');

    // 抓取當前 UI 選單的色彩設定
    const uiColor = parseInt(selColor.value, 10);

    let finalMdForExport = editor.value.replace(scriptRegex, '&lt;/script&gt;').replace(/\xA0/g, ' ');

    // 取得當前存檔當下的折疊狀態
    const getFoldedPaths = (node, path = "0", folded = []) => {
        if (node && node.payload && node.payload.fold === 1) folded.push(path);
        if (node && node.children) {
            node.children.forEach((c, i) => getFoldedPaths(c, `${path}-${i}`, folded));
        }
        return folded;
    };
    const currentFoldedPaths = currentRoot ? getFoldedPaths(currentRoot) : [];
    const foldedPathsJson = JSON.stringify(currentFoldedPaths);

    // 取得當下視角的平移與縮放值
    const currentTransform = window.d3.zoomTransform(svgEl);
    const transformJson = JSON.stringify(currentTransform);

    const htmlLines = [
        '<!DOCTYPE html>',
        '<html lang="zh-TW">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '    <title>Markmap 匯出心智圖</title>',
        '    <script src="https://cdn.tailwindcss.com">' + endTag,
        '    <script src="https://cdn.jsdelivr.net/npm/d3@7">' + endTag,
        '    <style>',
        '        body { margin: 0; padding: 0; width: 100vw; height: 100vh; font-family: sans-serif; overflow: hidden; background-color: #f8fafc; }',
        '        svg { width: 100%; height: 100%; }',
        '        .markmap-link { fill: none; }',
        '        .markmap-node circle { cursor: pointer; transition: r 0.2s ease; }',
        '        .markmap-node circle:hover { r: 6px; }',
        '        #controls { position: absolute; top: 1rem; right: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; background: rgba(255,255,255,0.9); padding: 0.75rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 10; align-items: center; border: 1px solid #e2e8f0; }',
        '        button, select { padding: 0.375rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; background: white; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #334155; transition: all 0.2s; }',
        '        button:hover, select:hover { background: #f1f5f9; border-color: #94a3b8; }',
        '    </style>',
        '</head>',
        '<body>',
        '    <div id="controls">',
        '        <div style="display: flex; align-items: center; gap: 0.5rem;">',
        '            <label for="sel-expand" style="font-size: 0.875rem; font-weight: 600; color: #475569;">展開層級</label>',
        '            <select id="sel-expand">',
        '                <option value="-1" selected>目前視角</option>',
        '                <option value="999">全部展開</option>',
        '                <option value="1">第 1 層</option>',
        '                <option value="2">第 2 層</option>',
        '                <option value="3">第 3 層</option>',
        '                <option value="4">第 4 層</option>',
        '                <option value="5">第 5 層</option>',
        '            </select>',
        '        </div>',
        '        <div style="width: 1px; height: 1.5rem; background: #cbd5e1; margin: 0 0.25rem;"></div>',
        '        <button id="btn-zoom-in" title="放大">🔍 放大</button>',
        '        <button id="btn-zoom-out" title="縮小">🔍 縮小</button>',
        '        <button id="btn-fit" title="適應螢幕">⛶ 適應螢幕</button>',
        '    </div>',
        '    <svg id="mindmap"></svg>',
        '    <script type="text/template" id="md-content">',
        finalMdForExport,
        '    ' + endTag,
        '    <script type="module">',
        '        import * as markmapLib from "https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm";',
        '        import * as markmapView from "https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm";',
        '        import * as markmapCommon from "https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm";',
        '',
        '        const { Transformer, Markmap, loadCSS, loadJS, deriveOptions } = { ...markmapLib, ...markmapView, ...markmapCommon };',
        '        const transformer = new Transformer();',
        '        const mdContent = document.getElementById("md-content").textContent;',
        '        ',
        '        (async () => {',
        '            const { root, features, frontmatter } = transformer.transform(mdContent);',
        '            const { styles, scripts } = transformer.getUsedAssets(features);',
        '            if (styles) loadCSS(styles);',
        '            if (scripts) await loadJS(scripts, { getMarkmap: () => ({ ...markmapLib, ...markmapView, ...markmapCommon }) });',
        '            ',
        '            const optionsRaw = frontmatter?.markmap || {};',
        '            let finalOptions = typeof deriveOptions === "function" ? deriveOptions(optionsRaw) : {};',
        '            const uiColor = ' + uiColor + ';',
        '            if (!finalOptions.color && (optionsRaw.colorFreezeLevel !== undefined || uiColor !== -1)) {',
        '                const freezeLevel = uiColor !== -1 ? uiColor : optionsRaw.colorFreezeLevel;',
        '                const colors = ["#00508C", "#00A0E9", "#00B2A9", "#F39200", "#E60012", "#71C5E8", "#C4D600", "#8A8D8F"];',
        '                finalOptions.color = (node) => colors[Math.min(node.depth, freezeLevel) % colors.length];',
        '            }',
        '            ',
        '            // 套用匯出當下的折疊狀態',
        '            const foldedPaths = ' + foldedPathsJson + ';',
        '            const applyFoldedPaths = (node, paths, path = "0") => {',
        '                if (!node.payload) node.payload = {};',
        '                node.payload.fold = paths.includes(path) ? 1 : 0;',
        '                if (node.children) {',
        '                    node.children.forEach((c, i) => applyFoldedPaths(c, paths, `${path}-${i}`));',
        '                }',
        '            };',
        '            applyFoldedPaths(root, foldedPaths);',
        '            ',
        '            const svgEl = document.getElementById("mindmap");',
        '            const mm = Markmap.create(svgEl, finalOptions, root);',
        '            ',
        '            // 恢復匯出當下的平移與縮放視角',
        '            const transformData = ' + transformJson + ';',
        '            const d3Transform = d3.zoomIdentity.translate(transformData.x, transformData.y).scale(transformData.k);',
        '            d3.select(svgEl).call(mm.zoom.transform, d3Transform);',
        '            ',
        '            // Controls Logic',
        '            document.getElementById("btn-zoom-in").addEventListener("click", () => {',
        '                d3.select(svgEl).transition().duration(300).call(mm.zoom.scaleBy, 1.2);',
        '            });',
        '            document.getElementById("btn-zoom-out").addEventListener("click", () => {',
        '                d3.select(svgEl).transition().duration(300).call(mm.zoom.scaleBy, 0.8);',
        '            });',
        '            document.getElementById("btn-fit").addEventListener("click", () => {',
        '                mm.fit();',
        '            });',
        '            document.getElementById("sel-expand").addEventListener("change", (e) => {',
        '                const level = parseInt(e.target.value, 10);',
        '                const applyExpand = (node, currentDepth) => {',
        '                    if (!node.payload) node.payload = {};',
        '                    node.payload.fold = currentDepth >= level ? 1 : 0;',
        '                    if (node.children) {',
        '                        node.children.forEach(c => applyExpand(c, currentDepth + 1));',
        '                    }',
        '                };',
        '                applyExpand(root, 0);',
        '                mm.setData(root);',
        '                mm.fit();',
        '            });',
        '        })();',
        '    ' + endTag,
        '</body>',
        '</html>'
    ];
    const htmlContent = htmlLines.join('\n');

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    await saveFile(blob, 'markmap-mindmap.html', 'HTML 網頁檔案', { 'text/html': ['.html'] });
});

// 下載 SVG 檔案的專屬邏輯 (保留當前視角)
btnDownloadSvg.addEventListener('click', async () => {
    if (!svgEl) return;

    // 1. 複製一份當前的 SVG 節點，避免修改到畫面上的實際元素
    const clone = svgEl.cloneNode(true);

    // 2. 由於已固定為淺色主題，直接寫入淺色基礎樣式
    const style = document.createElement('style');
    const bgColor = '#ffffff'; // Tailwind white
    const textColor = '#1f2937'; // Tailwind gray-800
    const codeBgColor = '#f3f4f6'; // Tailwind gray-100

    style.textContent = `
                .markmap-link { fill: none; }
                .markmap-node circle { cursor: pointer; }
                foreignObject { overflow: visible; }
                /* 繼承淺色主題的文字與背景顏色 */
                svg { background-color: ${bgColor}; color: ${textColor}; font-family: sans-serif; }
                code { background-color: ${codeBgColor}; border-radius: 4px; padding: 2px 4px; }
            `;
    clone.insertBefore(style, clone.firstChild);

    // 3. 確保命名空間 (XMLNS) 存在，否則瀏覽器無法識別其為 SVG 檔案
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // 4. 將 SVG 節點轉換為字串格式
    const svgData = new XMLSerializer().serializeToString(clone);

    // 5. 建立 Blob 並觸發儲存對話框
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    await saveFile(blob, 'markmap-mindmap.svg', 'SVG 圖片檔案', { 'image/svg+xml': ['.svg'] });
});

// 核心更新函數：將 Markdown 轉為心智圖
const updateMindmap = async (markdown, isInitialLoad = false) => {
    try {
        // 將不可見的特殊空白 (U+00A0) 替換為普通空格，避免 YAML 解析失敗
        const safeMarkdown = markdown.replace(/\xA0/g, ' ');

        // 1. 解析淨化後的 Markdown 
        const { root, features, frontmatter } = transformer.transform(safeMarkdown);
        currentRoot = root; // 記下當前的根節點

        // 2. 獲取並載入所需的資源 (例如 Prism.js 或 KaTeX)
        const { styles, scripts } = transformer.getUsedAssets(features);
        if (styles) loadCSS(styles);
        if (scripts) {
            await loadJS(scripts, { getMarkmap: () => window.markmap });
        }

        // 取得 Markdown frontmatter 內的預設設定
        const optionsRaw = frontmatter?.markmap || {};

        // 【核心升級】讀取頂部 UI 下拉選單的數值，若有選擇則強勢覆蓋文本設定
        const uiExpand = parseInt(selExpand.value, 10);
        const uiColor = parseInt(selColor.value, 10);

        if (uiExpand !== -1) optionsRaw.initialExpandLevel = uiExpand;
        if (uiColor !== -1) optionsRaw.colorFreezeLevel = uiColor;

        const optionsStr = JSON.stringify(optionsRaw);

        // 判斷是否為使用者修改了設定區塊或下拉選單
        const optionsChanged = currentOptionsStr !== optionsStr;

        // 利用 deriveOptions 將設定轉換為 Markmap 參數
        let finalOptions = typeof deriveOptions === 'function' ? deriveOptions(optionsRaw) : {};

        // 【新增】讀取儲存的視角與折疊狀態
        let savedViewState = null;
        if (isInitialLoad) {
            const stateStr = localStorage.getItem('vghtpe_markmap_viewstate');
            if (stateStr) {
                try {
                    savedViewState = JSON.parse(stateStr);
                } catch (e) {
                    console.error('無法解析儲存的視角狀態', e);
                }
            }
        }

        // 【強制套用 initialExpandLevel 的保護機制】
        if (isInitialLoad && savedViewState && savedViewState.foldedPaths) {
            // 若有暫存的折疊狀態，優先還原暫存的狀態（覆蓋預設層級）
            const applyFoldedPaths = (node, foldedPaths, path = "0") => {
                if (!node.payload) node.payload = {};
                node.payload.fold = foldedPaths.includes(path) ? 1 : 0;
                if (node.children) {
                    node.children.forEach((c, i) => applyFoldedPaths(c, foldedPaths, `${path}-${i}`));
                }
            };
            applyFoldedPaths(root, savedViewState.foldedPaths);
        } else if (optionsRaw.initialExpandLevel !== undefined && (optionsChanged || !mm)) {
            // 若沒有暫存，則套用設定好的層級展開機制
            const level = optionsRaw.initialExpandLevel;
            const applyExpand = (node, currentDepth) => {
                if (!node.payload) node.payload = {};
                node.payload.fold = currentDepth >= level ? 1 : 0;
                if (node.children) {
                    node.children.forEach((c, i) => applyExpand(c, currentDepth + 1));
                }
            };
            applyExpand(root, 0);
        }

        // 防呆：確保顏色設定能被支援
        if (!finalOptions.color && optionsRaw.colorFreezeLevel !== undefined) {
            const freezeLevel = optionsRaw.colorFreezeLevel;
            // 使用榮總風格的醫療配色 (深藍、亮藍、藍綠、橘、紅、淺青等)
            const colors = ['#00508C', '#00A0E9', '#00B2A9', '#F39200', '#E60012', '#71C5E8', '#C4D600', '#8A8D8F'];
            finalOptions.color = (node) => colors[Math.min(node.depth, freezeLevel) % colors.length];
        }

        // 3. 渲染心智圖
        if (!mm) {
            // 第一次初始化
            currentOptionsStr = optionsStr;
            mm = Markmap.create(svgEl, finalOptions, root);

            if (isInitialLoad && savedViewState && savedViewState.transform) {
                // 恢復縮放與平移狀態
                const t = savedViewState.transform;
                // 利用 d3 API 將狀態還原
                const d3Transform = window.d3.zoomIdentity.translate(t.x, t.y).scale(t.k);
                setTimeout(() => {
                    window.d3.select(svgEl).call(mm.zoom.transform, d3Transform);
                }, 50); // 稍微延遲讓 D3 與 Markmap 初始化完畢

                isFitted = savedViewState.isFitted || false;
                fitText.innerText = isFitted ? '恢復視角' : '適應螢幕';
                if (!isFitted) prevTransform = t; // 若非適應螢幕，把它當作先前視角記下來
            } else {
                mm.fit();
                isFitted = true;
                fitText.innerText = '恢復視角';
            }
        } else if (optionsChanged) {
            // 當使用者更改上方的 yaml 或 UI 設定時，砍掉重練以確保設定完美生效
            currentOptionsStr = optionsStr;
            mm.destroy();
            svgEl.innerHTML = '';
            mm = Markmap.create(svgEl, finalOptions, root);
            mm.fit();
            isFitted = true;
            fitText.innerText = '恢復視角';
            prevTransform = null;
        } else {
            // 一般文字編輯：單純更新資料，保留使用者自己手動滑動、點開的狀態
            mm.setData(root);
        }
    } catch (error) {
        console.error("渲染心智圖時發生錯誤:", error);
    }
};

// 防抖函數 (Debounce)，避免使用者輸入太快時造成效能問題
let timeout;
let saveTimeout; // 控制提示文字消失的計時器
const debounceUpdate = (markdown, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(markdown, isInitialLoad);

        if (!isInitialLoad) {
            // 【新增功能】自動暫存到 localStorage
            localStorage.setItem('vghtpe_markmap_content', markdown);

            // 顯示「已自動儲存」提示，2秒後淡出
            if (saveStatus) {
                saveStatus.classList.remove('opacity-0');
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    saveStatus.classList.add('opacity-0');
                }, 2000);
            }
        }
    }, isInitialLoad ? 0 : 300); // 初始載入時不需要延遲
};

// 監聽編輯器輸入事件
editor.addEventListener('input', (e) => {
    debounceUpdate(e.target.value);
});

// 監聽清除所有內容按鈕
if (btnClearEditor) {
    btnClearEditor.addEventListener('click', async () => {
        const confirmed = await showModal(
            '清除內容',
            '確定要清除編輯區的所有內容嗎？（清除後您可以重新輸入）',
            { confirmText: '確定清除', confirmColor: 'bg-red-500 hover:bg-red-600' }
        );
        if (confirmed) {
            editor.value = '';
            debounceUpdate('');
            editor.focus();
        }
    });
}

// 監聽匯入檔案按鈕
if (btnImportFile && fileImport) {
    btnImportFile.addEventListener('click', () => {
        fileImport.click(); // 觸發隱藏的 file input
    });

    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            // 若編輯器內有東西的話，詢問是否覆蓋當前內容
            if (editor.value.trim() !== '') {
                const confirmed = await showModal(
                    '匯入檔案',
                    '匯入檔案將會覆蓋當前編輯區的所有內容，是否繼續？',
                    { confirmText: '確定覆蓋', confirmColor: 'bg-indigo-500 hover:bg-indigo-600' }
                );
                if (!confirmed) {
                    fileImport.value = '';
                    return;
                }
            }
            editor.value = content;
            debounceUpdate(content);
            // 清空 value 確保下次選同一個檔案也能觸發 change 事件
            fileImport.value = '';
        };
        reader.onerror = async (error) => {
            console.error('檔案讀取失敗:', error);
            await showModal('錯誤', '檔案讀取失敗，請重試！', { isAlert: true, confirmColor: 'bg-red-500 hover:bg-red-600' });
        };
        // 讀取檔案內容為文字
        reader.readAsText(file);
    });
}

// 監聽頂部下拉選單的變更事件，一旦變更立刻強制更新畫面
selExpand.addEventListener('change', () => debounceUpdate(editor.value));
selColor.addEventListener('change', () => debounceUpdate(editor.value));

// 處理編輯器內的 Tab 鍵，使其輸入縮排而不是切換焦點
editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;

        // 插入兩個空白作為縮排
        this.value = this.value.substring(0, start) + "  " + this.value.substring(end);

        // 將游標移到插入的空白後
        this.selectionStart = this.selectionEnd = start + 2;

        // 觸發更新
        debounceUpdate(this.value);
    }
});

// 監聽「適應螢幕」與「恢復視角」切換按鈕
btnFit.addEventListener('click', () => {
    if (!mm) return;

    if (isFitted && prevTransform) {
        // 恢復使用者前一個記憶的視角位置與縮放大小
        window.d3.select(svgEl).transition().duration(300).call(mm.zoom.transform, prevTransform);
        isFitted = false;
        fitText.innerText = '適應螢幕';
    } else {
        // 記錄當下的視角狀態 (利用 D3 的 zoomTransform) 並執行適應螢幕
        prevTransform = window.d3.zoomTransform(svgEl);
        mm.fit();
        isFitted = true;
        fitText.innerText = '恢復視角';
    }
    debounceSaveViewState(); // 按下按鈕後儲存狀態
});

// 初次載入時渲染預設內容或讀取先前的暫存內容
const savedContent = localStorage.getItem('vghtpe_markmap_content');
if (savedContent) {
    editor.value = savedContent;
}
debounceUpdate(editor.value, true); // 標記為初次載入，並觸發渲染與還原視角