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

let mm;
let currentRoot = null;
let currentOptionsStr = '';
let isFitted = false;
let prevTransform = null;
let isEditorVisible = true;

// UI 元素
const editor = document.getElementById('editor');
const svgEl = document.getElementById('mindmap');
const selExpand = document.getElementById('sel-expand');
const selColor = document.getElementById('sel-color');
const btnToggleEditor = document.getElementById('btn-toggle-editor');
const editorPane = document.getElementById('editor-pane');
const resizer = document.getElementById('resizer');
const btnFit = document.getElementById('btn-fit');
const fitText = document.getElementById('fit-text');
const saveStatus = document.getElementById('save-status');

// ==========================================
// 核心更新函數
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

    // 處理視角與折疊還原
    let savedViewState = null;
    if (isInitialLoad) {
      const stateStr = localStorage.getItem('vghtpe_markmap_viewstate');
      if (stateStr) savedViewState = JSON.parse(stateStr);
    }

    if (isInitialLoad && savedViewState && savedViewState.foldedPaths) {
      const applyFoldedPaths = (node, paths, path = "0") => {
        if (!node.payload) node.payload = {};
        node.payload.fold = paths.includes(path) ? 1 : 0;
        if (node.children) node.children.forEach((c, i) => applyFoldedPaths(c, paths, `${path}-${i}`));
      };
      applyFoldedPaths(root, savedViewState.foldedPaths);
    } else if (optionsRaw.initialExpandLevel !== undefined && (optionsChanged || !mm)) {
      const level = optionsRaw.initialExpandLevel;
      const applyExpand = (node, depth) => {
        if (!node.payload) node.payload = {};
        node.payload.fold = depth >= level ? 1 : 0;
        if (node.children) node.children.forEach(c => applyExpand(c, depth + 1));
      };
      applyExpand(root, 0);
    }

    // 顏色設定
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
        setTimeout(() => window.d3.select(svgEl).call(mm.zoom.transform, d3Transform), 50);
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
    } else {
      mm.setData(root);
    }
  } catch (e) { console.error(e); }
};

// ==========================================
// 事件監聽與功能
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

editor.addEventListener('input', (e) => debounceUpdate(e.target.value));

// 收合編輯區
btnToggleEditor.addEventListener('click', () => {
  isEditorVisible = !isEditorVisible;
  editorPane.style.display = isEditorVisible ? '' : 'none';
  resizer.style.display = isEditorVisible ? '' : 'none';
  if (mm) setTimeout(() => mm.fit(), 50);
});

// 適應螢幕
btnFit.addEventListener('click', () => {
  if (!mm) return;
  if (isFitted && prevTransform) {
    const d3Transform = window.d3.zoomIdentity.translate(prevTransform.x, prevTransform.y).scale(prevTransform.k);
    window.d3.select(svgEl).transition().duration(300).call(mm.zoom.transform, d3Transform);
    isFitted = false;
    fitText.innerText = '適應螢幕';
  } else {
    prevTransform = window.d3.zoomTransform(svgEl);
    mm.fit();
    isFitted = true;
    fitText.innerText = '恢復視角';
  }
});

// 下載功能 (簡化範例)
document.getElementById('btn-download-md').addEventListener('click', () => {
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mindmap.md'; a.click();
});

// 初始化
const savedContent = localStorage.getItem('vghtpe_markmap_content');
if (savedContent) editor.value = savedContent;
debounceUpdate(editor.value, true);
