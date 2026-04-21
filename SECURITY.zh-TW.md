# 資安政策 (Security Policy)

資訊安全是 OpenTicket 的核心基石。作為一個資安事件與威脅管理平台，我們嚴肅對待所有安全性漏洞，並由衷感謝資安研究員與社群在協助我們保護平台安全方面所付出的努力。

[🌐 Read in English](SECURITY.md)

## 支援的版本 (Supported Versions)

我們僅針對當前的主要發行分支 (Release Branch) 提供安全性更新。

| 版本號 (Version) | 是否支援 (Supported) |
| -------------- | ------------------ |
| 1.0.x          | :white_check_mark: |
| 0.5.x          | :white_check_mark: |
| < 0.5.x        | :x:                |

## 如何提報漏洞 (Reporting a Vulnerability)

**請絕對不要透過公開的 GitHub Issues 提報安全性漏洞。**

如果您認為自己在 OpenTicket 中發現了安全性漏洞，請透過以下其中一種管道私下向我們進行提報：

1. **GitHub Security Advisories**: 點擊本儲存庫 [Security 標籤頁](https://github.com/Cyber-Sec-Space/open-ticket/security/advisories) 中的 "Report a vulnerability" 按鈕。
2. **電子郵件 (Email)**: 直接聯絡我們的資安團隊 `security@cyber-sec.space`。

### 提報時請包含以下內容：
- 漏洞的詳細描述與潛在影響範圍。
- 可重現該問題的完整步驟。
- 概念性驗證 (PoC, Proof of Concept) 腳本或相關的截圖佐證。
- 任何建議的緩解措施 (Mitigations)。

### 回應時程表
- 我們將在收到漏洞提報後的 **72 小時** 內進行初步確認與回覆。
- 我們的目標是在 **30 天** 內釋出修補程式或提出緩解計畫。
- 當漏洞修補完畢並且安全性通告 (Security Advisory) 發佈後，我們會主動通知您。

## 懸賞範圍 (Scope)

作為一個基於「零信任架構 (Zero-Trust architecture)」的高度強化企業級平台，我們尤其歡迎任何針對我們原生防禦機制 (Mitigation Layers) 的高難度繞過 (Bypasses) 測試。

**涵蓋範圍 (In Scope)**:
- 遠端程式碼執行 (RCE, Remote Code Execution)
- 伺服器端請求偽造 (SSRF) 繞過 (擊破我們的 IP 凍結與 DNS Rebinding 攔截保護)
- 跨站腳本攻擊 (XSS) (包含繞過外掛 UI 注入層的 `isomorphic-dompurify` 清洗防禦)
- 身分驗證與授權繞過 / 越權存取 / BOLA / IDOR (包含 Next.js Edge 代理層繞過 或 Setup Wizard 初始劫持)
- MFA / 2FA 繞過 (擊破系統基於 TOTP 的強制二階段驗證)
- 權限提升攻擊 (擊破我們基於 JSON 矩陣的自訂角色存取控制 Role-Based Access Control)
- SQL 注入 / Prisma 注入
- 擴充外掛引擎之沙盒逃逸 (Sandbox Escapes) (成功穿透 `isolated-vm` 隔離、`Promise.race` 5000ms 炸彈或 128MB 實體記憶體天花板)
- AST 靜態語法預檢規避 (在部署外掛時成功繞過 TypeScript AST 的靜態惡意語法攔截)
- 原型污染 (Prototype Pollution) 或 SDK 驗證繞過 (擊破 `api.*` 方法中的 Zod 嚴格驗證)
- 頻率限制 (Rate-Limiting) 繞過 (擊破我們依賴資料庫的分散式限流模組，進而達成密碼噴灑或撞庫攻擊)
- CSV 注入 / DDE 漏洞 (在遙測資料匯出時，成功繞過 `=`、`+`、`-`、`@` 的跳脫防禦)
- SMTP 標頭注入 / 電子郵件欺騙 (繞過我們的 Multi-Provider Mailer 通知抽象層)
- 目錄穿越 / 任意檔案上傳 (Path Traversal / Arbitrary File Upload) (成功繞過我們內建的嚴格副檔名檢驗與密碼學檔名隔離機制)
- 機敏資料外洩 (Information Disclosure) (例如外洩 Token、密碼 Hash、AES-256-GCM Vault 金庫負載或 PII)

**不涵蓋範圍 (Out of Scope)**:
- 需要實際接觸伺服器硬體或實體資料庫才能觸發的漏洞。
- 針對 OpenTicket 使用者進行的社交工程攻擊 (Social engineering / Phishing)。
- 需要巨量外部網路頻寬的阻斷服務攻擊 (Volumetric DoS) (OpenTicket 的架構設計假定此類攻擊將由外部 WAF/DDoS 防護機制吸收處理)。
- 過時且不受支援的瀏覽器中所特有的漏洞。
- 無法提供重現步驟或 PoC 的純理論型漏洞。

## 榮譽榜與致謝 (Hall of Fame / Credits)

我們誠摯地感謝那些負責任地進行漏洞揭露的資安研究員。當修補程式發佈時，我們非常樂意（在取得您的同意下）將您的名字標註在我們的資安通報與 Release Notes 中，以表彰您的貢獻。
