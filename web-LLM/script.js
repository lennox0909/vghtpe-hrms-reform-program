// 初始化 Lucide Icons
lucide.createIcons();

// 系統狀態變數
let llmStatus = 'unloaded'; // unloaded, downloading, ready
let agentStatus = 'idle'; // idle, searching, generating

// --- 本機向量資料庫 (Local Vector DB) 實作 ---
class LocalVectorDB {
    constructor() {
        this.documents = [];
    }

    // 將文字轉換為簡單的字元 Bigram 稀疏向量 (Sparse Vector)
    _vectorize(text) {
        const vec = {};
        for (let i = 0; i < text.length - 1; i++) {
            const bigram = text.slice(i, i + 2);
            vec[bigram] = (vec[bigram] || 0) + 1;
        }
        return vec;
    }

    // 計算餘弦相似度 (Cosine Similarity)
    _cosineSimilarity(vec1, vec2) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        const allKeys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
        for (let key of allKeys) {
            const v1 = vec1[key] || 0;
            const v2 = vec2[key] || 0;
            dotProduct += v1 * v2;
            normA += v1 * v1;
            normB += v2 * v2;
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // 新增文件與其向量
    addDocument(id, text, metadata) {
        this.documents.push({
            id,
            text,
            metadata,
            vector: this._vectorize(text)
        });
    }

    // 搜尋最相似的文件
    search(queryText, topK = 2) {
        const queryVector = this._vectorize(queryText);
        const results = this.documents.map(doc => {
            const score = this._cosineSimilarity(queryVector, doc.vector);
            return { ...doc, score };
        });
        // 依分數降冪排序
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }
}

const localVDB = new LocalVectorDB();

// 模擬人事室法規資料 (供本機建檔使用)
const mockRegulations = [
    { id: "R001", type: "差勤", text: "員工因婚、喪、疾病或其他重大事由得請假；請假應於事前填具請假單，經核准後始得離開任所。" },
    { id: "R002", type: "差勤", text: "女性員工分娩者，給予產假八星期；妊娠三個月以上流產者，給予產假四星期。" },
    { id: "R003", type: "考核", text: "年度考核應依據平時工作表現、差勤狀況進行綜合評比。遲到早退達三次以上者，影響當年度考績。" },
    { id: "R004", type: "考核", text: "員工若於年度內獲記大功一次以上，年終考核得優先列為優等。" },
    { id: "R005", type: "任免", text: "新進人員應先予試用三個月，試用期滿經考核合格者，方得正式任用。" }
];

// DOM 元素選取
const btnDownload = document.getElementById('start-download-btn');
const promptDownload = document.getElementById('download-prompt');
const containerProgress = document.getElementById('download-progress-container');
const barProgress = document.getElementById('progress-bar-fill');
const textProgress = document.getElementById('progress-text-percent');

const badgeVdbStatus = document.getElementById('vdb-status-badge');
const textVdbStatus = document.getElementById('vdb-status-text');
const iconVdbStatus = document.getElementById('vdb-status-icon');

const badgeLlmStatus = document.getElementById('llm-status-badge');
const textLlmStatus = document.getElementById('llm-status-text');
const iconLlmStatus = document.getElementById('llm-status-icon');

const formChat = document.getElementById('chat-form');
const inputChat = document.getElementById('chat-input');
const btnSend = document.getElementById('send-btn');
const containerChat = document.getElementById('chat-container');
const anchorChat = document.getElementById('chat-anchor');

const indSearching = document.getElementById('searching-indicator');
const indGenerating = document.getElementById('generating-indicator');

// 進階設定的 DOM 選取
const btnSettings = document.getElementById('btn-settings');
const modalSettings = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('close-settings-btn');
const inputSystemPrompt = document.getElementById('system-prompt-input');
const selectNewDocType = document.getElementById('new-doc-type');
const inputNewDocText = document.getElementById('new-doc-text');
const btnAddDoc = document.getElementById('add-doc-btn');

// 設定視窗開關邏輯
btnSettings.addEventListener('click', () => modalSettings.classList.remove('d-none'));
btnCloseSettings.addEventListener('click', () => modalSettings.classList.add('d-none'));

// 動態更新向量資料庫邏輯
btnAddDoc.addEventListener('click', () => {
    const text = inputNewDocText.value.trim();
    const type = selectNewDocType.value;
    if (!text) return alert('請輸入法規內容！');
    
    // 產生新的文件 ID
    const newId = "R" + String(localVDB.documents.length + 1).padStart(3, '0');
    
    // 加入本機向量庫 (執行 _vectorize 轉換為向量)
    localVDB.addDocument(newId, text, { type });
    
    // 更新 UI 顯示數量
    if (llmStatus === 'ready') {
        textVdbStatus.textContent = `本機向量庫: 已就緒 (${localVDB.documents.length}筆)`;
    }
    
    // 清空輸入框並提示
    inputNewDocText.value = '';
    alert(`✅ 成功建立 Embedding！\n(分類: ${type}, 已加入記憶體向量庫，總筆數: ${localVDB.documents.length})`);
});

// 自動捲動到底部
function scrollToBottom() {
    anchorChat.scrollIntoView({ behavior: 'smooth' });
}

// 建立訊息 DOM 元素
function createMessageElement(role, content, isStreaming = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-6 message-bubble`;
    
    const isUser = role === 'user';
    
    // 結構設定
    wrapper.innerHTML = `
        <div class="flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}">
            <div class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isUser ? 'bg-gray-200 ml-3' : 'bg-blue-100 mr-3'}">
                <i data-lucide="${isUser ? 'user' : 'bot'}" class="${isUser ? 'text-gray-600' : 'text-blue-600'} w-5 h-5"></i>
            </div>
            <div class="p-4 rounded-2xl shadow-sm ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 rounded-tl-none'}">
                <div class="message-content whitespace-pre-wrap leading-relaxed">${content}</div>
            </div>
        </div>
    `;
    
    // 如果正在打字，加上閃爍游標
    if (isStreaming) {
        const contentDiv = wrapper.querySelector('.message-content');
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        contentDiv.appendChild(cursor);
    }

    // 在插入 indicators 之前插入訊息
    containerChat.insertBefore(wrapper, indSearching);
    
    // 為新加入的元素渲染 icon
    lucide.createIcons({ root: wrapper });
    scrollToBottom();
    
    return wrapper;
}

// 更新輸入區狀態
function updateInputState() {
    const isReady = (llmStatus === 'ready' && agentStatus === 'idle');
    inputChat.disabled = !isReady;
    btnSend.disabled = !isReady || inputChat.value.trim() === '';
    
    if (llmStatus !== 'ready') {
        inputChat.placeholder = "請先載入 WebGPU 模型...";
    } else if (agentStatus !== 'idle') {
        inputChat.placeholder = "AI 正在處理中...";
    } else {
        inputChat.placeholder = "請輸入您想查詢的人事法規問題...";
    }
}

// 監聽輸入框變更，控制發送按鈕狀態
inputChat.addEventListener('input', updateInputState);

// 模擬載入外部 WebGPU LLM 模型
btnDownload.addEventListener('click', () => {
    llmStatus = 'downloading';
    
    // UI 切換
    promptDownload.classList.add('d-none');
    containerProgress.classList.remove('d-none');
    
    // 觸發本機向量庫建檔 (建立 Embeddings)
    badgeVdbStatus.classList.replace('bg-gray-600', 'bg-blue-900');
    iconVdbStatus.classList.replace('text-white', 'text-green-400');
    textVdbStatus.textContent = '本機向量庫: 建立索引中...';
    
    setTimeout(() => {
        mockRegulations.forEach(reg => {
            localVDB.addDocument(reg.id, reg.text, { type: reg.type });
        });
        textVdbStatus.textContent = `本機向量庫: 已就緒 (${mockRegulations.length}筆)`;
    }, 600);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            llmStatus = 'ready';
            
            // 載入完成 UI 更新
            setTimeout(() => {
                containerProgress.classList.add('d-none');
                badgeLlmStatus.classList.remove('bg-yellow-600');
                badgeLlmStatus.classList.add('bg-blue-900');
                iconLlmStatus.classList.remove('text-white');
                iconLlmStatus.classList.add('text-green-400');
                textLlmStatus.textContent = 'WebGPU 模型: 已就緒';
                updateInputState();
            }, 500);
        }
        
        // 更新進度條
        barProgress.style.width = `${progress}%`;
        textProgress.textContent = `${progress}%`;
        textLlmStatus.textContent = `WebGPU 模型: 載入中 ${progress}%`;
        
    }, 500);
});

// 處理表單發送 (模擬 RAG 流程)
formChat.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userQuery = inputChat.value.trim();
    if (!userQuery || llmStatus !== 'ready' || agentStatus !== 'idle') return;

    // 顯示使用者訊息
    createMessageElement('user', userQuery);
    inputChat.value = '';
    updateInputState();

    // 階段 1：模擬檢索 (RAG Retrieval)
    agentStatus = 'searching';
    updateInputState();
    indSearching.classList.remove('d-none');
    scrollToBottom();
    
    // 執行本機向量檢索
    await new Promise(resolve => setTimeout(resolve, 800)); // 模擬運算時間
    const searchResults = localVDB.search(userQuery, 2);
    
    // 階段 2：模擬生成 (Generation)
    indSearching.classList.add('d-none');
    agentStatus = 'generating';
    indGenerating.classList.remove('d-none');
    scrollToBottom();

    // 實作 RAG Prompt 打包邏輯：
    // 1. 取得使用者自訂的 System Prompt
    const currentSystemPrompt = inputSystemPrompt.value;

    // 2. 將 Vector DB 檢索結果組合成 Context String
    const contextItems = searchResults.map((r, i) => `[文件 ${i+1} - ${r.metadata.type}] ${r.text}`).join('\n');
    
    // 3. 組裝成最終要送給 LLM 的 Full Prompt
    const finalPromptToLLM = `${currentSystemPrompt}

【參考法規】
${contextItems || "無相關法規"}

【使用者問題】
${userQuery}

請回答：`;

    // 4. 準備顯示回覆
    const responseText = `這是在底層準備送給 WebGPU LLM 的完整提示詞 (Prompt)：\n\n${finalPromptToLLM}\n\n---\n🤖 系統分析：\n實務上，我們會將這整串文字交由瀏覽器內的 WebGPU 執行檔進行推論。您可以點擊右上角「進階設定」來修改 System Prompt，或者新增您自創的法規，馬上提問看看！`;
    
    // 建立系統訊息氣泡 (包含打字游標)
    const sysMessageEl = createMessageElement('system', '', true);
    const contentDiv = sysMessageEl.querySelector('.message-content');
    
    // 模擬打字機效果
    for (let i = 0; i <= responseText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        
        // 更新文字，保留打字游標
        contentDiv.innerHTML = responseText.slice(0, i) + '<span class="typing-cursor"></span>';
        
        // 偶爾往下捲動以防文字過長
        if (i % 20 === 0) scrollToBottom();
    }

    // 移除游標
    contentDiv.innerHTML = responseText;

    // 結束流程
    indGenerating.classList.add('d-none');
    agentStatus = 'idle';
    updateInputState();
    scrollToBottom();
});
