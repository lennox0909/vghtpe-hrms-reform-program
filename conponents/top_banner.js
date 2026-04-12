/**
 * 臺北榮民總醫院 人事室 - 導航欄組件 (Web Component)
 * 定義自定義標籤 <po-navbar></po-navbar>
 */
class PoNavbar extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <nav class="bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 px-6 sticky top-0 z-50">
                <div class="max-w-7xl mx-auto flex justify-between items-center">
                    <!-- 左側標題區域 -->
                    <div class="flex items-center space-x-3 group">
                        <div class="bg-blue-600 p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-md shadow-blue-200">
                            <i class="fa-solid fa-hospital-user text-white text-xl"></i>
                        </div>
                        <div>
                            <span class="font-bold text-lg block leading-none text-slate-900 tracking-tight">臺北榮民總醫院 人事室</span>
                            <span class="text-[9px] text-slate-400 font-medium tracking-[0.15em] uppercase mt-1 block">Personnel Office Digital Transformation</span>
                        </div>
                    </div>
                    
                    <!-- 右側按鈕區域：點擊觸發全域 toggleModal 函數 -->
                    <div class="flex items-center">
                        <button onclick="window.toggleModal(true)" 
                           class="px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-600 text-[11px] font-bold tracking-wider hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 shadow-sm active:scale-95">
                            by Leno Tsai
                        </button>
                    </div>
                </div>
            </nav>
        `;
    }
}

// 註冊組件
if (!customElements.get('po-navbar')) {
    customElements.define('po-navbar', PoNavbar);
}