/**
 * 臺北榮民總醫院 人事室 - 導航欄組件 (Web Component)
 */
class PoNavbar extends HTMLElement {
    connectedCallback() {
        this.render();
        // 渲染後綁定下拉選單事件
        this.setupDropdown();
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
                    
                    <!-- 右側按鈕區域：新增下拉選單與原有的按鈕 -->
                    <div class="flex items-center space-x-3">
                        <!-- 更多資訊下拉選單 -->
                        <div class="relative">
                            <button id="more-info-btn" class="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-700 text-[11px] font-bold tracking-wider hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 shadow-sm flex items-center space-x-1">
                                <span>更多資訊</span>
                                <i id="dropdown-icon" class="fa-solid fa-chevron-down text-[10px] transition-transform duration-300"></i>
                            </button>
                            
                            <!-- 下拉選單內容 (預設隱藏) -->
                            <div id="dropdown-menu" class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 hidden opacity-0 transform scale-95 transition-all duration-200 origin-top-right z-50">
                                <div class="py-2">
                                    <div class="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">相關資源</div>
                                    <a href="https://www.vghtpe.gov.tw/" target="_blank" class="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">臺北榮總官網</a>
                                    <a href="http://wd.vghtpe.gov.tw/per/" target="_blank" class="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">臺北榮總人事室</a>
                                    <a href="https://mermaid.js.org/intro/syntax-reference.html" target="_blank" class="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Mermaid 語法指南</a>
                                    <a href="https://www.markdownguide.org/" target="_blank" class="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Markdown 語法指南</a>
                                    <a href="./components/shifting-painpoint.html" target="_blank" class="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Markdown 語法指南</a>
                                    <a href="https://nature.leno-1.com/game_of_life/" target="_blank" class="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">小遊戲：數位繁衍</a>

                                    

                                </div>
                            </div>
                        </div>

                        <!-- 原本的聯絡資訊按鈕 -->
                        <button onclick="window.toggleModal(true)" 
                           class="px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-600 text-[11px] font-bold tracking-wider hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 shadow-sm active:scale-95">
                            by Leno Tsai
                        </button>
                    </div>
                </div>
            </nav>
        `;
    }

    setupDropdown() {
        const btn = this.querySelector('#more-info-btn');
        const menu = this.querySelector('#dropdown-menu');
        const icon = this.querySelector('#dropdown-icon');
        let isOpen = false;

        const toggleMenu = () => {
            isOpen = !isOpen;
            if (isOpen) {
                menu.classList.remove('hidden');
                // 確保 display: block 生效後再觸發過渡動畫
                setTimeout(() => {
                    menu.classList.remove('opacity-0', 'scale-95');
                    menu.classList.add('opacity-100', 'scale-100');
                    icon.classList.add('rotate-180');
                }, 10);
            } else {
                menu.classList.remove('opacity-100', 'scale-100');
                menu.classList.add('opacity-0', 'scale-95');
                icon.classList.remove('rotate-180');
                // 等待動畫結束後隱藏
                setTimeout(() => {
                    if (!isOpen) menu.classList.add('hidden');
                }, 200);
            }
        };

        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止點擊事件冒泡到 document
            toggleMenu();
        });

        // 點擊外部關閉選單
        document.addEventListener('click', (e) => {
            if (isOpen && !this.contains(e.target)) {
                toggleMenu();
            }
        });
    }
}

// 註冊組件
if (!customElements.get('po-navbar')) {
    customElements.define('po-navbar', PoNavbar);
}