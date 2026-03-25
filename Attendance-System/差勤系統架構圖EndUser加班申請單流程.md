---
title: 差勤系統架構圖
markmap:
  colorFreezeLevel: 2

---

# 線上簽核
- 簽核作業
    - 待簽核文件列表(for user)
    - 被駁回文件列表(for user)
    - 審核中文件列表(for user)
- 簽核查詢(for user)
    - 我代送出的文件(for user)
    - 我曾簽過的文件(for user)
    - 屬於我的文件(for user)
# 到離職
- 功能設定
    - 計畫資料維護(for user)
- 查詢統計(for user)？？？
    - SALS介接資料查詢(for user)
    - 公務人員履歷表套印(for user)
    - 公務員經營及兼職查詢(for user)
    - 到職啟動匯入失敗名單(for user)
    - 保密規範書查核(for user)
    - 研究助理身分轉換申請查詢(for user)
    - 研究助理經歷紀錄查詢(for user)
    - 研究助理辭職申請查詢(for user)
    - 健保批次檔(for user)
    - 部定教職登錄表(for user)
    - 單位公務員經營及兼職查詢(for user)
    - 智財歸屬同意書查核(for user)
    - 廉政倫理事件查詢(for user)
    - 業務承辦查詢設定(for user)
    - 業務承辦流程查詢(for user)
    - 預定到職名單(for user)
    - 預定離職名單(for user)
    - 機關到職檢附檔案下載(for user)
    - 應到未到名單(for user)
    - 醫療互助金名冊查詢(for user)
    - 離職原因調查表單統計(for user)
    - 證照查詢(for user)
    - 護理部機關到職檢附檔案下載(for user)
- 個人申請
    - 離職流程啟動(for user)
    - 身分轉換申請單(for user)
    - 留職停薪申請(for user)
    - 回職復薪申請單(for user)
    - 兼職(課)申請(for user)
    - 員工經營商業及兼職情形調查表(for user)
    - 中、英文在職(服務)證明申請(for user)
    - 職名章/處方章申請(for user)
    - 英文財力證明申請(for user)
    - 研究助理身分轉換申請單(for user)
    - 廉政倫理事件登錄表(for user)
    - 員工用餐開卡申請(for user)
    - 遺失損壞或毀滅公有財物責任賠償申請(for user)
    - 文件(資料)套印(for user)




# 人事差勤
- 表單申請
    - 代理移轉(for user)
    - 出國開會/進修登記(for user)
    - 出勤異常回覆單(for user)
    - 加班申請(for user) -->加班開始 ![](https://markmap.js.org/favicon.png)
        - 加班申請單 -->一般加班 ![](https://markmap.js.org/favicon.png)
            - 未來式的加班申請可以送出
                - 經過一二級主管的簽核
                    - 辦單成立之後，程式會回去稽核你的班表，你的刷卡時間，你的加班單時間
                        - 加班單成立之後
        - 加班申請單 -->專案加班 ![](https://markmap.js.org/favicon.png)
            - 未來式的加班申請可以送出
                - 經過一二級主管的簽核
                    - 辦單成立之後，程式會回去稽核你的班表，你的刷卡時間，你的加班單時間
                        - 加班單成立之後
        - 個人加班查詢
        - 個人事後附檔
    - 召回申請單(for user)
    - 表單進度查詢及銷假(for user)
    - 值班互換/代理單(for user)
    - 值班互換單(for user)
    - 國內差假申請(for user)查看加班餘額
    - 國外差假申請(for user)
    - 漏未刷卡申請單(for user)
    - 暫存假單列表(for user)
    - 調班申請單(for user)
- 紀錄查詢
    - 每週行程表(for user)
    - 個人紀錄查詢(for user)
        - 個人出勤查詢(for user)
        - 個人出勤異常查詢(for user)
        - 個人差假查詢(for user)
        - 個人休假查詢(for user)
        - 個人加班查詢(for user)
        - 個人補休紀錄查詢(for user)
        - 個人代理期間查詢(for user)
        - 個人人事後附檔(for user)




- 基本設定
    - 個人基本資料顯示(for user)
    - 個人職務代理人(for user)
    - 個人辭庫管理(for user)
    - 維護我的最愛(for user)
    - 加班規則設定-編輯(有詳細的加班規則表) ![](https://markmap.js.org/favicon.png)

- 費用申請
    - 分配加班時數(for護理部)可勾選合併時數
    - 加班申請跟時數合法，這兩者目前是雙軌並行
    - 系統通常在凌晨計算加班時數

# 人才培育
- 人才培育
    - 申請出國開會訪查(for user)
    - 申請出國進修研究實習(for user)
    - 赴大陸地區申請表(不含港澳)(for user)
    - 赴陸人員返台通報表(for user)
    - 國內進修研究實習申請(for user)
    - 派外訓練申請單(for user)
