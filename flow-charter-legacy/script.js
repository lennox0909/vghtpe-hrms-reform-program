// 初始化 Mermaid，使用 'neutral' 中性主題帶來更好的粉彩色調對比度
mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
    themeVariables: {
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }
});

// 系統狀態
let state = {
    nodes: [
        { id: 'node_1', x: 200, y: 150, text: '開始' },
        { id: 'node_2', x: 200, y: 300, text: '結束' }
    ],
    edges: [
        { id: 'edge_1', source: 'node_1', target: 'node_2', text: '' }
    ],
    nodeCounter: 2,
    edgeCounter: 1,
    selectedId: null, // 選取的節點或連線 ID
    selectedType: null, // 'node' 或 'edge'
    isVisualMode: true,
    isRendering: false // 避免重複渲染的鎖定狀態
};

// DOM 元素
const workspace = document.getElementById('workspace');
const svgLayer = document.getElementById('svg-layer');
const mermaidCodeInput = document.getElementById('mermaidCode');
const diagramTypeSelect = document.getElementById('diagramType');
const deleteBtn = document.getElementById('deleteBtn');
const overlayMsg = document.getElementById('overlayMsg');

// 拖拉連線用的暫時變數
let dragState = {
    isDraggingNode: false,
    isDrawingEdge: false,
    nodeId: null,
    startX: 0, startY: 0,
    tempLine: null,
    longPressTimer: null // 長按計時器
};

// === 0. 本地快取 (Local Storage) 功能 ===
const STORAGE_KEY = 'mermaid_builder_state';

function saveWorkspace() {
    const dataToSave = {
        nodes: state.nodes,
        edges: state.edges,
        nodeCounter: state.nodeCounter,
        edgeCounter: state.edgeCounter,
        diagramType: diagramTypeSelect.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

function loadWorkspace() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            state.nodes = parsed.nodes || [];
            state.edges = parsed.edges || [];
            state.nodeCounter = parsed.nodeCounter || 0;
            state.edgeCounter = parsed.edgeCounter || 0;
            if (parsed.diagramType) {
                diagramTypeSelect.value = parsed.diagramType;
            }
        } catch (e) {
            console.error('Failed to load workspace from local storage', e);
        }
    }
    updateVisualModeStatus();
}

function updateVisualModeStatus() {
    const optGroup = diagramTypeSelect.options[diagramTypeSelect.selectedIndex].parentNode;
    if (optGroup.label.includes('僅支援範本')) {
        state.isVisualMode = false;
        workspace.style.opacity = '0.3';
        workspace.style.pointerEvents = 'none';
        overlayMsg.style.display = 'block';
    } else {
        state.isVisualMode = true;
        workspace.style.opacity = '1';
        workspace.style.pointerEvents = 'auto';
        overlayMsg.style.display = 'none';
    }
}

// === 1. 核心渲染與更新邏輯 ===

function getMarkerForType(type, isSelected) {
    if (type === 'classDiagram') return isSelected ? 'triangle-hollow-selected' : 'triangle-hollow';
    if (type === 'erDiagram') return isSelected ? 'crows-foot-selected' : 'crows-foot';
    return isSelected ? 'arrowhead-selected' : 'arrowhead';
}

// 將狀態渲染為 HTML/SVG 元素
function renderWorkspace() {
    if (!state.isVisualMode || state.isRendering) return;
    state.isRendering = true; // 鎖定渲染，避免無窮迴圈

    // 同步工作區的 CSS Class 以改變節點外觀
    const currentType = diagramTypeSelect.value;
    workspace.className = `type-${currentType.replace(/\s+/g, '-')}`;

    try {
        // 提前讓輸入框失去焦點，避免在移除 DOM 時觸發 blur 導致 Chrome 報錯 (NotFoundError)
        const activeInput = document.activeElement;
        if (activeInput && (activeInput.classList.contains('node-input') || activeInput.classList.contains('edge-input') || activeInput.classList.contains('edge-input-inline'))) {
            activeInput.blur();
        }

        // 清理現有節點與文字標籤 (保留 SVG)
        document.querySelectorAll('.canvas-node, .edge-label, .edge-edit-panel').forEach(n => n.remove());
        
        // 清理現有連線 (保留 defs)
        Array.from(svgLayer.children).forEach(child => {
            if (child.tagName === 'line') child.remove();
        });

        // 1. 先畫節點 (必須先掛載到 DOM，才能取得計算線條邊界所需的實際寬高)
        state.nodes.forEach(node => {
            const div = document.createElement('div');
            div.className = `canvas-node ${state.selectedId === node.id ? 'selected' : ''}`;
            div.id = node.id;
            div.style.left = node.x + 'px';
            div.style.top = node.y + 'px';

            // 上半部標題
            const titleDiv = document.createElement('div');
            titleDiv.className = 'node-title';
            titleDiv.innerText = node.text;
            div.appendChild(titleDiv);

            // 下半部屬性細節
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'node-details';
            
            // 根據圖表類型設定 details 文字
            let detailsText = '';
            if (currentType === 'architecture-beta') {
                // 自動轉換舊的不支援圖示為 Iconify 格式
                if (node.archType === 'mobile') node.archType = 'mdi:cellphone';
                if (node.archType === 'user') node.archType = 'mdi:account';
                
                node.archType = node.archType || 'server';
                detailsText = 'Type: ' + node.archType;
            } else {
                if (node.details === undefined) {
                    detailsText = currentType === 'classDiagram' ? '+ attribute\n+ method()' : (currentType === 'erDiagram' ? 'PK id\nstring name' : '');
                    node.details = detailsText;
                } else {
                    detailsText = node.details;
                }
            }
            detailsDiv.innerText = detailsText;
            div.appendChild(detailsDiv);

            // 連線觸發點 (Port)
            const port = document.createElement('div');
            port.className = 'port';
            // 開始畫線事件
            port.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                startDrawingEdge(node.id, e.clientX, e.clientY);
            });
            div.appendChild(port);

            // 節點互動事件
            div.addEventListener('pointerdown', (e) => {
                if (e.target === port || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
                e.stopPropagation();
                selectElement(node.id, 'node');
                startDraggingNode(node.id, e);
            });

            workspace.appendChild(div);
        });

        // 2. 畫連線與建立箭頭文字標籤
        state.edges.forEach(edge => {
            // 繪製 SVG 線條
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('id', edge.id);
            
            const isSelected = state.selectedId === edge.id;
            if (isSelected) line.classList.add('selected');
            
            // 根據圖表類型設定不同的箭頭
            const markerId = getMarkerForType(currentType, isSelected);
            line.setAttribute('marker-end', `url(#${markerId})`);
            
            // 點擊連線選取
            line.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                selectElement(edge.id, 'edge');
            });
            // 雙擊連線編輯文字
            line.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                enableEdgeEditing(edge, line);
            });
            
            svgLayer.appendChild(line);

            // 建立 HTML 文字標籤
            const labelDiv = document.createElement('div');
            labelDiv.className = `edge-label ${isSelected ? 'selected' : ''}`;
            labelDiv.id = `label_${edge.id}`;
            labelDiv.innerText = edge.text || '';
            labelDiv.style.display = edge.text ? 'block' : 'none'; // 無文字時隱藏，由雙擊喚醒
            
            // 點擊標籤選取
            labelDiv.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                selectElement(edge.id, 'edge');
            });
            // 雙擊標籤編輯
            labelDiv.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                enableEdgeEditing(edge, line);
            });
            
            workspace.appendChild(labelDiv);
        });

        // 3. 獨立計算並更新座標 (提升拖曳效能)
        updateEdgesPosition();

        updateMermaid();
    
    } finally {
        state.isRendering = false; // 渲染完成，解除鎖定
    }
}

// 獨立出的連線座標與標籤定位計算邏輯
function updateEdgesPosition() {
    state.edges.forEach(edge => {
        const sourceNode = state.nodes.find(n => n.id === edge.source);
        const targetNode = state.nodes.find(n => n.id === edge.target);
        
        const sourceDiv = document.getElementById(edge.source);
        const targetDiv = document.getElementById(edge.target);
        const line = document.getElementById(edge.id);
        const labelDiv = document.getElementById(`label_${edge.id}`);

        if (sourceNode && targetNode && sourceDiv && targetDiv && line) {
            // 取得節點實際寬高的一半
            const sW = sourceDiv.offsetWidth / 2;
            const sH = sourceDiv.offsetHeight / 2;
            const tW = targetDiv.offsetWidth / 2 + 12; // 目標退後 12px 給箭頭留空間
            const tH = targetDiv.offsetHeight / 2 + 12;

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;

            let x1 = sourceNode.x;
            let y1 = sourceNode.y;
            let x2 = targetNode.x;
            let y2 = targetNode.y;

            if (dx !== 0 || dy !== 0) {
                // 計算線段與矩形邊界的交點比例
                const sRatio = Math.min(sW / Math.abs(dx), sH / Math.abs(dy));
                const tRatio = Math.min(tW / Math.abs(dx), tH / Math.abs(dy));
                
                // 確保節點沒有嚴重重疊，避免線條反向
                if (sRatio + tRatio < 1) {
                    x1 = sourceNode.x + dx * sRatio;
                    y1 = sourceNode.y + dy * sRatio;
                    x2 = targetNode.x - dx * tRatio;
                    y2 = targetNode.y - dy * tRatio;
                }
            }

            // 設定線條座標
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);

            // 同步更新文字標籤 (定位在線段正中央)
            if (labelDiv && edge.text) {
                labelDiv.style.left = ((x1 + x2) / 2) + 'px';
                labelDiv.style.top = ((y1 + y2) / 2) + 'px';
            }
        }
    });
}

// === 2. 互動事件邏輯 (滑鼠/觸控) ===

function selectElement(id, type) {
    state.selectedId = id;
    state.selectedType = type;
    deleteBtn.disabled = false;
    
    // 移除所有選取狀態，避免重新渲染整個畫布
    document.querySelectorAll('.canvas-node, line, .edge-label').forEach(el => {
        el.classList.remove('selected');
        if (el.tagName === 'line') {
            const markerId = getMarkerForType(diagramTypeSelect.value, false);
            el.setAttribute('marker-end', `url(#${markerId})`);
        }
    });

    // 加入當前選取狀態 (包含線條與其標籤)
    if (type === 'node') {
        const selectedEl = document.getElementById(id);
        if (selectedEl) selectedEl.classList.add('selected');
    } else if (type === 'edge') {
        const selectedLine = document.getElementById(id);
        const selectedLabel = document.getElementById(`label_${id}`);
        if (selectedLine) {
            selectedLine.classList.add('selected');
            const markerId = getMarkerForType(diagramTypeSelect.value, true);
            selectedLine.setAttribute('marker-end', `url(#${markerId})`);
        }
        if (selectedLabel) selectedLabel.classList.add('selected');
    }
}

function deselectAll() {
    state.selectedId = null;
    state.selectedType = null;
    deleteBtn.disabled = true;
    
    document.querySelectorAll('.canvas-node, line, .edge-label').forEach(el => {
        el.classList.remove('selected');
        if (el.tagName === 'line') {
            const markerId = getMarkerForType(diagramTypeSelect.value, false);
            el.setAttribute('marker-end', `url(#${markerId})`);
        }
    });
}

// 背景點擊取消選取
workspace.addEventListener('pointerdown', (e) => {
    if (e.target === workspace || e.target === svgLayer) {
        deselectAll();
    }
});

// 拖拉節點
function startDraggingNode(id, e) {
    dragState.isDraggingNode = true;
    dragState.nodeId = id;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    
    // 啟動長按計時器 (設定為 600 毫秒)
    dragState.longPressTimer = setTimeout(() => {
        // 長按時間到：停止拖拉並進入編輯模式
        dragState.isDraggingNode = false;
        dragState.longPressTimer = null;
        if (e.pointerId) {
            try { workspace.releasePointerCapture(e.pointerId); } catch(err) {}
        }
        
        // 尋找最新的 DOM 元素並啟動編輯
        const node = state.nodes.find(n => n.id === id);
        const div = document.getElementById(id);
        if (div && node) {
            // 判斷按下的區域是標題還是屬性欄位
            const isDetails = e.target.classList.contains('node-details');
            enableNodeEditing(div, node, isDetails ? 'details' : 'title');
        }
    }, 600);

    if (e.pointerId) {
        try { workspace.setPointerCapture(e.pointerId); } catch(err) {} // 加入防呆
    }
}

// 畫連線
function startDrawingEdge(sourceId, clientX, clientY) {
    dragState.isDrawingEdge = true;
    dragState.nodeId = sourceId;
    
    const sourceNode = state.nodes.find(n => n.id === sourceId);
    
    // 建立暫存線
    dragState.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    dragState.tempLine.setAttribute('x1', sourceNode.x);
    dragState.tempLine.setAttribute('y1', sourceNode.y);
    dragState.tempLine.setAttribute('x2', sourceNode.x);
    dragState.tempLine.setAttribute('y2', sourceNode.y);
    dragState.tempLine.setAttribute('stroke', '#ff79c6'); // 暫時線顏色
    dragState.tempLine.setAttribute('stroke-width', '2');
    dragState.tempLine.setAttribute('stroke-dasharray', '5,5');
    dragState.tempLine.setAttribute('pointer-events', 'none');
    
    // 根據目前圖表套用暫存線箭頭
    const markerId = getMarkerForType(diagramTypeSelect.value, false);
    dragState.tempLine.setAttribute('marker-end', `url(#${markerId})`);
    
    svgLayer.appendChild(dragState.tempLine);
}

// 全域移動事件
window.addEventListener('pointermove', (e) => {
    if (dragState.isDraggingNode) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        
        // 如果移動距離超過 5px，則視為拖拉，取消長按判定
        if (dragState.longPressTimer && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            clearTimeout(dragState.longPressTimer);
            dragState.longPressTimer = null;
        }

        const node = state.nodes.find(n => n.id === dragState.nodeId);
        if (node) {
            node.x += dx;
            node.y += dy;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            
            // 高效更新：只移動當前節點與連線，不重新渲染整個畫布
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                nodeEl.style.left = node.x + 'px';
                nodeEl.style.top = node.y + 'px';
            }
            updateEdgesPosition();
        }
    } else if (dragState.isDrawingEdge) {
        // 更新暫存線位置
        const rect = workspace.getBoundingClientRect();
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        
        const sourceNode = state.nodes.find(n => n.id === dragState.nodeId);
        if (sourceNode) {
            const dx = targetX - sourceNode.x;
            const dy = targetY - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 為了避免游標擋住箭頭，讓終點往回退 12px
            let finalX = targetX;
            let finalY = targetY;
            if (dist > 12) {
                finalX = targetX - (dx / dist) * 12;
                finalY = targetY - (dy / dist) * 12;
            }

            dragState.tempLine.setAttribute('x2', finalX);
            dragState.tempLine.setAttribute('y2', finalY);
        }
    }
});

// 全域放開事件
window.addEventListener('pointerup', (e) => {
    // 放開時如果計時器還在，代表沒有按滿 600ms，清除計時器
    if (dragState.longPressTimer) {
        clearTimeout(dragState.longPressTimer);
        dragState.longPressTimer = null;
    }

    if (dragState.isDraggingNode) {
        dragState.isDraggingNode = false;
        saveWorkspace(); // 拖曳節點結束後自動存檔
    } else if (dragState.isDrawingEdge) {
        dragState.isDrawingEdge = false;
        if (dragState.tempLine) {
            dragState.tempLine.remove();
            dragState.tempLine = null;
        }
        
        // 檢查是否放開在某個節點上
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const targetNodeDiv = dropTarget ? dropTarget.closest('.canvas-node') : null;
        
        if (targetNodeDiv) {
            const targetId = targetNodeDiv.id;
            if (targetId !== dragState.nodeId) { // 不要連向自己
                // 檢查是否已存在相同的連線
                const exists = state.edges.some(edge =>
                    (edge.source === dragState.nodeId && edge.target === targetId)
                );
                if (!exists) {
                    state.edgeCounter++;
                    state.edges.push({
                        id: `edge_${state.edgeCounter}`,
                        source: dragState.nodeId,
                        target: targetId,
                        text: '' // 初始化連線文字為空
                    });
                    renderWorkspace();
                    saveWorkspace();
                }
            }
        }
    }
});

// 系統遭中斷時的安全防護
window.addEventListener('pointercancel', (e) => {
    if (dragState.longPressTimer) {
        clearTimeout(dragState.longPressTimer);
        dragState.longPressTimer = null;
    }
    dragState.isDraggingNode = false;
    dragState.isDrawingEdge = false;
    if (dragState.tempLine) {
        dragState.tempLine.remove();
        dragState.tempLine = null;
    }
    if (e.pointerId) {
        try { workspace.releasePointerCapture(e.pointerId); } catch(err) {}
    }
});

// 節點：長按編輯文字 (動態區分 title 或 details)
function enableNodeEditing(div, node, targetField) {
    const isDetails = targetField === 'details';
    const isArchMode = isDetails && diagramTypeSelect.value === 'architecture-beta';
    
    const spanToHide = div.querySelector(isDetails ? '.node-details' : '.node-title');
    spanToHide.style.display = 'none';

    let input;
    if (isArchMode) {
        // 架構圖使用下拉選單
        input = document.createElement('select');
        input.className = 'node-input';
        input.style.padding = '5px';
        input.style.backgroundColor = 'var(--node-bg)';
        
        // 使用 Iconify 支援的標籤 (例如 mdi:) 取代原本不支援的 mobile/user
        ['server', 'database', 'disk', 'cloud', 'internet', 'mdi:cellphone', 'mdi:account', 'mdi:laptop'].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t;
            input.appendChild(opt);
        });
        input.value = node.archType || 'server';
    } else {
        // 其他圖表使用文字框
        input = document.createElement(isDetails ? 'textarea' : 'input');
        if (!isDetails) input.type = 'text';
        input.value = isDetails ? (node.details || '') : node.text;
        input.className = isDetails ? 'node-textarea' : 'node-input';
    }
    
    div.insertBefore(input, spanToHide);
    input.focus();
    if (!isDetails && !isArchMode) input.select();

    // 即時寫入狀態
    input.addEventListener('input', () => {
        if (isArchMode) {
            node.archType = input.value;
        } else if (isDetails) {
            node.details = input.value;
        } else {
            node.text = input.value || ' ';
        }
    });

    const saveText = () => {
        if (isArchMode) {
            node.archType = input.value;
        } else if (isDetails) {
            node.details = input.value;
        } else if (input.value.trim() !== '') {
            node.text = input.value.trim();
        }
        
        // 如果 input 還在 DOM 裡面才去移除並重新渲染
        if (input.parentNode) {
            input.remove();
            spanToHide.innerText = isArchMode ? 'Type: ' + node.archType : (isDetails ? node.details : node.text);
            spanToHide.style.display = 'block';
            renderWorkspace();
            saveWorkspace();
        }
    };

    input.addEventListener('blur', saveText);
    input.addEventListener('keydown', (e) => {
        // Title 欄位按 Enter 儲存，Textarea 欄位按 Esc 儲存退出 (保留 Enter 換行)
        if (!isDetails && e.key === 'Enter') {
            input.blur();
        } else if (isDetails && e.key === 'Escape') {
            input.blur();
        }
    });
}

// 連線：雙擊編輯箭頭文字標籤或刪除連線
function enableEdgeEditing(edge, lineElement) {
    // 隱藏舊的標籤，避免重疊
    const labelDiv = document.getElementById(`label_${edge.id}`);
    if (labelDiv) labelDiv.style.display = 'none';

    // 取得目前線條中間點，把輸入框彈出來
    const x1 = parseFloat(lineElement.getAttribute('x1'));
    const y1 = parseFloat(lineElement.getAttribute('y1'));
    const x2 = parseFloat(lineElement.getAttribute('x2'));
    const y2 = parseFloat(lineElement.getAttribute('y2'));
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const panel = document.createElement('div');
    panel.className = 'edge-edit-panel';
    panel.style.left = midX + 'px';
    panel.style.top = midY + 'px';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = edge.text || '';
    input.className = 'edge-input-inline';
    input.placeholder = '輸入箭頭標籤...';

    const delBtn = document.createElement('button');
    delBtn.className = 'edge-del-btn';
    delBtn.innerText = '🗑️ 刪除';

    panel.appendChild(input);
    panel.appendChild(delBtn);
    workspace.appendChild(panel);
    
    input.focus();
    input.select();

    let isDeleted = false;

    // 點擊刪除按鈕
    delBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault(); // 避免觸發 input 的 blur 導致提早儲存關閉
        isDeleted = true;
        state.edges = state.edges.filter(e => e.id !== edge.id);
        if (state.selectedId === edge.id) deselectAll();
        panel.remove();
        renderWorkspace();
        saveWorkspace();
    });

    const saveEdgeText = () => {
        if (isDeleted) return; // 若已點擊刪除則忽略儲存
        edge.text = input.value.trim();
        if (panel.parentNode) {
            panel.remove();
            renderWorkspace();
            saveWorkspace();
        }
    };

    input.addEventListener('blur', saveEdgeText);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.value = edge.text || ''; // 還原並退出
            input.blur();
        }
    });
}

// 新增與刪除操作
document.getElementById('addNodeBtn').addEventListener('click', () => {
    if (!state.isVisualMode) {
        alert("目前為純文字範本模式，請切換至視覺化圖表類型！");
        return;
    }
    state.nodeCounter++;
    const id = `node_${state.nodeCounter}`;
    state.nodes.push({ id, x: 200, y: 200, text: `節點 ${state.nodeCounter}` });
    renderWorkspace(); // 需先渲染產生 DOM
    selectElement(id, 'node');
    saveWorkspace(); // 新增：加入節點後自動存檔
});

document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
        // 避免在輸入框內按 Backspace 刪除節點
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            deleteSelected();
        }
    }
});

function deleteSelected() {
    if (state.selectedType === 'node') {
        state.nodes = state.nodes.filter(n => n.id !== state.selectedId);
        // 刪除相關連線
        state.edges = state.edges.filter(e => e.source !== state.selectedId && e.target !== state.selectedId);
    } else if (state.selectedType === 'edge') {
        state.edges = state.edges.filter(e => e.id !== state.selectedId);
    }
    deselectAll();
    renderWorkspace(); // 反映刪除狀態
    saveWorkspace(); // 新增：刪除元件後自動存檔
}

// 清除暫存操作
document.getElementById('clearStorageBtn').addEventListener('click', () => {
    if (confirm('確定要清除所有暫存並恢復預設狀態嗎？')) {
        localStorage.removeItem(STORAGE_KEY);
        state.nodes = [
            { id: 'node_1', x: 200, y: 150, text: '開始' },
            { id: 'node_2', x: 200, y: 300, text: '結束' }
        ];
        state.edges = [
            { id: 'edge_1', source: 'node_1', target: 'node_2', text: '' }
        ];
        state.nodeCounter = 2;
        state.edgeCounter = 1;
        diagramTypeSelect.value = 'graph TD';
        updateVisualModeStatus();
        deselectAll();
        renderWorkspace();
    }
});

// === 3. Mermaid 語法產生與渲染 ===

function updateMermaid() {
    const type = diagramTypeSelect.value;
    let code = "";

    if (state.isVisualMode) {
        // 根據畫布狀態動態生成語法
        code = type + "\n";
        
        // 特定圖表的特別前綴或設定
        if (type === 'mindmap') {
            // 使用 DFS (深度優先搜尋) 演算法來建立心智圖的階層縮排
            const adj = {};
            const inDegree = {};
            state.nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
            state.edges.forEach(e => {
                if (adj[e.source]) {
                    adj[e.source].push(e.target);
                    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
                }
            });
            
            // 找出根節點 (沒有被別人指向的節點)
            const roots = state.nodes.filter(n => inDegree[n.id] === 0);
            if (roots.length === 0 && state.nodes.length > 0) roots.push(state.nodes[0]); // 處理循環的防呆
            
            const visited = new Set();
            function dfs(nodeId, depth) {
                if (visited.has(nodeId)) return;
                visited.add(nodeId);
                const n = state.nodes.find(x => x.id === nodeId);
                const indent = "  ".repeat(depth + 1);
                code += `${indent}${n.id}["${n.text}"]\n`;
                adj[nodeId].forEach(childId => dfs(childId, depth + 1));
            }
            
            roots.forEach(r => dfs(r.id, 0));
            // 處理沒有連線的孤立節點
            state.nodes.forEach(n => {
                if (!visited.has(n.id)) dfs(n.id, 0);
            });
            
        } else if (type === 'classDiagram') {
            // 類別圖需要 class 宣告與專屬連線符號，並支援內部屬性與箭頭標籤
            state.nodes.forEach(n => {
                code += `  class ${n.id}["${n.text}"] {\n`;
                if (n.details) {
                    n.details.split('\n').forEach(line => {
                        if(line.trim()) code += `    ${line.trim()}\n`;
                    });
                }
                code += `  }\n`;
            });
            state.edges.forEach(e => {
                if (e.text) {
                    code += `  ${e.source} --|> ${e.target} : ${e.text}\n`;
                } else {
                    code += `  ${e.source} --|> ${e.target}\n`;
                }
            });
        } else if (type === 'erDiagram') {
            // ER 圖的實體宣告與關聯符號，並支援內部欄位與關聯文字
            state.nodes.forEach(n => {
                code += `  ${n.id}["${n.text}"] {\n`;
                if (n.details) {
                    n.details.split('\n').forEach(line => {
                        if(line.trim()) code += `    ${line.trim()}\n`;
                    });
                }
                code += `  }\n`;
            });
            state.edges.forEach(e => {
                const labelText = e.text ? e.text : "connects";
                code += `  ${e.source} ||--o{ ${e.target} : "${labelText}"\n`;
            });
        } else if (type === 'stateDiagram-v2') {
            state.nodes.forEach(n => { code += `  ${n.id} : ${n.text}\n`; });
            state.edges.forEach(e => {
                if (e.text) {
                    code += `  ${e.source} --> ${e.target} : ${e.text}\n`;
                } else {
                    code += `  ${e.source} --> ${e.target}\n`;
                }
            });
        } else if (type === 'architecture-beta') {
            // 架構圖需要指定服務類型 (從下拉選單選擇)
            state.nodes.forEach(n => {
                const aType = n.archType || 'server';
                code += `  service ${n.id}(${aType})["${n.text}"]\n`;
            });
            state.edges.forEach(e => { code += `  ${e.source}:R --> L:${e.target}\n`; });
        } else if (type === 'block-beta') {
            code += "  columns 1\n";
            state.nodes.forEach(n => { code += `  ${n.id}["${n.text}"]\n`; });
            state.edges.forEach(e => { code += `  ${e.source} --> ${e.target}\n`; });
        } else if (type === 'sankey-beta') {
            code += "\n";
            if (state.edges.length === 0) {
                code += "Source,Target,1\n"; // 避免空資料導致 Sankey 崩潰
            } else {
                state.edges.forEach(e => {
                    const s = state.nodes.find(n=>n.id===e.source);
                    const t = state.nodes.find(n=>n.id===e.target);
                    if(s && t) code += `${s.text},${t.text},10\n`;
                });
            }
        } else {
            // 預設為流程圖處理 (graph TD, graph LR, flowchart TD)
            state.nodes.forEach(n => {
                code += `    ${n.id}["${n.text}"]\n`;
            });
            state.edges.forEach(e => {
                if (e.text) {
                    code += `    ${e.source} -->|${e.text}| ${e.target}\n`;
                } else {
                    code += `    ${e.source} --> ${e.target}\n`;
                }
            });
        }
    } else {
        // 非視覺化模式，提供預設範本
        code = getTemplateForType(type);
    }

    // 更新文字區塊
    mermaidCodeInput.value = code;
    
    // 嘗試渲染圖表
    renderMermaidPreview(code);
}

async function renderMermaidPreview(code) {
    const previewDiv = document.getElementById('mermaidPreview');
    try {
        // 清理舊的，建立新的 div 讓 mermaid 渲染
        previewDiv.innerHTML = '';
        const id = `mermaid_${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        previewDiv.innerHTML = svg;
        mermaidCodeInput.style.border = "none";
    } catch (error) {
        // 語法錯誤時顯示紅框
        mermaidCodeInput.style.border = "2px solid var(--danger)";
    }
}

// 監聽文字區塊手動修改
mermaidCodeInput.addEventListener('input', () => {
    renderMermaidPreview(mermaidCodeInput.value);
});

// 切換圖表類型
diagramTypeSelect.addEventListener('change', () => {
    updateVisualModeStatus();
    saveWorkspace(); // 新增：切換圖表後自動存檔
    renderWorkspace();
});

// 複製程式碼
document.getElementById('copyBtn').addEventListener('click', () => {
    mermaidCodeInput.select();
    document.execCommand('copy');
    const btn = document.getElementById('copyBtn');
    btn.innerText = '已複製!';
    setTimeout(() => btn.innerText = '複製程式碼', 2000);
});

// === 4. 非視覺化圖表範本 ===
function getTemplateForType(type) {
    const templates = {
        'sequenceDiagram': `sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>John: Hello John, how are you?\n    loop Healthcheck\n        John->>John: Fight against hypochondria\n    end\n    Note right of John: Rational thoughts <br/>prevail!\n    John-->>Alice: Great!\n    John->>Bob: How about you?\n    Bob-->>John: Jolly good!`,
        'gantt': `gantt\n    title A Gantt Diagram\n    dateFormat  YYYY-MM-DD\n    section Section\n    A task           :a1, 2014-01-01, 30d\n    Another task     :after a1  , 20d\n    section Another\n    Task in sec      :2014-01-12  , 12d\n    another task      : 24d`,
        'pie': `pie title Pets adopted by volunteers\n    "Dogs" : 386\n    "Cats" : 85\n    "Rats" : 15`,
        'journey': `journey\n    title My working day\n    section Go to work\n      Make tea: 5: Me\n      Go upstairs: 3: Me\n      Do work: 1: Me, Cat\n    section Go home\n      Go downstairs: 5: Me\n      Sit down: 5: Me`,
        'gitGraph': `gitGraph\n    commit\n    commit\n    branch develop\n    checkout develop\n    commit\n    commit\n    checkout main\n    merge develop\n    commit`,
        'quadrantChart': `quadrantChart\n    title Reach and engagement of campaigns\n    x-axis Low Reach --> High Reach\n    y-axis Low Engagement --> High Engagement\n    quadrant-1 We should expand\n    quadrant-2 Need to promote\n    quadrant-3 Re-evaluate\n    quadrant-4 May be improved\n    Campaign A: [0.3, 0.6]\n    Campaign B: [0.45, 0.23]\n    Campaign C: [0.57, 0.69]`,
        'requirementDiagram': `requirementDiagram\n    requirement test_req {\n    id: 1\n    text: the test text.\n    risk: high\n    verifymethod: test\n    }\n    element test_entity {\n    type: simulation\n    }\n    test_entity - satisfies -> test_req`,
        'timeline': `timeline\n    title History of Social Media\n    2002 : LinkedIn\n    2004 : Facebook\n         : Google\n    2005 : Youtube\n    2006 : Twitter`,
        'zenuml': `zenuml\n    title ZenUML Example\n    Client->Server: Request\n    Server->Database: Query\n    Database->Server: Result\n    Server->Client: Response`,
        'xychart-beta': `xychart-beta\n    title "Sales Revenue"\n    x-axis [jan, feb, mar, apr, may]\n    y-axis "Revenue (in $)" 4000 --> 11000\n    bar [5000, 6000, 7500, 8200, 9500]\n    line [5000, 6000, 7500, 8200, 9500]`
    };
    return templates[type] || `${type}\n  %% Template not found`;
}

// 初始化
loadWorkspace(); // 新增：啟動時讀取本地快取
renderWorkspace();

