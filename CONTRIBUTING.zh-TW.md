# 貢獻於 OpenTicket

首先，感謝您考慮為 OpenTicket 做出貢獻！正是因為有您這樣的人參與，OpenTicket 才能成為網路安全社群中如此卓越的平台。

## 🤝 行為準則

參與本專案，系統將期望您遵守我們的 [行為準則](CODE_OF_CONDUCT.zh-TW.md)。如果您發現有任何不可接受的行為，請務必向維護人員回報。

## 🚀 開始使用

1. 在 GitHub 上 **Fork 儲存庫**。
2. 在本地端 **Clone 您的 Fork 分支**：
   ```bash
   git clone https://github.com/您的帳號/open-ticket.git
   cd open-ticket
   ```
3. **執行安裝腳本** 來安裝依賴套件、配置 `.env` 環境變數，並進行資料庫遷移：
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
4. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

## 💻 開發流程

### 分支命名

請根據您的修改性質，使用具描述性的分支名稱：
- `feat/` 用於新功能（例如：`feat/add-slack-webhook`）
- `fix/` 用於錯誤修復（例如：`fix/login-rate-limit`）
- `docs/` 用於文件更改
- `chore/` 用於日常維護任務（依賴更新、組態設定等）

### 程式碼風格

我們執行嚴格的程式碼標準，以維持企業級的程式品質：
- **TypeScript**：全域啟用嚴格模式 (Strict mode)。絕對不要使用 `any`。如有必要，請使用 `unknown` 並進行型別限縮 (type narrowing)。
- **ESLint**：請確保您的程式碼通過所有程式碼分析規則 (`npm run lint`)。
- **Prettier**：所有程式碼必須通過 Prettier 的格式化規範。

### 測試要求

- **所有新功能都必須包含對應的測試。**
- 在提交 PR 之前，請在本地端執行測試：`npm run test`
- 我們致力於維持高覆蓋率的測試環境，特別是針對具有資安敏感性的關鍵路徑（如：身分驗證、RBAC 權限管理、資料存取邊界）。

## 📥 Pull Request (PR) 提交流程

1. 確保您的 TypeScript 程式碼通過具有最高限制的嚴格模式檢查。絕對不要使用 `@ts-ignore` 或 `any` 來試圖繞過 `isolated-vm` 的沙盒安全邊界。
2. 如果您的分支修改了 `schema.prisma`，請確保您已在本地端使用 `npm run migrate:prod` 成功測試了整個遷移鏈 (Migration Chain)。
3. 當 SDK 負載結構 (Payload) 或 UI 佈局發生變化時，請務必同步更新 `README.zh-TW.md` 以及 `docs/API.md`。
4. 您的 PR 必須通過所有持續整合 (CI) 檢查（Linting、Tests、Build）。
5. 請完整填寫 Pull Request 範本。
6. 一旦獲得至少一位核心維護人員的核可 (Sign-off)，您便可以合併該 Pull Request。

## 🐛 回報錯誤 (Bugs)

系統錯誤會作為 GitHub Issues 進行追蹤。在建立 Issue 時，請使用提供的 Bug Report (錯誤報告) 範本，並包含以下資訊：
- 清晰且具描述性的標題。
- 能夠準確重現該問題的步驟。
- 您的環境詳細資訊（作業系統、瀏覽器、Node.js 版本、資料庫版本）。
- 預期行為 vs. 實際行為的落差。

## ⚖️ 授權與 CLA 簽署條款

OpenTicket 採用「雙軌授權模型」(AGPL-3.0 / Enterprise)。透過向此儲存庫提交貢獻，即代表您同意簽署我們的**貢獻者軟體授權協定 (Contributor License Agreement, CLA)**。這份 CLA 賦予 Cyber Sec Space 將您的貢獻作為企業版 (Enterprise Edition) 的一部份進行商業重新授權的權利，同時保障您的程式碼能永遠以 AGPL-3.0 的授權釋出給開源社群。

當您提交第一次的 Pull Request 時，我們的 CLA-Bot 將會自動跳出提示，要求您在 PR 被合併前，審閱並完成協定的數位簽署。
