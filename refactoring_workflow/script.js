/**
 * 切換 CaD (考古) 與 DaC (設計) 的展示視圖
 * @param {string} type - 'cad' 或 'dac'
 */
function toggleExample(type) {
    const cadView = document.getElementById('view-cad');
    const dacView = document.getElementById('view-dac');
    const cadBtn = document.getElementById('btn-cad');
    const dacBtn = document.getElementById('btn-dac');

    if (type === 'cad') {
        // 顯示 CaD 隱藏 DaC
        cadView.classList.remove('hidden');
        setTimeout(() => cadView.classList.replace('opacity-0', 'opacity-100'), 10);
        
        dacView.classList.add('hidden');
        dacView.classList.replace('opacity-100', 'opacity-0');
        
        cadBtn.classList.add('active');
        dacBtn.classList.remove('active');
    } else {
        // 顯示 DaC 隱藏 CaD
        dacView.classList.remove('hidden');
        setTimeout(() => dacView.classList.replace('opacity-0', 'opacity-100'), 10);
        
        cadView.classList.add('hidden');
        cadView.classList.replace('opacity-100', 'opacity-0');
        
        dacBtn.classList.add('active');
        cadBtn.classList.remove('active');
    }
}

/**
 * 捲動至對應步驟並高亮該卡片
 * @param {number} index - 步驟索引 (0-3)
 */
function scrollToStep(index) {
    // 取消目前所有高亮
    document.querySelectorAll('.flow-card').forEach(card => card.classList.remove('active'));
    
    // 獲取目標卡片
    const target = document.getElementById(`step-${index}`);
    if (target) {
        // 高亮目標
        target.classList.add('active');
        // 平滑捲動至視窗中間
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 可選：初始化時確保第一個按鈕處於正確狀態
document.addEventListener('DOMContentLoaded', () => {
    // 預設行為
});
