# 問道長生（仙俠修真放置遊戲）

Vue 3 + TypeScript + Pinia + Vite + PWA，部署在 GitHub Pages。

修煉、突破渡劫、功法、煉丹、靈田、秘境探索、回合戰鬥、奇遇、成就、轉世輪迴。

完整規劃與進度：[docs/PLAN.md](docs/PLAN.md)

## 開發
```bash
npm install
npm run dev      # 開發伺服器（--host：同一 Wi-Fi 的手機可連線測試）
npm test         # 邏輯測試＋UI 冒煙測試
npm run build    # 正式建置到 dist/
npm run icons    # 修改 public/logo.svg 後重新產生 PWA 圖示
```

開發模式或網址加上 `?dev`，設定裡會出現**開發者面板**（境界跳級、全物品、模擬離線、時間流速 ×100）。

## 部署到 GitHub Pages（一次性設定）
1. 在 GitHub 建立 repo 並推送到 `main`
2. 到 repo 的 **Settings → Pages → Build and deployment → Source**，選 **GitHub Actions**
   （⚠️ 選成 Deploy from a branch 會發佈原始碼，畫面一片白）
3. 之後每次 `git push` 都會自動部署到 `https://<你的帳號>.github.io/<repo>/`

## 安裝成手機 APP
- **Android（Chrome）**：開啟網址 → 點遊戲右下角「📲 安裝到桌面」
- **iOS（Safari）**：點分享 → 「加入主畫面」（遊戲內也有教學）

## 專案結構
| 路徑 | 說明 |
|---|---|
| `src/data/` | 境界、靈根、物品、功法、丹方、奇遇、秘境、成就（加內容只改這裡） |
| `src/core/` | 數值公式、存檔、戰鬥、地圖產生、音效 |
| `src/stores/game.ts` | 遊戲狀態與所有動作 |
| `src/views/`、`src/components/` | 畫面與元件 |
| `tests/` | Vitest 測試 |
| `.github/workflows/deploy.yml` | GitHub Pages 自動部署 |
