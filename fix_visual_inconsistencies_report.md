# app_012 表示崩れ・7人編成・昇進ツリー修正レポート

## 修正概要
- 時点: 2026-05-23
- 実反映対象: `deliverables/eight-wardens/`
- 既存の新UI・新素材を維持し、戦闘スプライト向き、画像見切れ、敵名/数値重なり、7人編成、昇進ツリー不整合を局所修正した。

## 変更ファイル
- `src/data/classes.ts`
- `src/data/initialUnits.ts`
- `src/data/artAssets.ts`
- `src/engine/save.ts`
- `src/engine/targeting.ts`
- `src/engine/gameLoop.ts`
- `src/components/GameCanvas.tsx`
- `src/components/UnitManagementScreen.tsx`
- `src/components/TitleScreen.tsx`
- `src/components/RotateDeviceNotice.tsx`
- `src/styles/global.css`
- `README.md`

## 向き修正
- 戦闘Canvas上の味方バトルスプライトだけを左右反転した。
- 顔アイコン、立ち絵、管理画面、編成プレビュー、敵、UI、テキスト、HPバーは反転していない。
- 味方スプライトは足元中央基準で、キャラ別の `scale/offsetX/offsetY` 調整テーブルを追加した。

## 見切れ修正
- `portrait`、`face`、`battle` のCSS基準位置を分離した。
- 新素材表示箇所では `background-size: contain` を優先し、古いシート切り抜き指定が効かないよう末尾CSSで上書きした。
- 編成プレビューは7枠に合わせて3列グリッド中央寄せにした。

## クラスツリー
- 初期ユニットを7人に整理した。
- 昇進経路は以下の一本道に整理した。
  - アルト: 剣士 -> 剣豪 -> 剣聖
  - リュカ: 弓兵 -> 狙撃手 -> 森弓士
  - ミナト: 盾兵 -> 重装騎士 -> 聖盾騎士
  - イリス: 神官 -> 司祭 -> 聖女
  - カイ: 忍者 -> 影忍 -> 暗殺者
  - グレン: 破術士 -> 魔導士 -> 大魔導士
  - シノ: 槍兵 -> 槍騎士 -> 槍聖
- 旧8人セーブは `hydrateSave` で7人へ正規化する。ロッタ枠は復元しない。

## 確認結果
- `npx tsc -b`: 通過
- `public/manifest.webmanifest` JSON parse: 通過
- `node --check public/service-worker.js`: 通過
- `node --check public/sw.js`: 通過
- 旧職ID検索: 通常初期編成・通常昇進には旧分岐職は残っていない。旧セーブ互換用の変換テーブルには旧IDを残している。
- `npm run build`: TypeScript工程は通過後、Vite/esbuild の `spawn EPERM` で停止。

## 残課題
- 現環境では Vite/esbuild の子プロセス起動がOS権限で拒否されるため、ブラウザ実表示確認とスクリーンショット取得は未完了。
- 権限制限のない環境で `npm run build`、`npm run dev` または `npm run preview` を再実行し、Android横画面とPWA表示を確認する必要がある。
