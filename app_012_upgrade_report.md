# app_012 Eight Defender'sもどき 改修レポート

## 改修概要
- 時点: 2026-05-23
- 対象: React + TypeScript + Vite + Canvas API の既存PWA
- 目的: 既存ゲームロジックを保持しつつ、主要4画面、戦闘視認性、スマホ横画面、PWA素材キャッシュを改善
- 入力素材は上書きせず、`input/processed_game_assets/assets/` から `public/assets/game/` へ69件をコピーして使用

## 使用した画像素材
- 背景: `chapter1_world_map.png`, `battle_village_gate_day.png`, `result_stage_clear_bg.png`
- ユニット: `units/portraits/`, `units/faces/`, `units/battle/`
- 敵: `enemy_slime.png`, `enemy_goblin.png`, `enemy_orc.png`, `enemy_wingbat.png`, `enemy_runner_chick.png`, `enemy_wolf_elite.png`
- エフェクト: slash, hit, magic, target, route系
- バナー/装飾: Wave開始、エリート警告、ボス警告、ステージクリア、星評価、報酬装飾
- UI: coin/gem/lock/shield/swordなどのアイコン

## 変更したファイル一覧
- `src/data/artAssets.ts`
- `src/components/AssetSprite.tsx`
- `src/components/StageSelectScreen.tsx`
- `src/components/BattleScreen.tsx`
- `src/components/GameCanvas.tsx`
- `src/components/UnitCard.tsx`
- `src/components/UnitDetailPanel.tsx`
- `src/components/UnitManagementScreen.tsx`
- `src/components/ResultModal.tsx`
- `src/types/game.ts`
- `src/engine/gameLoop.ts`
- `src/styles/global.css`
- `public/service-worker.js`
- `public/sw.js`
- `TASKS.md`
- `docs/decision_log.md`
- `docs/handoff.md`
- `tests/test_checklist.md`

## 追加したファイル一覧
- `public/assets/game/` 以下の処理済みPNG 69件
- `deliverables/app_012_upgrade_report.md`

## PWA対応内容
- `public/service-worker.js` と `public/sw.js` のキャッシュ名を `eight-wardens-shell-v9-game-assets` に更新
- 新規ゲーム背景、バナー、主要エフェクト、主要UIアイコンをService Workerのアプリシェルに追加
- `manifest.webmanifest` は既存の `display: standalone`, `orientation: landscape`, `start_url`, theme/background color, app icon 設定を維持

## 画面別の改善内容
- マップ / ステージ選択: `chapter1_world_map.png` を背景にし、routeエフェクト、個別敵アイコン、lock/coin/gem素材を適用
- 戦闘: `battle_village_gate_day.png`、個別ユニット/敵PNG、slash/hit/magic/target/route素材、Wave/elite/bossバナーを適用
- ユニット管理: 一覧はface、詳細はportrait、編成プレビューはbattle PNGを使う表示へ変更
- ステージクリア / リザルト: `result_stage_clear_bg.png`、stage clearバナー、三つ星、報酬装飾、参加ユニット一覧、次へ/再挑戦/マップへ戻るを追加

## 動作確認結果
- `public/assets/game/` 配置数: 69ファイル
- `npx tsc -b`: 通過
- `public/manifest.webmanifest` JSON parse: 通過
- `node --check public/service-worker.js`: 通過
- `node --check public/sw.js`: 通過
- `npm run build`: TypeScript工程は通過したが、Vite/esbuild起動時に `spawn EPERM` で停止
- `npm run dev -- --port 5173`: Vite/esbuild起動時に `spawn EPERM` で停止

## 残課題
- 現環境ではVite/esbuildの子プロセス起動がOS権限で拒否されるため、ブラウザ実表示確認とスクリーンショット取得は未完了
- Android ChromeでのPWAインストール候補、Service Worker登録、スマホ横画面の実機確認は未完了
- 新素材は7人分のため、既存8人目のロッタはグレン素材を代用

## 次に改善すべき点
- 権限制限のない環境で `npm install`, `npm run build`, `npm run dev` または `npm run preview` を再実行
- Android Chrome横画面でマップ、戦闘、ユニット管理、リザルトの見切れを確認
- 確認後、必要なら `deliverables/screenshots/` に各画面スクリーンショットを保存
