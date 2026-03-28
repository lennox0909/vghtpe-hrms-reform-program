/**
 * 切換聯絡資訊彈出視窗
 * @param {boolean} show - 是否顯示
 */
function toggleModal(show) {
    const modal = document.getElementById('contact-modal');
    if (show) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
    }
}

/**
 * 切換 CaD / DaC 範例視圖
 */
function toggleExample(type) {
    // 原有的 toggleExample 邏輯...
}

/**
 * 滾動至對應步驟
 */
function scrollToStep(index) {
    // 原有的 scrollToStep 邏輯...
}
