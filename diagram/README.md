# 臺北榮民總醫院 人事室 心智圖 **mindmap** 線上編輯工具
- by Leno Tsai
- [臺北榮民總醫院人事室 心智圖線上編輯工具](https://mindmap.leno-1.com/)
- inspired by [markmap project](https://github.com/markmap/markmap)
- 編輯器：使用 `markdown` 語法，因此另存檔案時的附檔名為 `.md`
- 此工具為 `Web App`，使用瀏覽器的緩存功能，即時暫存使用者的工作階段。
- 此工具不收集使用者資訊。

## Project Tree

```text
diagram/            # 專案根目錄
│
├── index.html                    # 主頁面結構檔案 (系統入口)
│
├── css/                          # CSS 樣式模組目錄
│   ├── animations.css            # 負責動態提示框 (Toast) 等動畫效果
│   ├── mermaid-fixes.css         # 負責修復圖表溢出、文字標籤樣式與幽靈色塊
│   └── scrollbar.css             # 負責全域滾動條的自訂美化
│
└── js/                           # JavaScript 邏輯模組目錄
    ├── config.js                 # 集中管理 DOM 節點參考與全域常數 (如 STORAGE_KEY)
    ├── file-io.js                # 專責處理 Markdown (.md) 與純文字 (.txt) 的匯入與匯出
    ├── image-export.js           # 專責處理 SVG/PNG 下載、字體補丁與高畫質轉換
    ├── layout.js                 # 處理側邊欄開關、滑鼠與觸控的版面拖曳調整
    ├── main.js                   # 主程式進入點，負責初始化各模組並綁定全域事件
    ├── renderer.js               # 核心引擎：Markdown 解析、隱形字元過濾與 Mermaid 渲染
    ├── tailwind.config.js        # Tailwind CSS 的客製化設定 (如自訂顏色、深色模式)
    ├── theme.js                  # 處理深淺色主題切換與 Mermaid 的初始化設定
    └── utils.js                  # 提取共用工具 (如 Toast 提示、檔案下載觸發器、彈窗)
```