# 問道長生（仙俠修真放置遊戲）

Vue 3 + TypeScript + Pinia + Vite + PWA，部署在 GitHub Pages。

## 開發
```bash
npm install
npm run dev      # 開發伺服器（--host：同一 Wi-Fi 的手機可連線測試）
npm test         # 核心邏輯單元測試
npm run build    # 正式建置到 dist/
npm run icons    # 修改 public/logo.svg 後重新產生 PWA 圖示
```

## 部署到 GitHub Pages（一次性設定）
1. 在 GitHub 建立 repo（例如 `my-game`）
2. 推送程式碼：
   ```bash
   git init -b main
   git add .
   git commit -m "init"
   git remote add origin https://github.com/<你的帳號>/my-game.git
   git push -u origin main
   ```
3. 在 repo 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**
4. 之後每次 `git push`，就會自動部署到 `https://<你的帳號>.github.io/my-game/`

## 安裝成手機 APP
- **Android（Chrome）**：開啟網址 → 點遊戲右下角「📲 安裝到桌面」
- **iOS（Safari）**：點分享 → 「加入主畫面」（遊戲內也有教學）

## 專案結構
| 路徑 | 說明 |
|---|---|
| `src/data/` | 境界、靈根、奇遇事件（加內容只改這裡） |
| `src/core/formulas.ts` | 所有數值公式與 `BALANCE` 平衡參數 |
| `src/core/save.ts` | IndexedDB 存檔、版本遷移、存檔碼匯出入 |
| `src/stores/game.ts` | 遊戲狀態、主迴圈、離線收益、突破邏輯 |
| `src/components/` | 渡劫小遊戲、奇遇彈窗、設定、安裝提示 |
| `.github/workflows/deploy.yml` | GitHub Pages 自動部署 |
