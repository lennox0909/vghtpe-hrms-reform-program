import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// DOM 元素參考
const dom = {
    modelSelect: document.getElementById('model-select'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    tempSlider: document.getElementById('temp-slider'),
    tempVal: document.getElementById('temp-val'),
    topPSlider: document.getElementById('top-p-slider'),
    topPVal: document.getElementById('top-p-val'),
    loadBtn: document.getElementById('load-btn'),
    loadBtnText: document.getElementById('load-btn-text'),
    loadBtnTextMobile: document.getElementById('load-btn-text-mobile'),
    loadBtnIcon: document.getElementById('load-btn-icon'),
    errorBanner: document.getElementById('error-banner'),
    errorText: document.getElementById('error-text'),
    chatContainer: document.getElementById('chat-container'),
    messagesArea: document.getElementById('messages-area'),
    emptyState: document.getElementById('empty-state'),
    loadingIndicator: document.getElementById('loading-indicator'),
    progressText: document.getElementById('progress-text'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    sendIconDefault: document.getElementById('send-icon-default'),
    sendIconLoading: document.getElementById('send-icon-loading'),
    sendIconStop: document.getElementById('send-icon-stop'),
};

// 應用程式狀態
let engine = null;
let status = 'idle'; // idle, loading, ready, generating
let messageHistory = [];

// 檢查 WebGPU 支援
if (!navigator.gpu) {
    showError("⚠️ 您的瀏覽器不支援 WebGPU。\n行動裝置建議使用最新版 Chrome 或 Safari (需開啟 WebGPU 實驗性功能)。");
}

// 自動滾動到底部
function scrollToBottom() {
    dom.chatContainer.scrollTo({
        top: dom.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// 監聽螢幕大小變化（特別是虛擬鍵盤彈出時），自動將內容滾動到可視範圍
window.addEventListener('resize', () => {
    if (status !== 'idle') scrollToBottom();
});

// 顯示錯誤橫幅
function showError(msg) {
    dom.errorText.textContent = msg;
    dom.errorBanner.classList.remove('hidden');
    dom.errorBanner.classList.add('flex');
    console.error(msg);
}

// 更新介面狀態
function updateUIState() {
    const isLoadingOrGenerating = status === 'loading' || status === 'generating';

    // 頂部控制項
    dom.modelSelect.disabled = isLoadingOrGenerating;
    dom.loadBtn.disabled = isLoadingOrGenerating;
    dom.tempSlider.disabled = isLoadingOrGenerating;
    dom.topPSlider.disabled = isLoadingOrGenerating;

    const loadingSVG = `<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    const reloadSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

    if (status === 'loading') {
        dom.loadBtnText.textContent = "載入中";
        dom.loadBtnTextMobile.textContent = "載入中";
        dom.loadBtnIcon.innerHTML = loadingSVG;
    } else if (status === 'ready') {
        dom.loadBtnText.textContent = "重新載入";
        dom.loadBtnTextMobile.textContent = "重載";
        dom.loadBtnIcon.innerHTML = reloadSVG;
    }

    // 底部輸入控制項
    const isReadyToInput = status === 'ready';
    dom.chatInput.disabled = !isReadyToInput;

    if (status === 'generating') {
        // 生成時按鈕轉變為紅色的「停止按鈕」
        dom.sendBtn.disabled = false;
        dom.sendBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
        dom.sendBtn.classList.add('bg-red-600', 'hover:bg-red-500');

        dom.sendIconDefault.classList.add('hidden');
        dom.sendIconLoading.classList.add('hidden');
        dom.sendIconStop.classList.remove('hidden');

        dom.chatInput.placeholder = "AI 正在思考... (可點擊右側按鈕停止)";
    } else {
        // 恢復為原本藍色的「發送按鈕」
        dom.sendBtn.disabled = !isReadyToInput || dom.chatInput.value.trim() === '';
        dom.sendBtn.classList.remove('bg-red-600', 'hover:bg-red-500');
        dom.sendBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');

        dom.sendIconStop.classList.add('hidden');
        dom.sendIconLoading.classList.add('hidden');
        dom.sendIconDefault.classList.remove('hidden');

        if (status === 'idle') {
            dom.chatInput.placeholder = "請先載入模型...";
        } else if (status === 'loading') {
            dom.chatInput.placeholder = "模型載入中...";
        } else {
            dom.chatInput.placeholder = "輸入訊息... (連按四下 Enter 送出)";
        }
    }
}

// 清除除了 loading 和 empty state 之外的所有訊息節點
function clearMessagesDOM() {
    const nodesToRemove = [];
    dom.messagesArea.childNodes.forEach(node => {
        if (node.id !== 'empty-state' && node.id !== 'loading-indicator' && node.nodeType === Node.ELEMENT_NODE) {
            nodesToRemove.push(node);
        }
    });
    nodesToRemove.forEach(node => node.remove());
}

// 在畫面上渲染一條訊息 (調整寬度以適應手機)
function appendMessageToDOM(role, content) {
    const msgContainer = document.createElement('div');
    msgContainer.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} w-full`;

    const bubble = document.createElement('div');
    // 行動端給予高達 92% 的寬度，平板/電腦維持 85% / 75%
    bubble.className = `max-w-[92%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl p-3 sm:p-4 shadow-sm ${role === 'user'
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
        }`;

    if (role === 'assistant') {
        const header = document.createElement('div');
        header.className = "flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider";
        header.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg> AI 助理`;
        bubble.appendChild(header);
    }

    const textBlock = document.createElement('div');
    textBlock.className = "whitespace-pre-wrap text-sm leading-relaxed word-break break-words";
    textBlock.textContent = content; // 防止 XSS

    bubble.appendChild(textBlock);
    msgContainer.appendChild(bubble);
    dom.messagesArea.appendChild(msgContainer);

    scrollToBottom();
    return textBlock;
}

// 載入模型邏輯
async function loadModel() {
    if (!navigator.gpu) {
        showError("需要 WebGPU 支援才能執行模型！");
        return;
    }

    const selectedModel = dom.modelSelect.value;
    status = 'loading';
    updateUIState();

    // UI 整理
    dom.errorBanner.classList.add('hidden');
    dom.emptyState.classList.add('hidden');
    dom.settingsPanel.classList.add('hidden'); // 載入時隱藏設定面板
    clearMessagesDOM();
    messageHistory = [];

    // 顯示載入中動畫
    dom.loadingIndicator.classList.remove('hidden');
    dom.loadingIndicator.classList.add('flex');
    dom.progressText.textContent = "正在初始化引擎與下載模型...";

    try {
        engine = await CreateMLCEngine(selectedModel, {
            initProgressCallback: (report) => {
                dom.progressText.textContent = report.text;
                scrollToBottom();
            }
        });

        status = 'ready';
        dom.loadingIndicator.classList.add('hidden');
        dom.loadingIndicator.classList.remove('flex');

        const welcomeText = `✅ 系統提示：已成功載入模型 **${selectedModel}** 並準備就緒。請開始與我對話！`;
        messageHistory.push({ role: 'assistant', content: welcomeText });
        appendMessageToDOM('assistant', welcomeText);

    } catch (err) {
        status = 'error';
        dom.loadingIndicator.classList.add('hidden');
        dom.loadingIndicator.classList.remove('flex');
        showError(`載入失敗：\n${err.stack || err.message}`);
    } finally {
        updateUIState();
    }
}

// 發送訊息與串流回覆
async function sendMessage() {
    const text = dom.chatInput.value.trim();
    if (!text || status !== 'ready' || !engine) return;

    // 1. 處理 User 訊息
    dom.chatInput.value = '';
    dom.chatInput.style.height = '48px'; // 恢復原始高度
    messageHistory.push({ role: 'user', content: text });
    appendMessageToDOM('user', text);

    // 2. 準備 AI 訊息狀態
    status = 'generating';
    updateUIState();

    const aiTextBlock = appendMessageToDOM('assistant', "");

    try {
        const currentTemp = parseFloat(dom.tempSlider.value);
        const currentTopP = parseFloat(dom.topPSlider.value);

        const chunks = await engine.chat.completions.create({
            messages: messageHistory,
            stream: true,
            temperature: currentTemp,
            top_p: currentTopP,
        });

        let fullReply = "";
        for await (const chunk of chunks) {
            const delta = chunk.choices[0]?.delta?.content || "";
            fullReply += delta;

            aiTextBlock.textContent = fullReply;
            scrollToBottom();
        }

        messageHistory.push({ role: 'assistant', content: fullReply });
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes('abort')) {
            aiTextBlock.textContent += " ⏹️ [已停止]";
        } else {
            console.error(err);
            aiTextBlock.textContent = "❌ 發生錯誤，無法生成回覆。請確認控制台日誌。";
        }
    } finally {
        status = 'ready';
        updateUIState();
    }
}

// 處理發送按鈕點擊事件 (兼顧發送與停止)
function handleSendBtnClick() {
    if (status === 'generating') {
        if (engine) engine.interruptGenerate();
    } else if (status === 'ready') {
        sendMessage();
    }
}

// --- 綁定事件監聽器 ---

dom.loadBtn.addEventListener('click', loadModel);
dom.sendBtn.addEventListener('click', handleSendBtnClick);

// 設定面板展開/收合
dom.settingsBtn.addEventListener('click', () => {
    dom.settingsPanel.classList.toggle('hidden');
});

// 監聽參數滑桿變化即時更新數值顯示
dom.tempSlider.addEventListener('input', (e) => {
    dom.tempVal.textContent = e.target.value;
});
dom.topPSlider.addEventListener('input', (e) => {
    dom.topPVal.textContent = e.target.value;
});

// 監聽輸入框變化以切換發送按鈕狀態，並實現自動長高 (Auto-resize textarea)
dom.chatInput.addEventListener('input', function () {
    updateUIState();

    // 自動調整高度邏輯
    this.style.height = '48px'; // 重置高度以取得真實的 scrollHeight
    const newHeight = Math.min(this.scrollHeight, 200); // 限制最大高度
    this.style.height = newHeight + 'px';

    if (this.value === '') {
        this.style.height = '48px';
    }
});

// 處理連按四下 Enter 鍵直接送出的邏輯
let enterCount = 0;
dom.chatInput.addEventListener('keydown', (e) => {
    if (status !== 'ready') return;

    if (e.key === 'Enter') {
        enterCount++;
        if (enterCount === 4) {
            e.preventDefault(); // 防止加入最後的換行
            enterCount = 0;
            sendMessage();
        }
    } else {
        enterCount = 0; // 若輸入了其他字元，則重新計算
    }
});