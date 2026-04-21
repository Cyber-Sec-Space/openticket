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
2. **電子郵件**: 直接來信至我們的資安團隊 `security@cyber-sec.space`。若您的通報包含高度機敏的 Proof of Concept (PoC) 漏洞利用程式碼，強烈建議您使用我們的官方 PGP 金鑰進行加密 (Fingerprint: `XXXX XXXX XXXX XXXX`)。

### 提報時請包含以下內容：
- 漏洞的詳細描述與潛在影響範圍。
- 重現該問題的詳細步驟。
- 如果有的話，請附上概念驗證 (PoC) 的程式碼或截圖。
- 您針對該漏洞所建議的緩解措施。

## 測試規範與交戰準則 (Rules of Engagement)

為保護我們的正常維運與使用者資料，您的資安測試必須嚴格遵守以下準則：
- **僅允許本地測試 (Test Locally)**：絕對禁止對我們公開託管的正式上線網域 (Production) 進行任何形式的攻擊與測試。您必須自己在本地端 (Local) 架設測試隔離環境 (例如透過 `docker-compose up` 或使用我們提供的 `setup.sh`) 來進行研究。
- **禁止資料外洩 (No Data Exfiltration)**：請勿嘗試存取、竄改或刪除任何不屬於您自己測試帳號的使用者機敏資料。
- **禁止服務阻斷 (No Disruption)**：無論在何種情況下，都不允許對公有化環境進行阻斷服務攻擊 (DoS)，所有的資源耗竭測試皆只能在您自己的本機進行。
- **禁止殘留後門 (No Backdoors)**：在驗證漏洞的 PoC 後，請勿在系統或實體檔案系統內部殘留後門或是任何惡意負載 (Payloads)。

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
- 權限提升 (Privilege Escalation) (擊敗基於 PostgreSQL 嚴格型別 Enum 的自定義角色權限矩陣)
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
- 需要物理存取伺服器或資料庫硬體的攻擊。
- 針對 OpenTicket 使用者的社交工程攻擊 (例如：釣魚信件)。
- 需要大量外部網路流量的阻斷服務攻擊 (DoS/DDoS) (OpenTicket 架構設計上預設由外部 WAF/DDoS 清洗服務保護)。
- 建立在過時、不受支援的瀏覽器上的漏洞。
- 缺乏可重現 Proof of Concept (PoC) 的純理論漏洞。
- 第三方上游開源套件 (如：React, Prisma) 的原生漏洞。除非您能具體證明 OpenTicket 以不安全的方式呼叫並利用了該套件的缺陷。

## 安全港避風港條款 (Safe Harbor)

我們視任何遵守本政策進行的資安研究與漏洞揭露行為均為「已授權」的合法行為。我們絕對不會對遵守此指導原則的資安研究員採取或支持任何法律行動。若有第三方因您遵守本政策的研究行為而對您發起法律訴訟，我們將會主動聲明您的行為是符合本專案授權條款的。

## 漏洞懸賞與獎勵 (Rewards / Bug Bounty)

目前 OpenTicket 是一個非營利的開源專案，我們現階段無法提供實質的現金懸賞 (Monetary Bug Bounties)。然而，對於有效且嚴重的漏洞揭露，我們非常樂意在榮譽榜 (Hall of Fame)、CVE 報告與 Release Notes 表彰您的貢獻。

## 榮譽榜與鳴謝 (Hall of Fame / Credits)

我們非常感謝以負責任的態度進行漏洞揭露的資安研究員。當修補程式發佈時，我們非常樂意（在取得您同意的前提下）在我們的資安公告與版本發行說明 (Release Notes) 中署名並向您致敬。
