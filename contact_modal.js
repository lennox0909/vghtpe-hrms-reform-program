/**
 * 聯絡資訊彈窗控制邏輯
 */

/**
 * 全域 Modal 控制函數
 * 讓 top_banner.js 內的按鈕或其他組件可以直接透過 window.toggleModal 進行通訊
 * @param {boolean} show - 是否顯示彈窗
 */
window.toggleModal = function(show) {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    
    if (show) {
        modal.classList.remove('modal-hidden');
        document.body.style.overflow = 'hidden'; // 防止背景捲動
    } else {
        modal.classList.add('modal-hidden');
        document.body.style.overflow = ''; // 恢復捲動
    }
};

// 監聽鍵盤事件：按下 Esc 鍵時關閉彈窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.toggleModal(false);
    }
});
