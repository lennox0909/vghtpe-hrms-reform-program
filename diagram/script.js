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

// --- 比例調整 ---
let isResizing = false;
resizer.addEventListener('mousedown', () => isResizing = true);
document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerRect = mainContainer.getBoundingClientRect();
    let newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newWidthPercent > 15 && newWidthPercent < 85) {
        editorPane.style.width = `${newWidthPercent}%`;
    }
});
document.addEventListener('mouseup', () => isResizing = false);

// --- 隱藏編輯區 ---
const editorToggleBtn = document.getElementById('editorToggleBtn');
const sidebarOpenIcon = document.getElementById('sidebarOpenIcon');
const sidebarClosedIcon = document.getElementById('sidebarClosedIcon');
let isEditorVisible = true;

editorToggleBtn.addEventListener('click', () => {
    isEditorVisible = !isEditorVisible;
    editorPane.style.display = isEditorVisible ? '' : 'none';
    resizer.style.display = isEditorVisible ? '' : 'none';
    sidebarOpenIcon.classList.toggle('hidden', !isEditorVisible);
    sidebarClosedIcon.classList.toggle('hidden', isEditorVisible);
});

// --- 讀取外部檔案 ---
async function loadDefaultContent() {
    try {
        const response = await fetch('sample.md');
        if (!response.ok) throw new Error('無法讀取 sample.md');
        return await response.text();
    } catch (err) {
        console.error('載入預設內容失敗:', err);
        return '# 載入失敗\n請檢查 sample.md 是否存在。';
    }
}

// --- 檔案匯入/匯出 ---
document.getElementById('import-btn').onclick = () => document.getElementById('import-input').click();
document.getElementById('import-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        editor.value = ev.target.result;
        renderContent();
        showToast(`已匯入：${file.name}`);
    };
    reader.readAsText(file);
};

async function exportFile(ext) {
    const blob = new Blob([editor.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已匯出為 .${ext}`);
}
document.getElementById('export-md-btn').onclick = () => exportFile('md');
document.getElementById('export-txt-btn').onclick = () => exportFile('txt');

// --- 渲染邏輯 ---
async function renderContent() {
    const rawText = editor.value || '';
    preview.innerHTML = marked.parse(rawText.replace(/\u00A0/g, ' '));

    const codeBlocks = preview.querySelectorAll('code.language-mermaid');
    codeBlocks.forEach((block) => {
        const pre = block.parentElement;
        const container = document.createElement('div');
        container.className = 'mermaid-wrapper group relative my-8 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all hover:shadow-md flex flex-col items-center';
        const mDiv = document.createElement('div');
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
    } catch (err) { console.error(err); }
}

function attachToolbars() {
    document.querySelectorAll('.mermaid-wrapper').forEach((container, i) => {
        if (container.querySelector('.toolbar')) return;
        const svg = container.querySelector('svg');
        if (!svg) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'toolbar absolute top-3 right-3 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-20';
        
        const bDlSvg = document.createElement('button');
        bDlSvg.className = 'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 flex items-center gap-1';
        bDlSvg.innerHTML = '<span class="text-[10px] font-bold">SVG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        bDlSvg.onclick = () => {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n' + svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chart-${i+1}.svg`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("SVG 下載成功");
        };

        toolbar.append(bDlSvg);
        container.appendChild(toolbar);
    });
}

// 監聽輸入
editor.addEventListener('input', () => {
    renderContent();
    localStorage.setItem(STORAGE_KEY, editor.value);
    saveStatus.style.opacity = '1';
    setTimeout(() => saveStatus.style.opacity = '0', 1000);
});

clearBtn.onclick = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100]';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-sm w-full mx-4">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">確定要清空嗎？</h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6">此操作將移除所有目前編輯的內容且無法復原。</p>
            <div class="flex justify-end gap-3">
                <button id="cancelClear" class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">取消</button>
                <button id="confirmClear" class="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">確定清空</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('cancelClear').onclick = () => modal.remove();
    document.getElementById('confirmClear').onclick = () => {
        editor.value = '';
        localStorage.removeItem(STORAGE_KEY);
        renderContent();
        modal.remove();
        showToast("已清空內容", "warning");
    };
};

// --- 初始化啟動 ---
async function init() {
    updateTheme(true);
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
        editor.value = saved;
    } else {
        // 如果沒有暫存，則從 sample.md 抓取
        editor.value = await loadDefaultContent();
    }
    
    renderContent();
}

init();