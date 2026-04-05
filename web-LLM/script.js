import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

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
    micBtn: document.getElementById('mic-btn'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    sendIconDefault: document.getElementById('send-icon-default'),
    sendIconLoading: document.getElementById('send-icon-loading'),
    sendIconStop: document.getElementById('send-icon-stop'),
    continueWrapper: document.getElementById('continue-wrapper'),
    continueBtn: document.getElementById('continue-btn'),
    learnMoreBtn: document.getElementById('learn-more-btn'),
    learnMoreContent: document.getElementById('learn-more-content'),
};

let engine = null;
let status = 'idle'; // idle, loading, ready, generating
let messageHistory = [];
let wasInterrupted = false;

// --- 語音辨識初始化 (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let recordingBaseText = "";
let finalTranscript = "";

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-TW';

    recognition.onstart = () => {
        isRecording = true;
        recordingBaseText = dom.chatInput.value;
        if (recordingBaseText && !recordingBaseText.endsWith(' ') && !recordingBaseText.endsWith('\n')) {
            recordingBaseText += ' ';
        }
        dom.micBtn.classList.remove('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
        dom.micBtn.classList.add('bg-red-500', 'hover:bg-red-400', 'text-white', 'animate-pulse');
        dom.chatInput.placeholder = "🔴 正在聆聽您的聲音... (再次點擊麥克風結束)";
        updateUIState();
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                currentFinal += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        finalTranscript += currentFinal;
        dom.chatInput.value = recordingBaseText + finalTranscript + interimTranscript;
        
        // 觸發輸入事件以調整高度
        dom.chatInput.dispatchEvent(new Event('input'));
    };

    recognition.onend = () => {
        isRecording = false;
        finalTranscript = "";
        dom.micBtn.classList.add('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
        dom.micBtn.classList.remove('bg-red-500', 'hover:bg-red-400', 'text-white', 'animate-pulse');
        updateUIState();
    };

    dom.micBtn.addEventListener('click', () => {
        if (status === 'loading' || status === 'generating') return;
        if (isRecording) {
            recognition.stop();
        } else {
            try { recognition.start(); } catch(e) { console.error("語音啟動失敗", e); }
        }
    });
} else {
    dom.micBtn.title = "您的瀏覽器不支援語音輸入";
    dom.micBtn.disabled = true;
    dom.micBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

// 檢查 WebGPU
if (!navigator.gpu) {
    showError("⚠️ 您的瀏覽器不支援 WebGPU。\n行動裝置建議使用最新版 Chrome 或 Safari (需開啟 WebGPU 實驗性功能)。");
}

// --- 通用工具函數 ---

function scrollToBottom() {
    dom.chatContainer.scrollTo({ top: dom.chatContainer.scrollHeight, behavior: 'smooth' });
}

function showError(msg) {
    dom.errorText.textContent = msg;
    dom.errorBanner.classList.remove('hidden');
    dom.errorBanner.classList.add('flex');
    console.error(msg);
}

function updateUIState() {
    const isLoadingOrGenerating = status === 'loading' || status === 'generating';
    
    dom.modelSelect.disabled = isLoadingOrGenerating;
    dom.loadBtn.disabled = isLoadingOrGenerating;
    dom.tempSlider.disabled = isLoadingOrGenerating;
    dom.topPSlider.disabled = isLoadingOrGenerating;
    
    if (SpeechRecognition) {
        dom.micBtn.disabled = isLoadingOrGenerating;
    }
    
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

    if (wasInterrupted && status === 'ready') {
        dom.continueWrapper.classList.remove('hidden');
    } else {
        dom.continueWrapper.classList.add('hidden');
    }

    const isReadyToInput = status === 'ready' || status === 'idle';
    dom.chatInput.disabled = !isReadyToInput && !isRecording;
    
    if (status === 'generating') {
        dom.sendBtn.disabled = false;
        dom.sendBtn.classList.replace('bg-blue-600', 'bg-red-600');
        dom.sendBtn.classList.replace('hover:bg-blue-500', 'hover:bg-red-500');
        dom.sendIconDefault.classList.add('hidden');
        dom.sendIconLoading.classList.add('hidden');
        dom.sendIconStop.classList.remove('hidden');
        dom.chatInput.placeholder = "AI 正在思考... (可點擊停止)";
    } else {
        dom.sendBtn.disabled = status !== 'ready' || dom.chatInput.value.trim() === '';
        dom.sendBtn.classList.replace('bg-red-600', 'bg-blue-600');
        dom.sendBtn.classList.replace('hover:bg-red-500', 'hover:bg-blue-500');
        dom.sendIconStop.classList.add('hidden');
        dom.sendIconLoading.classList.add('hidden');
        dom.sendIconDefault.classList.remove('hidden');
        
        if (!isRecording) {
            if (status === 'idle') dom.chatInput.placeholder = "請先載入模型...";
            else if (status === 'loading') dom.chatInput.placeholder = "模型載入中...";
            else dom.chatInput.placeholder = "輸入訊息... (連按四下 Enter 送出)";
        }
    }
}

function clearMessagesDOM() {
    const nodesToRemove = [];
    dom.messagesArea.childNodes.forEach(node => {
        if (!['empty-state', 'loading-indicator'].includes(node.id) && node.nodeType === Node.ELEMENT_NODE) {
            nodesToRemove.push(node);
        }
    });
    nodesToRemove.forEach(node => node.remove());
}

function appendMessageToDOM(role, content) {
    const msgContainer = document.createElement('div');
    msgContainer.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} w-full`;

    const bubble = document.createElement('div');
    bubble.className = `max-w-[92%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl p-3 sm:p-4 shadow-sm ${
        role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
    }`;

    if (role === 'assistant') {
        const header = document.createElement('div');
        header.className = "flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider";
        header.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg> AI 助理`;
        bubble.appendChild(header);
    }

    const textBlock = document.createElement('div');
    textBlock.className = "whitespace-pre-wrap text-sm leading-relaxed word-break";
    textBlock.textContent = content;

    bubble.appendChild(textBlock);
    msgContainer.appendChild(bubble);
    dom.messagesArea.appendChild(msgContainer);
    
    scrollToBottom();
    return textBlock;
}

// --- 核心業務邏輯 ---

async function loadModel() {
    if (!navigator.gpu) {
        showError("需要 WebGPU 支援才能執行模型！");
        return;
    }

    const selectedModel = dom.modelSelect.value;
    status = 'loading';
    wasInterrupted = false;
    updateUIState();
    
    dom.errorBanner.classList.add('hidden');
    dom.emptyState.classList.add('hidden');
    dom.settingsPanel.classList.add('hidden');
    clearMessagesDOM();
    messageHistory = [];
    
    dom.loadingIndicator.classList.replace('hidden', 'flex');
    dom.progressText.textContent = "正在初始化引擎與下載模型...";

    try {
        engine = await CreateMLCEngine(selectedModel, {
            initProgressCallback: (report) => {
                dom.progressText.textContent = report.text;
                scrollToBottom();
            }
        });

        status = 'ready';
        dom.loadingIndicator.classList.replace('flex', 'hidden');
        
        const welcomeText = `✅ 已載入模型 **${selectedModel}**。\n💡 點擊左下角麥克風可語音輸入！`;
        messageHistory.push({ role: 'assistant', content: welcomeText });
        appendMessageToDOM('assistant', welcomeText);
        
    } catch (err) {
        status = 'error';
        dom.loadingIndicator.classList.replace('flex', 'hidden');
        showError(`載入失敗：\n${err.stack || err.message}`);
    } finally {
        updateUIState();
    }
}

async function sendMessage(isContinue = false) {
    if (isRecording && recognition) recognition.stop();

    let text = dom.chatInput.value.trim();

    if (isContinue === true) {
        text = "請繼續未完成的回覆";
    } else {
        if (!text || status !== 'ready' || !engine) return;
        dom.chatInput.value = '';
        dom.chatInput.style.height = '48px';
    }

    wasInterrupted = false;
    updateUIState();

    messageHistory.push({ role: 'user', content: text });
    appendMessageToDOM('user', text);
    
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
            wasInterrupted = true;
        } else {
            console.error(err);
            aiTextBlock.textContent = "❌ 發生錯誤，無法生成回覆。";
        }
    } finally {
        status = 'ready';
        updateUIState();
    }
}

// --- 事件監聽器 ---

dom.loadBtn.addEventListener('click', loadModel);
dom.sendBtn.addEventListener('click', () => {
    if (status === 'generating') engine?.interruptGenerate();
    else if (status === 'ready') sendMessage();
});

dom.continueBtn.addEventListener('click', () => sendMessage(true));

dom.learnMoreBtn?.addEventListener('click', () => {
    dom.learnMoreContent.classList.toggle('hidden');
});

dom.settingsBtn.addEventListener('click', () => dom.settingsPanel.classList.toggle('hidden'));
dom.tempSlider.addEventListener('input', (e) => { dom.tempVal.textContent = e.target.value; });
dom.topPSlider.addEventListener('input', (e) => { dom.topPVal.textContent = e.target.value; });

dom.chatInput.addEventListener('input', function() {
    updateUIState();
    this.style.height = '48px';
    const newHeight = Math.min(this.scrollHeight, 200);
    this.style.height = newHeight + 'px';
    if (this.value === '') this.style.height = '48px';
});

// 4 次 Enter 快捷鍵
let enterCount = 0;
dom.chatInput.addEventListener('keydown', (e) => {
    if (status !== 'ready') return;
    if (e.key === 'Enter') {
        enterCount++;
        if (enterCount === 4) {
            e.preventDefault();
            enterCount = 0;
            sendMessage();
        }
    } else {
        enterCount = 0;
    }
});

// 視窗調整大小時自動捲動
window.addEventListener('resize', () => {
    if (status !== 'idle') scrollToBottom();
});