# OpenTicket (MVP)

[🌐 Read in English](../README.md) | [🏗️ 架構設計書 (Architecture Specs)](docs/ARCHITECTURE.zh-TW.md)

專為資安維運 (SecOps) 與 IT 團隊打造的次世代資安事件與資產集中管理系統。作為 Jira 或 ServiceNow 等企業級 IT 工單系統的輕量化、視覺化替代方案而生。

## ✨ 核心特色
- **集中化儀表板：** 透過即時指標、事件拓樸分佈與嚴重性矩陣，全面掌控組織的曝險狀態。
- **事件與漏洞雙軌追蹤：** 具備端對端的事件分流管道，能將複雜的資安事件與 CVE 漏洞直接映射到內部受害資產上。
- **雙因子驗證 (2FA) 安全機制：** 內建基於 TOTP 演算法的 2FA 模組，可完美整合各種標準驗證器應用程式 (如 Google Authenticator, Authy)。更支援系統管理員「一鍵強制全域啟用 2FA」的鎖定功能。
- **高密度 SOC 配置 (High-Density Layout)：** 重新設計的單行 8 指標 KPI 網格，讓維運人員能一眼看清資安戰場全貌，並將重點應變面板 (Command Actions) 移至上方，極速縮短反應遲滯時間。
- **模組化角色存取控制 (RBAC)：** 原生的多租戶隔離機制，清楚劃分 `ADMIN` (全域基建覆寫權限), `SECOPS` (事件處置與指派), 以及 `REPORTER` (終端使用者通報) 權限。
- **企業級現代介面 (Enterprise UI)：** 以 TailwindCSS 打造高質感 Blur / Backdrop-filter 動態特效，結合深度互動的 Shadcn 元件、透過 Portal 防裁切與支援手動輸入的客製化 `react-datepicker`，以及視覺化的 Recharts 圖表庫。

---

## 🚀 應用範例與使用情境 (Examples & Usage)

### 1. 通報資安事件 (Declaring an Incident)
當一位 `REPORTER` 或 `SECOPS` 發現潛在威脅時：
- 在主控台點擊 **"Declare Incident (通報事件)"**。
- 輸入事件特徵 (舉例：*Port 443 發現可疑的外部連線流量*)。
- 選擇與該威脅相關聯的 **Target Node (事件標的資產)** (舉例：*SRV-WEB-01*)。 
- 指定相對應的 **事件拓樸 (Typology)** (舉例：*釣魚信件 Phishing, 惡意軟體 Malware, 網路異常 Network Anomaly*)。

### 2. 登錄與追蹤系統漏洞 (Triaging Vulnerabilities)
漏洞追蹤模組直接鏡像了系統的資產庫：
- 前往 **"Log Vulnerability (登錄漏洞)"**。
- 輸入該漏洞正式的 `CVE-ID` 以便立案，並選定其 CVSS 嚴重程度。
- 將該漏洞指派給具體的系統節點 (Asset)。送出後，主控台的 *Vulnerability Heatmap (漏洞嚴重性熱圖)* 會立刻動態更新。

---

## 🛠️ 核心技術堆疊
- **框架：** Next.js 16.2 (使用 App Router 與 Server Actions 架構)
- **資料庫：** PostgreSQL (透過 Prisma ORM V6 驅動)
- **身份驗證：** Auth.js v5 (NextAuth.js) / bcrypt / OTPAuth
- **樣式與核心元件：** TailwindCSS v4, Lucide React, Shadcn/UI, React-Datepicker (支援客製化自動防呆補全)
- **資料視覺化：** Recharts v3
- **安全掃描供應鏈：** Snyk

---

## 💻 本地環境架設 (Development Setup)

1. **資料庫部署：** 透過 Docker 啟動本地 PostgreSQL 服務。
   ```bash
   docker compose up -d
   ```

2. **環境變數配置：** 確保您的根目錄 `.env` 檔案包含必要的環境變數：
   ```env
   DATABASE_URL="postgresql://openticket_user:openticket_password@localhost:5432/openticket_dev?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="請填入您的複雜加密金鑰"
   ```

3. **資料庫初始化與測試資料注入 (Seeding)：**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts
   ```

4. **啟動 Turbopack 前端專案：**
   ```bash
   npm run dev
   ```

## 🔐 預設測試帳號

當您執行上述的 Seed 指令後，MVP 版本會自動為每個權限群組產生測試帳號：

- **系統管理員 (可進行所有設定與全域 2FA 強制鎖定)：**
  - **Email:** `admin@openticket.local`
  - **Password:** `Admin@123`

- **資安維運工程師 (負責處理事件與更新進度)：**
  - **Email:** `secops@openticket.local`
  - **Password:** `Secops@123`

- **標準通報者 (僅能建立通報與檢視唯讀資料)：**
  - **Email:** `reporter@openticket.local`
  - **Password:** `Reporter@123`
