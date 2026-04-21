import re

# Update README.md
with open('README.md', 'r') as f:
    en_readme = f.read()

en_features = """### Autonomous SOAR Engine
OpenTicket includes a built-in Security Orchestration, Automation, and Response (SOAR) engine. 
* **Dynamic SLA Tracking**: Incident and Vulnerability deadlines are automatically calculated based on configurable severity matrices.
* **Asset Auto-Quarantine**: When a CRITICAL incident is structurally linked to an infrastructure node, the system immediately flags the Asset as `COMPROMISED`, dispatching emergency alerts to auditors.
* **Multi-Asset Correlation**: Analysts can map singular threat vectors to multiple compromised hosts simultaneously.

### Zero-Trust & BOLA Defense
Every API endpoint and Edge Middleware execution intrinsically validates cryptographic session claims.
* **Strict Tenant Isolation**: Broken Object Level Authorization (BOLA) mitigations guarantee operators can only interact with incidents and data they explicitly own.
* **Role-Based Provisioning**: Administrators can securely invite operators via dynamic, token-backed Join URLs, bypassing open registration.
* **TOTP Two-Factor Authentication (2FA)**: Native MFA with QR-code dashboard enrollment, governed by NextAuth edge-compatible `otpauth` cryptographic algorithms.
* **Credentials Rate Limiting**: A high-performance connection throttling matrix shielding authentication endpoints natively without Redis.

### React Server Components (RSC) Plugin Injection
Extend the platform natively using the OpenTicket Plugin Engine. 
* **Dynamic UI Slots**: Plugins seamlessly inject interactive UI widgets natively into the Incident, Asset, and User profiles.
* **Isolated Sandbox Execution**: Background logic is executed within an `isolated-vm` sandbox, enforcing strict memory ceilings and time-bombs.
* **Plugin V8 Sandbox Execution**: Enforces a strict memory and CPU-bound execution sandbox using `isolated-vm` (128MB / 5000ms), natively protecting the Node.js process from infinite-looping plugin code prior to installation.
* **Official Plugin Verification**: Cryptographic Verification Badges (Blue Checks) guarantee the authenticity of core team plugins.

### High-Performance Operations
* **High-Performance Text Search**: Integrated PostgreSQL GIN Indices drastically improve full-text search speeds across thousands of Incidents and Vulnerabilities.
* **Personal Access Tokens (PAT)**: Cryptographic Token Management UI for operators to generate, track, and revoke API keys for external M2M automation.
* **CSV Telemetry Exports**: Raw CSV data export capabilities entirely immune to CSV-Injection (DDE) vectors.
* **Secure Webhook Engine**: Outbound orchestration engine fortified with rigorous internal DNS and Server-Side Request Forgery (SSRF) blocklists."""

en_readme = re.sub(r'### Autonomous SOAR Engine.*?---\n\n## 🚀 Initialization', en_features + '\n\n---\n\n## 🚀 Initialization', en_readme, flags=re.DOTALL)

with open('README.md', 'w') as f:
    f.write(en_readme)

# Update README.zh-TW.md
with open('README.zh-TW.md', 'r') as f:
    zh_readme = f.read()

zh_features = """- **TOTP 雙重驗證 (2FA) 與帳戶安全：** 內建基於 Edge 密碼學的 2FA 模組與 QR Code 註冊，支援全域強制開啟。此外，也具備管理員專屬的密碼重設機制，透過雙重 SMTP 驗證迴圈確保接管安全。無 Redis 原生身分驗證限流 (Credentials Rate Limiting) 阻擋暴力破解。
- **免疫 DNS Rebinding 與 SSRF 阻擊：** 系統在派發 Webhook 前會完全凍結安全的 IPv4 動態位址，保護內網 VPC 不被穿透。
- **Postgres 原生 GIN 全文檢索：** 採用 Postgres 內建的 `tsquery` 與 GIN 索引結構，即便資料庫中塞滿事件，搜尋仍能保持極致的毫秒級流暢回傳。
- **零信任沙盒與外掛生態 (isolated-vm & Plugins)：** 外部的第三方外掛會被原生的五道防線鎖進沙盒中，包含 `isolated-vm` 記憶體/CPU 實體隔離、5000ms 時間炸彈，徹底防堵惡意代碼。
- **高解析外掛 UI 擴充 (RSC UI Injection)：** 透過精準的 UI Hook 攔截點，外掛能夠利用 React Server Components 無縫地將特殊顯示卡片注入至事件、漏洞的側邊欄中。官方認證的外掛更具備密碼學「藍勾勾」標章。
- **ITSM & SOAR 自動化引擎：** 基於嚴重程度自動計算與追蹤 SLA 目標。當遭遇 CRITICAL 事件時，能觸發自動隔離機制，將關聯的 Asset 瞬間轉移為 `COMPROMISED` 狀態並觸發全域廣播。同時支援多重資產關聯 (Multi-Asset Correlation)。
- **無縫檔案與資料匯出：** 實作了強健的 `react-dropzone` 無縫數位證據拖曳上傳庫；以及專為分析團隊打造、絕對免疫 CSV 注入 (DDE) 的原始資料匯出引擎。
- **機器自動化識別 (Personal Access Tokens, PAT)：** 內建專屬的 API Key 管理介面，讓操作員可以輕鬆生成、追蹤並撤銷用於 CI/CD 或外部整合的自動化權限。
- **動態細粒度權限矩陣 (Dynamic Granular Permission Matrix)：** 原生的進階 RBAC 權限隔離機制，支援高達 30 種以上的原子級權限設定，人員能同時疊加複數自訂角色標籤。
- **賽博龐克載入特效 (Cyberpunk Suspense)：** 採用專屬的骨架屏 (Skeleton loaders) 與 `nextjs-toploader`，並且整合了 `LocalTime` 全域時區自動同步，為分析師帶來絕對流暢且無時區混亂的極致現代 UI。"""

zh_readme = re.sub(r'- \*\*絕對邊界零信任防禦 \(L7 DDoS Defense\)：\*\*.*?---\n\n## 🚀 應用範例', zh_features + '\n\n---\n\n## 🚀 應用範例', zh_readme, flags=re.DOTALL)

# Update the upgrade section in zh_readme
zh_upgrade = """### ⬆️ 跨代版本無痛升級 (直升 1.0.0-rc.1)
版本 `1.0.0-rc.1` 徹底完善了庞大的 **零信任外掛架構 (Plugin SDK)**、**SOAR SLA 引擎** 以及 **PgBouncer** 基礎設施，這些都是建築在先前強大的 RBAC 改朝換代之上。
為避免跨代升級時 PostgreSQL 造成的永久性欄位丟失，OpenTicket 在底層實作了向後相容的冪等 (Idempotent) 防護。

若您使用的是 Docker 環境，當您下達 `docker-compose up` 啟動時，內部的 `migrate:prod` 鍊式腳本會自動幫您搞定所有的相依轉換。
如果您是裸機 (Bare-Metal) 安裝者，請您**務必**手動執行專屬的升級腳本。它會為您舊有的事件與弱點回溯計算 (Retroactively Calculate) 遺失的 SLA 目標時間，確保新版引擎完美運作：

```bash
# 攔截並提取舊版設定，安全部屬 Schema，然後精準灌入最新的系統權限與 SLA 轉換
npm run migrate:prod
```"""

zh_readme = re.sub(r'### ⬆️ 跨代版本無痛升級.*?```', zh_upgrade, zh_readme, flags=re.DOTALL)

# Change links from v0.5.2 to v1.0.0-rc.1
zh_readme = zh_readme.replace('v0.5.2', 'v1.0.0-rc.1')
# Except for any historical context, but we replaced the standalone download links

with open('README.zh-TW.md', 'w') as f:
    f.write(zh_readme)
