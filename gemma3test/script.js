// 產生一個 1 到 100 之間的隨機數字
let secretNumber = Math.floor(Math.random() * 100) + 1;

// 取得輸入框和結果顯示區域的元素
const guessInput = document.getElementById("guessInput");
const submitButton = document.getElementById("submitButton");
const resultDiv = document.getElementById("result");

// 提交按鈕點擊事件處理函式
submitButton.addEventListener("click", function() {
    // 取得使用者輸入的數字
    const guess = parseInt(guessInput.value);

    // 檢查使用者輸入是否有效
    if (isNaN(guess) || guess < 1 || guess > 100) {
        resultDiv.textContent = "請輸入 1 到 100 之間的數字。";
        guessInput.focus(); // 將焦點設定到輸入框，方便使用者直接輸入
        return;
    }

    // 判斷猜測是否正確
    if (guess === secretNumber) {
        resultDiv.textContent = "恭喜你，猜對了！";
    } else if (guess < secretNumber) {
        resultDiv.textContent = "太小了！";
    } else {
        resultDiv.textContent = "太大了！";
    }

    // 清空輸入框
    guessInput.value = "";
    guessInput.focus(); // 將焦點設定到輸入框，方便使用者繼續猜測

});

// 鍵盤 Enter 鍵事件處理函式
guessInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        submitButton.click(); // 模擬點擊提交按鈕
    }
});
