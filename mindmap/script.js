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

// 預設 Markdown 內容 (原 HTML 中的範例)
const DEFAULT_MARKDOWN = `
---
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
3. 內分泌新陳代謝科
4. 過敏免疫風濕科
5. 腎臟科
6. 感染科
7. 一般內科
8. 輸血醫學科
9. 全人整合醫學科
10. 內視鏡診斷治療科

### 外科部（62）
1. 一般外科
2. 胸腔外科
3. 大腸直腸外科
4. 重建整形外科
5. 兒童外科
6. 實驗外科
7. 移植外科
8. 乳房外科

### 骨科部（63）
1. 骨折創傷科
2. 關節重建科
3. 運動醫學科
4. 手外科
5. 兒童骨科
6. 脊椎外科

### 胸腔部（64）
1. 一般胸腔科
2. 呼吸感染免疫科
3. 臨床呼吸生理科
4. 呼吸治療科
5. 胸腔腫瘤科

### 婦女醫學部（65）
1. 婦科
2. 高危險妊娠暨產科
3. 生殖內分泌不孕症科
4. 遺傳優生學科
5. 婦癌科

### 兒童醫學部（66）
1. 兒童神經暨一般兒科
2. 兒童心臟科
3. 兒童胃腸科
4. 兒童免疫腎臟科
5. 新生兒科
6. 兒童遺傳內分泌科
7. 兒童感染科
8. 兒童血液腫瘤科

### 復健醫學部（67）
1. 一般復健科
2. 神經復健科
3. 骨骼關節復健科

### 影像診療部（68）
1. 心肺影像診療科
2. 血管介入影像診療科
3. 腹部影像診療科
4. 肌肉骨骼影像診療科
5. 神經影像診療科
6. 兒童暨急診影像診療科
7. 超音波暨乳房影像診療科
8. 磁振影像診療科

### 核醫部（69）
1. 核子醫學科
2. 放射免疫暨同位素治療科
3. 放射製藥科
4. 醫事放射科
5. 正子影像科

### 營養部（70）
1. 臨床營養科
2. 膳食管理科

### 神經醫學中心（71）
1. 一般神經科
2. 腦血管科
3. 週邊神經科
4. 癲癇科
5. 一般神經外科
6. 功能性神經外科
7. 兒童神經外科
8. 神經重症加護科
9. 神經修復科

### 精神醫學部（72）
1. 成人精神科
2. 兒童青少年精神科
3. 老年精神科
4. 社區復健精神科
5. 心身醫學科

### 急診部（73）
1. 急診醫學科
2. 外傷醫學科
3. 災難醫學科
4. 急診加護科

### 口腔醫學部（74）
1. 贗復牙科
2. 家庭牙醫科
3. 牙髓病科
4. 牙周病科
5. 兒童牙科暨特殊需要者牙科
6. 齒顎矯正科
7. 口腔顎面外科

### 眼科部（75）
1. 一般眼科
2. 眼矯形重建科
3. 眼肌神經科
4. 青光眼科
5. 視網my網膜科

### 耳鼻喉頭頸醫學部（76）
1. 耳科
2. 鼻頭頸科
3. 喉頭頸科

### 腫瘤醫學部（77）
1. 腫瘤內科
2. 細胞免疫治療科
3. 癌症防治科

### 皮膚部（78）
1. 皮膚診斷科
2. 光化學治療科

### 重症醫學部（79）
1. 重症加護內科
2. 重症加護外科

### 病理檢驗部（80）
1. 一般病理科
2. 外科病理科
3. 細胞病理科
4. 分子病理科
5. 核心檢驗科
6. 感染症檢驗科科
7. 品保科

### 藥學部（81）
1. 調劑科
2. 製劑科
3. 臨床藥學科

### 護理部（82）


### 教學部（83）
1. 醫學圖書組
2. 教學行政組
3. 臨床技術訓練科
4. 教師培育科
5. 實證醫學科

### 家庭醫學部（84）
1. 家庭醫學科
2. 安寧緩和醫學科
3. 社區醫學科

### 傳統醫學部（85）
1. 整合醫學科
2. 一般中醫科

### 醫學研究部（86）
1. 基礎研究科
2. 轉譯研究科
3. 臨床研究科
4. 臨床試驗科
5. 技術移轉組

### 健康管理中心（87）
1. 一般健檢科
2. 健康管理科
3. 實驗檢查科

### 麻醉部（88）
1. 一般麻醉科
2. 神經麻醉科
3. 婦幼麻醉科
4. 胸腔心臟麻醉科
5. 疼痛控制科

### 感染管制中心（89）
1. 感染疫情監測科
2. 環境風險管制科
3. 感管資訊應用科

### 身障重建中心（90）
1. 身障醫療科
2. 臨床輔具科
3. 推廣組

### 高齡醫學中心（91）
1. 高齡醫學科
2. 研發推展科

### 泌尿部（92）
1. 一般暨泌尿腫瘤科
2. 婦幼泌尿科
3. 男性生殖科

### 醫務企管部（93）
1. 醫務企劃組
2. 績效管理組
3. 醫療事務組
4. 病歷資訊管理組
5. 醫療費用組
6. 法務組

### 職業安全衛生室（94）
1. 環境保護組
2. 職業安全衛生組

### 品質管理中心(95)
1. 醫療品質管理科
2. 病人安全管理科
3. 品質資訊管理科
4. 醫學人體研究品質管理科
5. 醫學倫理品質管理科

### 職業醫學及臨床毒物部(96)
1. 職業醫學科
2. 臨床毒物科

### 重粒子及放射腫瘤部(97)
1. 光子治療科
2. 重粒子治療科
3. 實驗放射治療科

### 心臟血管中心(98)
1. 一般心臟內科
2. 心血管介入治療科
3. 心電生理暨心律不整治療科
4. 心血管急重症暨心臟衰竭科
5. 結構性心臟疾病治療科
6. 心臟外科
7. 主動脈及周邊血管治療科

### 國際醫療中心(99)
1. 國際醫療服務科
2. 醫學合作推展科
3. 國際醫療規劃科

### 社會工作室（60）
1. 社會工作組
2. 輔導組

## 輔助單位
### 公共事務室（02）
1. 公共關係組
2. 國會聯絡組
3. 秘書組

### 工務室（06）
1. 設計施工組
2. 公用設備組
3. 修護保養組

### 補給室（07）
1. 採購組
2. 資財組
3. 配發組

### 醫學工程室（08）
1. 醫工研展組
2. 儀器系統組
3. 儀器保修組

### 總務室（15）
1. 出納組
2. 事務組
3. 文書組

### 資訊室（25）
1. 應用發展一組
2. 應用發展二組
3. 系統操作組
4. 技術網路組
5. 資訊安全組

### 人事室（10）
1. 任免組
2. 考核組
3. 資料組

### 主計室（12）
1. 歲計組
2. 稽核組
3. 會計組
4. 成本組

### 政風室（55）
1. 政風預防組
2. 政風查處組
3. 安全防護組


`;

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

// 初始化載入內容：優先讀取暫存，若無則使用 DEFAULT_MARKDOWN
const savedContent = localStorage.getItem('vghtpe_markmap_content');
editor.value = savedContent || DEFAULT_MARKDOWN;
debounceUpdate(editor.value, true);