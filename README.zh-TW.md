# OpenTicket (Beta)

<p align="center">
  <img src="./public/banner.png" alt="OpenTicket Banner" width="100%">
</p>

[🌍 官方文件網站 (Official Webpage)](https://openticket.cyber-sec.space) | [🌐 Read in English](README.md) | [🏗️ 架構設計書 (Architecture Specs)](docs/ARCHITECTURE.zh-TW.md)

專為資安維運 (SecOps) 與 IT 團隊打造的次世代資安事件與資產集中管理系統。作為 Jira 或 ServiceNow 等企業級 IT 工單系統的輕量化、視覺化替代方案而生。

## ✨ 核心特色
- **集中化儀表板：** 透過即時指標、事件拓樸分佈與嚴重性矩陣，全面掌控組織的曝險狀態。
- **事件與漏洞雙軌追蹤：** 具備端對端的事件分流管道，能將複雜的資安事件與 CVE 漏洞直接映射到內部受害資產上。
- **雙因子驗證 (2FA) 安全機制：** 內建基於 TOTP 演算法的 2FA 模組，可完美整合各種標準驗證器應用程式 (如 Google Authenticator, Authy)。更支援系統管理員「一鍵強制全域啟用 2FA」的鎖定功能。
- **高密度 SOC 配置 (High-Density Layout)：** 重新設計的單行 8 指標 KPI 網格，讓維運人員能一眼看清資安戰場全貌，並將重點應變面板 (Command Actions) 移至上方，極速縮短反應遲滯時間。
- **動態細粒度權限矩陣 (Dynamic Granular Permission Matrix)：** 原生的進階 RBAC 權限隔離機制，管理員能夠自由定義「自訂角色 (Custom Roles)」，並精細配置各項原子操作權限 (如 `CREATE_INCIDENTS`, `VIEW_ASSETS`)。人員能同時疊加複數自訂角色權限標籤，為巨型 SOC 環境帶來零信任 (Zero-Trust) 的極大組織架構彈性。
- **混合式外掛生態 (Hybrid Plugin Architecture)：** 具備隔離的資料庫驅動 Hook 引擎 (EventBus)。管理員可以直接在「外掛市集 (Plugin Store)」中一鍵安裝來自 Github Registry 的遠端擴充模組，系統會在後台非同步重新編譯，實現接近零停機的熱重載 (Hot-Reload) 部署。
- **全方位通知中心 (Omni-channel Notifications)：** 原生支援藉由可配置的 SMTP 設定發送 Email（適用於驗證與密碼重置），同時具備基於「伺服器發送事件 (SSE, Server-Sent Events)」的高效能 HTML5 桌面推播通知中心，持續在背景過濾並提醒重大資安威脅。
- **資安優先防禦 (Security-First Paradigm)：** 針對認證管道實施 in-memory 防暴力破解 (Brute Force Rate Limiting) 壓制撞庫攻擊；並且在事件評論與關鍵操作上導入無死角的越權存取防禦 (BOLA, Broken Object Level Authorization) 阻攔未授權編輯。
- **企業級現代介面 (Enterprise UI)：** 以 TailwindCSS 打造高質感 Blur / Backdrop-filter 動態特效，結合深度互動的 Shadcn 元件、透過 Portal 防裁切與支援手動輸入的客製化 `react-datepicker`，以及視覺化的 Recharts 圖表庫。

---

## 🚀 應用範例與使用情境 (Examples & Usage)

### 1. 通報資安事件 (Declaring an Incident)
當一位具備 `CREATE_INCIDENTS` 權限的維運人員發現潛在威脅時：
- 在主控台點擊 **"Declare Incident (通報事件)"**。
- 輸入事件特徵 (舉例：*Port 443 發現可疑的外部連線流量*)。
- 選擇與該威脅相關聯的 **Target Node (事件標的資產)** (舉例：*SRV-WEB-01*)。 
- 指定相對應的 **事件拓樸 (Typology)** (舉例：*釣魚信件 Phishing, 惡意軟體 Malware, 網路異常 Network Anomaly*)。

### 2. 登錄與追蹤系統漏洞 (Triaging Vulnerabilities)
漏洞追蹤模組直接鏡像了系統的資產庫：
- 前往 **"Log Vulnerability (登錄漏洞)"**。
- 輸入該漏洞正式的 `CVE-ID` 以便立案，並選定其 CVSS 嚴重程度。
- 將該漏洞指派給具體的系統節點 (Asset)。送出後，主控台的 *Vulnerability Heatmap (漏洞嚴重性熱圖)* 會立刻動態更新。

### 3. 機器自動化介接 (Machine-to-Machine API Tokens)
您可以將 OpenTicket 直接與 CI/CD 管道或企業內部的 SOAR 自動化劇本串接。
- 前往 **"Identity Preferences (身分設定) -> API Tokens"** (帳戶需具備 `ISSUE_API_TOKENS` 高權限標籤)。
- 生成一組受密碼學保護的自動化金鑰 (例如命名為：*GitHub Actions Push*)。
- 在外部腳本呼叫 `/api/incidents` 或 `/api/assets` 端點時，將其帶入 Header：`Authorization: Bearer <token>`。該呼叫將自動繼承生成該金鑰者的既有伺服器權限。

### API 與系統整合
- **Hook 引擎 (Hook Engine)**：獨立的事件總線架構 (`onIncidentCreated`, `onAssetCompromise`, `onIncidentResolved`)，能在背景安全執行外部程式碼，不損害主系統穩定性。
- **整合遠端外掛市集 (External Plugin Orchestration)**：直接透過 UI 驅動的外掛市集，一鍵橋接 Jira 雙向同步、外部 SOC 監聽器或 Slack/Teams Webhooks。系統會執行強大的伺服器端子程序編譯，近乎無縫地為您的正式環境注入新能力。
- **自動化機器金鑰 (M2M Keys)**：高度強固的抗枚舉 `ApiToken` 模型，產出搭載 `SHA-256` Bearer 驗證的實體 token，為您的 SOAR/SIEM 整合邏輯把關。
- **登入限流與撞庫防禦 (Brute Force & Rate Limiting)**：透過後台對存取源的精準頻率限制，防止分散式密碼噴灑 (Password Spraying) 耗盡您的核心伺服器資源。

---

## 🛠️ 核心技術堆疊
- **框架：** Next.js 16.2 (使用 App Router 與 Server Actions 架構)
- **資料庫：** PostgreSQL (透過 Prisma ORM V6 驅動)
- **身份驗證：** Auth.js v5 (NextAuth.js) / bcrypt / OTPAuth
- **樣式與核心元件：** TailwindCSS v4, Lucide React, Shadcn/UI, React-Datepicker (支援客製化自動防呆補全)
- **資料視覺化：** Recharts v3
- **安全掃描供應鏈：** Snyk

---

## 🚀 快速啟動 (安裝說明)

OpenTicket 提供了兩種無痛部屬平台的方式：**完全容器化** (建議用於生產環境) 或是**快速啟動腳本** (建議用於本地開發)。

### 選項 A: 完全容器化部署 (Docker 企業方案)
這是運行 OpenTicket 最簡單的方式，透過 Docker Compose 將會自動為您配置最新的 PostgreSQL 資料庫、執行關聯遷移，並啟動極度最佳化的 Next.js 獨立容器 (Standalone)。

```bash
docker-compose up -d
```
*您的應用程式將會啟動在 `http://localhost:3000`。任何時候都可以透過 `docker-compose down` 來將其關閉。*

### 選項 B: 本地開發腳本 (Bare-Metal)
如果您偏好直接在本地主機執行 Node.js，只需執行這隻啟動腳本。它會以互動式的方式為您配對 `.env` 環境變數、安裝依賴套件並執行 Prisma 遷移。

```bash
# 請確保您的本機已經有空的 PostgreSQL 實例在運行
chmod +x setup.sh
./setup.sh

# 啟動開發伺服器
npm run dev
```

### ⬆️ 從舊版 (`<= v0.3.x`) 升級至 `v0.4.0`
版本 0.4.0 導入了突破性的 **動態細粒度權限矩陣 (Dynamic Granular Permission Matrix)**，徹底將舊版的 `EnumArray` 固定角色剝離，轉化為客製化關聯表。為避免直接套用資料庫改動而造成欄位與帳戶權限遺失，您**必須**在進行 Prisma 同步前執行專屬的無損升級腳本：

```bash
# 自動由底層攔截備份舊版 Enum 標籤、放行資料庫改動，並無損映射至新版的 CustomRole 矩陣
npm run upgrade:0.4.0
```

### 🪄 首次啟動引導精靈
無論您選擇上述哪一種部屬方式，當您首次進入 `http://localhost:3000` 時，系統會自動將您重新導向至**系統初始化精靈 (`/setup`)**。這將引導您安全地註冊全系統第一位最高權限管理員 (Global System Administrator)。
