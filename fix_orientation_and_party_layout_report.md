# app_012 向き・部隊画面レイアウト修正レポート

## 修正概要
- 時点: 2026-05-24
- 対象: `deliverables/eight-wardens/`
- 既存の新UI・新アセットを維持し、戦闘中の味方/敵スプライトの向きルールと、部隊画面の3カラムバランスを局所修正した。

## 変更ファイル一覧
- `src/components/GameCanvas.tsx`
- `src/components/UnitManagementScreen.tsx`
- `src/styles/global.css`
- `deliverables/fix_orientation_and_party_layout_report.md`

## 味方/敵の向き修正内容
- 味方戦闘スプライトはCanvas描画時のみ `scale(-1, 1)` を適用し、左向きに統一した。
- 顔アイコン、管理画面の立ち絵、編成プレビュー、UI、文字、HPバーは反転対象外のまま維持した。
- 敵戦闘スプライトは敵ごとの描画調整テーブル `enemyDrawTuning` を追加し、戦闘Canvas上で右向きに統一した。
- 敵のHPバーと名前表示は反転コンテキストの外で描くため、画像反転後も位置ズレしない。
- 通常敵名の常時表示は抑え、ボス/メタル系だけ常時表示することで密集時の重なりを軽減した。

## 部隊画面レイアウト修正内容
- 部隊画面に `management-layout-balanced` を追加し、左一覧・中央詳細・右編成/操作の幅配分を再調整した。
- 左一覧は7人編成に合わせて1列7段の読みやすいカード配置にし、顔アイコン、名前、Lv、HPバーの余白を整理した。
- 中央詳細は上段をキャラ立ち絵 + ステータス、下段を昇進ツリー + 昇進情報に分けた。
- 昇進ツリーは「現在職 -> 次職」の流れが分かるよう、現在職を緑系、次職を青系の表示にした。
- 右カラムは上を編成プレビュー、下を操作ボタン群に分け、ボタンの幅・高さ・間隔を統一した。

## スマホ横画面確認結果
- CSS上は既存の `dvh/svh` と safe-area 対応を維持したまま、部隊画面専用のレスポンシブ調整を追加した。
- `max-width: 1050px` では左一覧、中央詳細、右操作の幅と余白を圧縮し、ボタンの最小高を維持する設計にした。
- 現環境ではVite/esbuildの `spawn EPERM` によりブラウザ実表示確認とスクリーンショット取得は未完了。

## 確認結果
- `npx tsc -b`: 通過
- `public/manifest.webmanifest` JSON parse: 通過
- `node --check public/service-worker.js`: 通過
- `node --check public/sw.js`: 通過
- `npm run build`: TypeScript工程通過後、Vite/esbuild の `spawn EPERM` で停止
- 旧職ID検索: 通常初期編成・通常昇進には旧分岐職は残っていない。旧セーブ互換用の `unit-8` は `hydrateSave` にのみ残している。

## 残課題
- 権限制限のない環境で `npm run build` と `npm run dev` または `npm run preview` を実行し、実ブラウザで表示確認する必要がある。
- Android Chrome横画面で、神官を含む味方全員が左向き、敵全員が右向きに見えることを目視確認する必要がある。

## 次に改善するとよい点
- 実機確認後、キャラごとの `scale/offset` を微調整する。
- 部隊画面のスクリーンショットを `deliverables/screenshots/` に保存し、見切れ確認の基準にする。
