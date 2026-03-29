
1. **HTML**：建立了一個卡片容器、標題、文字段落和一個互動按鈕。
2. **CSS**：使用了 CSS 變數（Variables）來管理顏色，設計了圓角、陰影、懸停動畫，並準備了深色模式 (`.dark-mode`) 的配色。
3. **JavaScript**：監聽按鈕的點擊事件，動態切換網頁的深淺色主題，並自動更改按鈕上的文字。

如果你之後在自己的開發環境（例如 VS Code）中，想要分成三個檔案，只需要：
* 把 `<style>...</style>` 裡面的內容放進 `style.css`，然後在 HTML 中用 `<link rel="stylesheet" href="style.css">` 引入。
* 把 `<script>...</script>` 裡面的內容放進 `script.js`，然後在 HTML 底部用 `<script src="script.js"></script>` 引入即可！
