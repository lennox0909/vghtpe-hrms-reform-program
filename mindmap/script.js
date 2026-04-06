
import * as markmapLib from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm';
import * as markmapView from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm';
import * as markmapCommon from 'https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm';

// 將方法合併到全域變數
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

let isFitted = false;
let prevTransform = null;
let isEditorVisible = true;

// --- 收合/展開編輯區邏輯 ---
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

// --- 自訂 Modal 邏輯 ---
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

// --- 視覺狀態 (View State) 儲存邏輯 ---
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

// --- 面板拖曳調整大小 (Resizer) 邏輯 ---
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
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchend', stopResize);

    if (mm) {
        setTimeout(() => {
            mm.fit();
            debounceSaveViewState();
        }, 50);
    }
};

resizer.addEventListener('mousedown', startResize);
resizer.addEventListener('touchstart', startResize, { passive: false });

let lastIsDesktop = window.innerWidth >= 768;
window.addEventListener('resize', () => {
    const currentIsDesktop = window.innerWidth >= 768;
    if (lastIsDesktop !== currentIsDesktop) {
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

const resetFitState = () => {
    if (isFitted) {
        isFitted = false;
        fitText.innerText = '適應螢幕';
    }
    debounceSaveViewState();
};
svgEl.addEventListener('mousedown', resetFitState);
svgEl.addEventListener('wheel', resetFitState);
svgEl.addEventListener('touchstart', resetFitState);

// --- 匯出與下載功能區塊 ---
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
        if (err.name === 'AbortError') return;
        console.warn('受限於 iframe 安全政策，退回傳統下載模式:', err.message);
        fallbackDownload();
    }
};

btnDownloadMd.addEventListener('click', async () => {
    const markdownContent = editor.value;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    await saveFile(blob, 'markmap-mindmap.md', 'Markdown 檔案', { 'text/markdown': ['.md', '.markdown'] });
});

btnDownload.addEventListener('click', async () => {
    const endTag = '<' + '/script>';
    const scriptRegex = new RegExp(endTag, 'gi');
    const uiColor = parseInt(selColor.value, 10);
    let finalMdForExport = editor.value.replace(scriptRegex, '&lt;/script&gt;').replace(/\xA0/g, ' ');

    const getFoldedPaths = (node, path = "0", folded = []) => {
        if (node && node.payload && node.payload.fold === 1) folded.push(path);
        if (node && node.children) {
            node.children.forEach((c, i) => getFoldedPaths(c, `${path}-${i}`, folded));
        }
        return folded;
    };
    const currentFoldedPaths = currentRoot ? getFoldedPaths(currentRoot) : [];
    const foldedPathsJson = JSON.stringify(currentFoldedPaths);
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
        '            const transformData = ' + transformJson + ';',
        '            const d3Transform = d3.zoomIdentity.translate(transformData.x, transformData.y).scale(transformData.k);',
        '            d3.select(svgEl).call(mm.zoom.transform, d3Transform);',
        '            ',
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

btnDownloadSvg.addEventListener('click', async () => {
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    const style = document.createElement('style');
    style.textContent = `
                .markmap-link { fill: none; }
                .markmap-node circle { cursor: pointer; }
                foreignObject { overflow: visible; }
                svg { background-color: #ffffff; color: #1f2937; font-family: sans-serif; }
                code { background-color: #f3f4f6; border-radius: 4px; padding: 2px 4px; }
            `;
    clone.insertBefore(style, clone.firstChild);
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    await saveFile(blob, 'markmap-mindmap.svg', 'SVG 圖片檔案', { 'image/svg+xml': ['.svg'] });
});

// --- 核心更新函數 ---
const updateMindmap = async (markdown, isInitialLoad = false) => {
    try {
        const safeMarkdown = markdown.replace(/\xA0/g, ' ');
        const { root, features, frontmatter } = transformer.transform(safeMarkdown);
        currentRoot = root;

        const { styles, scripts } = transformer.getUsedAssets(features);
        if (styles) loadCSS(styles);
        if (scripts) {
            await loadJS(scripts, { getMarkmap: () => window.markmap });
        }

        const optionsRaw = frontmatter?.markmap || {};
        const uiExpand = parseInt(selExpand.value, 10);
        const uiColor = parseInt(selColor.value, 10);

        if (uiExpand !== -1) optionsRaw.initialExpandLevel = uiExpand;
        if (uiColor !== -1) optionsRaw.colorFreezeLevel = uiColor;

        const optionsStr = JSON.stringify(optionsRaw);
        const optionsChanged = currentOptionsStr !== optionsStr;

        let finalOptions = typeof deriveOptions === 'function' ? deriveOptions(optionsRaw) : {};

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

        if (isInitialLoad && savedViewState && savedViewState.foldedPaths) {
            const applyFoldedPaths = (node, foldedPaths, path = "0") => {
                if (!node.payload) node.payload = {};
                node.payload.fold = foldedPaths.includes(path) ? 1 : 0;
                if (node.children) {
                    node.children.forEach((c, i) => applyFoldedPaths(c, foldedPaths, `${path}-${i}`));
                }
            };
            applyFoldedPaths(root, savedViewState.foldedPaths);
        } else if (optionsRaw.initialExpandLevel !== undefined && (optionsChanged || !mm)) {
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

        if (!finalOptions.color && optionsRaw.colorFreezeLevel !== undefined) {
            const freezeLevel = optionsRaw.colorFreezeLevel;
            const colors = ['#00508C', '#00A0E9', '#00B2A9', '#F39200', '#E60012', '#71C5E8', '#C4D600', '#8A8D8F'];
            finalOptions.color = (node) => colors[Math.min(node.depth, freezeLevel) % colors.length];
        }

        if (!mm) {
            currentOptionsStr = optionsStr;
            mm = Markmap.create(svgEl, finalOptions, root);

            if (isInitialLoad && savedViewState && savedViewState.transform) {
                const t = savedViewState.transform;
                const d3Transform = window.d3.zoomIdentity.translate(t.x, t.y).scale(t.k);
                setTimeout(() => {
                    window.d3.select(svgEl).call(mm.zoom.transform, d3Transform);
                }, 50);

                isFitted = savedViewState.isFitted || false;
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
            prevTransform = null;
        } else {
            mm.setData(root);
        }
    } catch (error) {
        console.error("渲染心智圖時發生錯誤:", error);
    }
};

let timeout;
let saveTimeout;
const debounceUpdate = (markdown, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(markdown, isInitialLoad);

        if (!isInitialLoad) {
            localStorage.setItem('vghtpe_markmap_content', markdown);
            if (saveStatus) {
                saveStatus.classList.remove('opacity-0');
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    saveStatus.classList.add('opacity-0');
                }, 2000);
            }
        }
    }, isInitialLoad ? 0 : 300);
};

editor.addEventListener('input', (e) => {
    debounceUpdate(e.target.value);
});

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

if (btnImportFile && fileImport) {
    btnImportFile.addEventListener('click', () => {
        fileImport.click();
    });

    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
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
            fileImport.value = '';
        };
        reader.onerror = async (error) => {
            console.error('檔案讀取失敗:', error);
            await showModal('錯誤', '檔案讀取失敗，請重試！', { isAlert: true, confirmColor: 'bg-red-500 hover:bg-red-600' });
        };
        reader.readAsText(file);
    });
}

selExpand.addEventListener('change', () => debounceUpdate(editor.value));
selColor.addEventListener('change', () => debounceUpdate(editor.value));

editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        debounceUpdate(this.value);
    }
});

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

// --- 啟動邏輯：改為讀取 sample.md ---
const initEditor = () => {
    const savedContent = localStorage.getItem('vghtpe_markmap_content');
    if (savedContent) {
        // 如果本地有暫存，優先使用暫存
        editor.value = savedContent;
        debounceUpdate(editor.value, true);
    } else {
        // 嘗試使用 fetch 讀取同目錄下的 sample.md
        fetch('sample.md')
            .then(response => {
                if (!response.ok) throw new Error('找不到檔案或網路錯誤');
                return response.text();
            })
            .then(text => {
                editor.value = text;
                debounceUpdate(text, true);
            })
            .catch(err => {
                console.warn('無法讀取 sample.md (可能受限於本地測試環境的 CORS 或預覽框架限制)。', err);
                // 防呆機制：若 fetch 失敗（例如直接點擊 html 檔案而未起 server 時），給予基礎提示文字
                const fallbackText = "# 臺北榮民總醫院\n## 載入失敗\n1. 請確認 `sample.md` 與此檔案放在同一個資料夾。\n2. 若您是直接點開 HTML 檔案，瀏覽器可能會阻擋讀取本地檔案。請透過 Live Server 等伺服器方式開啟。\n3. 您也可以直接在此編輯或點擊右上方「匯入檔案」。";
                editor.value = fallbackText;
                debounceUpdate(fallbackText, true);
            });
    }
};

// 執行啟動
initEditor();