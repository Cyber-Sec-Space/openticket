# OpenTicket

<p align="center">
  <img src="./public/banner.png" alt="OpenTicket Banner" width="100%">
</p>

[🌍 官方文件網站 (Official Webpage)](https://openticket.cyber-sec.space) | [🌐 Read in English](README.md) | [🏗️ 架構設計書 (Architecture Specs)](docs/ARCHITECTURE.zh-TW.md) | [🔌 外掛註冊庫 (Plugin Registry)](https://github.com/Cyber-Sec-Space/openticket-plugin-registry)

![License](https://img.shields.io/badge/License-AGPLv3%20%2F%20Enterprise-blue.svg)
![Version](https://img.shields.io/badge/version-v1.0.0--rc.1-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?logo=prisma)

專為資安維運 (SecOps) 與 IT 團隊打造的次世代資安事件與資產集中管理系統。作為 Jira 或 ServiceNow 等企業級 IT 工單系統的輕量化、視覺化替代方案而生。

## ✨ 核心特色

- **絕對邊界零信任防禦 (Edge Perimeter)：** 所有路由（包含 API）皆受到 Next.js Edge Middleware 代理 (`proxy.ts`) 主動攔截保護。未通過認證的請求會在 Edge 層被直接拒絕，根本不會到達 Node.js Runtime，構成硬化的 L7 防禦邊界。
- **分散式速率限制 (No Redis)：** 採用資料庫驅動的雙向量速率限制器，同時追蹤來源 IP 與目標帳號的鎖定次數，無須 Redis 即可原生阻擋暴力破解、credential stuffing 與分散式密碼噴灑 (Password Spraying) 攻擊。
- **TOTP 雙重驗證 (2FA) 與帳戶安全：** 內建基於 Edge 密碼學的 2FA 模組，以 `otpauth` 與 QR Code 註冊，支援全域強制開啟。包含管理員 SMTP 密碼重設、透過已簽署 Join URL 的操作員邀請機制，以及完整的電子郵件驗證流程。
- **免疫 DNS Rebinding 與 SSRF 阻擊：** Webhook 引擎在派發前會預先解析 DNS 並凍結目標 IPv4 位址。全面涵蓋 `127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、鏈結本地 `169.254.169.254` 及 IPv6 迴環的封鎖清單，防止內網 VPC 被穿透。
- **Postgres 原生 GIN 全文檢索：** 採用 PostgreSQL 原生的 `to_tsvector` 與 GIN 索引結構（透過 `npm run indexing` 部署），即便資料庫中塞滿事件與漏洞，搜尋仍能保持毫秒級的流暢回傳。
- **零信任沙盒與外掛生態 (isolated-vm)：** 第三方外掛被五道原生防線鎖進沙盒：`isolated-vm` 128MB 記憶體上限、5000ms 時間炸彈執行限制、安裝前的 **AST 語法樹預防機制 (Pre-flight Validation)**、密碼學簽章驗證、以及所有 SDK 操作的 Zod Schema 強制驗證。
- **高解析外掛 UI 擴充 (Plugin UI Injection)：** 透過 Plugin SDK 定義的精準 UI Hook 攔截點，外掛能將互動式 React 元件原生注入至 Dashboard、事件、資產、漏洞、使用者、設定及系統設定頁面。官方認證的外掛具備密碼學驗證「藍勾勾」標章。外掛還可以註冊全新的完整頁面路由與系統設定分頁。
- **ITSM & SOAR 自動化引擎：** 基於可配置的嚴重程度對照時數矩陣（事件與漏洞各自獨立），自動計算與追蹤 SLA 目標。當遭遇 CRITICAL 事件時，能觸發自動隔離機制，將關聯的 Asset 瞬間轉移為 `COMPROMISED` 狀態並透過 SMTP 與 Webhook 觸發全域廣播。同時支援多重資產關聯 (Multi-Asset Correlation)。
- **數位證據上傳與免疫 DDE 的 CSV 匯出：** 專屬的拖曳式檔案上傳元件處理數位證據附件，並搭配嚴格的 MIME 驗證。原始資料 CSV 匯出引擎會清理所有欄位前綴（`=`、`+`、`-`、`@`、`\t`、`\r`），確保絕對免疫 CSV 注入 (DDE) 攻擊。
- **機器自動化識別 (Personal Access Tokens, PAT)：** 內建專屬的 API Key 管理介面，讓操作員生成、追蹤並撤銷經 SHA-256 雜湊的自動化金鑰（可選到期日）。金鑰繼承發行者的 RBAC 權限，並在 Edge 層先行驗證後才交由 Node.js 處理。
- **動態細粒度權限矩陣 (Dynamic Granular Permission Matrix)：** 原生的進階 RBAC 權限隔離機制，支援高達 30 種以上的原子級權限設定，涵蓋事件、漏洞、資產、使用者、角色、外掛、API Token 及系統設定。人員能同時疊加複數自訂角色標籤。
- **多重郵件發送引擎 (Multi-Provider Mailer)：** 原生支援三種郵件遞送通道 — 傳統 SMTP (via Nodemailer)、Resend API 以及 SendGrid API — 全部可從系統設定介面配置。SMTP 密碼與 API 金鑰皆採 AES-256-GCM 加密存儲。
- **賽博龐克 UI 與 LocalTime 時區同步：** 採用專屬的骨架屏 (Skeleton loaders) 與客戶端 `LocalTime` 元件，所有時間戳記自動以操作員的本地時區顯示，消除分散式 SOC 團隊的時區混亂。

---

## 🚀 應用範例與使用情境 (Examples & Usage)

### 1. 通報資安事件 (Declaring an Incident)
當一位具備 `CREATE_INCIDENTS` 權限的維運人員發現潛在威脅時：
- 在主控台點擊 **"Declare Incident (通報事件)"**。
- 輸入事件特徵 (舉例：*Port 443 發現可疑的外部連線流量*)。
- 透過多選器選擇相關聯的 **Target Node (事件標的資產)** (舉例：*SRV-WEB-01*)。
- 指定相對應的 **事件拓樸 (Typology)** (舉例：*釣魚信件 Phishing, 惡意軟體 Malware, 網路異常 Network Anomaly*)。

### 2. 登錄與追蹤系統漏洞 (Triaging Vulnerabilities)
漏洞追蹤模組直接鏡像了系統的資產庫：
- 前往 **"Log Vulnerability (登錄漏洞)"**。
- 輸入該漏洞正式的 `CVE-ID` 以便立案，並選定其 CVSS 嚴重程度。
- 將該漏洞指派給具體的系統節點 (Asset)。送出後，主控台的 *Vulnerability Heatmap (漏洞嚴重性熱圖)* 會立刻動態更新。

### 3. 機器自動化介接 (Machine-to-Machine API Tokens)
您可以將 OpenTicket 直接與 CI/CD 管道或企業內部的 SOAR 自動化劇本串接。
- 前往 **"Identity Preferences (身分設定) → API Tokens"** (帳戶需具備 `ISSUE_API_TOKENS` 權限)。
- 生成一組受密碼學保護的自動化金鑰 (例如命名為：*GitHub Actions Push*)。
- 在外部腳本呼叫 `/api/incidents` 或 `/api/assets` 端點時，將其帶入 Header：`Authorization: Bearer <token>`。該呼叫將自動繼承生成該金鑰者的既有伺服器權限。

### API 與系統整合
- **零信任 Hook 引擎 (Zero-Trust Hook Engine)**：非同步的事件總線架構，涵蓋 `onIncidentCreated`、`onAssetCompromise`、`onIncidentResolved` 等 18 種以上的 Hook 事件，能在背景安全執行第三方程式碼。每次執行皆受到 `isolated-vm` 128MB 記憶體隔離與 5000ms `Promise.race` 時間炸彈保護。
- **外部沙盒外掛編排 (External Plugin Sandbox Orchestration)**：透過 UI 驅動的外掛市集，一鍵橋接 Jira 雙向同步、外部 SOC 監聽器或 Slack/Teams Webhooks。所有外掛都強制進入「權限交集審查 (Manifest Intersections)」，必須由管理員手動核准最小運行權限。
- **加固 M2M 機器金鑰 (Secure M2M Key Cryptography)**：面對資料庫洩露具備絕對抗性。機器介接金鑰採用不可逆 SHA-256 雜湊存儲，第三方整合參數庫皆透過 `AES-256-GCM` 加密封裝至保險庫。
- **登入限流與撞庫防禦 (Brute Force & Rate Limiting)**：透過資料庫驅動的雙向量存取源精準頻率限制（IP 向量 × 帳號向量），防止分散式密碼噴灑耗盡核心伺服器資源。

---

## 🛠️ 核心技術堆疊
- **框架：** Next.js 16.2 (使用 App Router 與 Server Actions 架構)
- **資料庫：** PostgreSQL 15 (透過 Prisma ORM V6 驅動) + PgBouncer
- **身份驗證：** Auth.js v5 (NextAuth.js) / bcrypt / OTPAuth
- **樣式與核心元件：** TailwindCSS v4, Lucide React, Shadcn/UI
- **資料視覺化：** Recharts v3
- **輸入驗證：** Zod v4
- **XSS 消毒：** isomorphic-dompurify
- **外掛沙盒：** isolated-vm
- **安全掃描供應鏈：** Snyk

---

## 🚀 快速啟動 (安裝說明)

OpenTicket 提供三種無痛部屬方式：**完全容器化** (建議用於生產環境)、**快速啟動腳本** (建議用於本地開發)、以及**預編譯獨立包**。

### 選項 A: 完全容器化部署 (Docker 企業方案)
這是運行 OpenTicket 最簡單的方式，透過 Docker Compose 將會自動配置 PostgreSQL 資料庫、非同步調度獨立的 Migrator 遷移管線、掛載 PgBouncer 連線池，並啟動最佳化的 Next.js 獨立容器 (Standalone)。

```bash
# 確保您已從安全範本複製了環境變數
cp .env.example .env

# 啟動堆疊 (Migrator 會自動運行)
docker-compose up -d --build
```
*您的應用程式將會啟動在 `http://localhost:3000`。任何時候都可以透過 `docker-compose down` 來將其關閉。*

### 選項 B: 本地開發腳本 (Bare-Metal)
如果您偏好直接在本地主機執行 Node.js，只需執行啟動腳本。它會以互動式的方式為您配對 `.env` 環境變數、安裝依賴套件並執行 Prisma 遷移。

```bash
# 請確保您的本機已經有空的 PostgreSQL 實例在運行
chmod +x setup.sh
./setup.sh

# 啟動開發伺服器
npm run dev
```

> **本地郵件攔截**：建議在本地開發時使用 [MailDev](https://github.com/maildev/maildev) 作為安全的 SMTP 攔截器。所有系統外發郵件（Setup OTP、事件指派、自動隔離警報）都會被攔截，可在 `http://localhost:1080` 檢視。

### 選項 C: 預編譯 Standalone 獨立包 (生產環境 / 極簡部屬)
對於內部受限無法使用 Docker，但仍需要極度最佳化生產環境部屬的網路，OpenTicket 在 [GitHub Releases](https://github.com/Cyber-Sec-Space/open-ticket/releases) 提供了預先編譯好的 Standalone 獨立封裝包。
這個 `.tar.gz` 壓縮包內含了 Next.js 編譯並優化後的 `.next/standalone` 輸出庫，完全不需要在正式環境手動執行耗時的 `npm install`。

```bash
# 1. 從 GitHub Releases 下載 Standalone 獨立壓縮包
wget https://github.com/Cyber-Sec-Space/open-ticket/releases/download/v1.0.0-rc.1/openticket-standalone-v1.0.0-rc.1.tar.gz

# 2. 解壓縮
tar -xzf openticket-standalone-v1.0.0-rc.1.tar.gz
cd openticket-standalone

# 3. 設定您的環境變數 (.env)
cp .env.example .env
nano .env # 請務必設定好 DATABASE_URL 與 AUTH_SECRET

# 4. 對您準備好的 PostgreSQL 資料庫執行架構遷移
npx prisma migrate deploy

# 5. 原生啟動 Node.js 生產端伺服器進程
node server.js
```

---

### ⬆️ 跨代版本無痛升級 (直升 1.0.0-rc.1)
版本 `1.0.0-rc.1` 徹底完善了龐大的 **零信任外掛架構 (Plugin SDK)**、**SOAR SLA 引擎** 以及 **PgBouncer** 基礎設施，這些都是建築在先前強大的 RBAC 改朝換代之上。
為避免跨代升級時 PostgreSQL 造成的永久性欄位丟失，OpenTicket 在底層實作了向後相容的冪等 (Idempotent) 防護。

若您使用的是 Docker 環境，當您下達 `docker-compose up` 啟動時，內部的 `migrate:prod` 鍊式腳本會自動幫您處理所有的相依轉換。
如果您是裸機 (Bare-Metal) 安裝者，請您**務必**手動執行專屬的升級腳本。它會為您舊有的事件與弱點回溯計算 (Retroactively Calculate) 遺失的 SLA 目標時間，並精準灌入最新的系統權限：

```bash
# Chains: backup → prisma migrate → upgrade:0.4.0 → 0.5.0 → 0.5.2 → 1.0.0-rc.1 → indexing
npm run migrate:prod
```

### 🪄 首次啟動引導精靈
無論您選擇上述哪一種部屬方式，當您首次進入 `http://localhost:3000` 時，系統會自動將您重新導向至**系統初始化精靈 (`/setup`)**。這將引導您安全地註冊全系統第一位最高權限管理員 (Global System Administrator)，包含 SMTP 配置與電子郵件 OTP 驗證。

---

## 🔒 安全架構 (Security Architecture)

- **保險庫加密 (Vulnerability Vaulting)**：所有外掛組態皆透過 `AES-256-GCM` 加密存儲，搭配衍生自 `AUTH_SECRET` 的版本化旋轉金鑰保險庫 Schema。
- **網路隔離 (Network Isolation)**：Webhook 引擎透過預解析 IP 凍結機制，嚴格執行 SSRF 防護，涵蓋 `127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` 及本地 DNS 解析。
- **安全標頭 (Security Headers)**：所有回應皆包含 `Strict-Transport-Security`、`X-Frame-Options: SAMEORIGIN`、`X-Content-Type-Options: nosniff`、`Referrer-Policy` 以及嚴格的 `Permissions-Policy`。
- **外掛安全模式 (Plugin Safe Mode)**：當外掛故障導致系統無法啟動時，執行 `npm run plugin:reset` 即可在資料庫層級停用所有外掛。

---

## 📖 文件資源 (Documentation)

- [REST API 文件](docs/API.md) — 將 OpenTicket 與外部工具及 SOAR 劇本整合。
- [架構設計書](docs/ARCHITECTURE.zh-TW.md) — 系統設計、資料流及安全邊界的深度解析。
- [貢獻指南](CONTRIBUTING.md) — 本地開發、程式碼風格規範及 PR 流程。
- [安全政策](SECURITY.zh-TW.md) — 負責任揭露漏洞的方式。

---

## 💼 雙重授權 (Dual Licensing)

OpenTicket 採用雙重授權模式：

1. **開源 (AGPL-3.0)**：免費供非商業及開源使用。
2. **企業商用授權 (Enterprise Commercial)**：適用於需要將 OpenTicket 嵌入專有商業系統且不受 copyleft 限制的組織。請洽 `sales@cyber-sec.space`。
