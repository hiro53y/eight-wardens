# 訓練ステージ・BGM配置・神官向き修正レポート

## 修正概要
- 戦闘画面の神官バトルスプライトが右向きに見える問題を、ユニット別の反転設定で補正した。
- Gold / EXP を稼げる常時開放の訓練場をステージ選択画面に追加した。
- 訓練場はメインステージ進行を進めず、何度でも挑戦できる反復育成ステージとして実装した。
- BGM mp3 の配置フォルダとファイル名を README に明記し、空フォルダがGitHubで消えないよう音声フォルダ内にもREADMEを追加した。

## 変更ファイル
- `src/components/GameCanvas.tsx`
- `src/components/StageSelectScreen.tsx`
- `src/components/ResultModal.tsx`
- `src/data/waves.ts`
- `src/engine/audio.ts`
- `src/engine/gameLoop.ts`
- `src/engine/progression.ts`
- `src/styles/global.css`
- `README.md`
- `public/assets/audio/bgm/README.md`
- `public/assets/audio/se/README.md`

## 向き修正
- 味方バトルスプライト描画をユニット別 `flipX` 設定に変更。
- 神官 `unit-4` は素材の見え方に合わせ、戦闘画面上で左向きになる設定へ補正。
- 顔アイコン、管理画面立ち絵、編成プレビュー、UI、文字、敵スプライトは今回の神官補正対象外。

## 訓練ステージ
- ステージID `0` の `訓練場` を追加。
- 常時アンロック、消費スタミナ0、何度でも挑戦可能。
- 3Wave構成の短い演習にし、通常ステージよりクリアしやすい敵数に調整。
- クリア時に `240 Gold` と `全員25 EXP` を付与。
- 訓練場クリアでは `currentStage` と `clearedStages` を進めない。

## BGM配置
完成版パッケージでは以下へmp3を配置する。

```text
deliverables/eight-wardens/public/assets/audio/bgm/title.mp3
deliverables/eight-wardens/public/assets/audio/bgm/map.mp3
deliverables/eight-wardens/public/assets/audio/bgm/unit-management.mp3
deliverables/eight-wardens/public/assets/audio/bgm/settings.mp3
deliverables/eight-wardens/public/assets/audio/bgm/training.mp3
deliverables/eight-wardens/public/assets/audio/bgm/stage-1.mp3
...
deliverables/eight-wardens/public/assets/audio/bgm/stage-10.mp3
deliverables/eight-wardens/public/assets/audio/se/damage.mp3
```

## 確認結果
- `deliverables/eight-wardens/` で `npx tsc -b` 通過。
- `deliverables/eight-wardens/` で `public/manifest.webmanifest` のJSON parse通過。
- `deliverables/eight-wardens/` で `node --check public/service-worker.js` と `node --check public/sw.js` 通過。
- `npm run build` は TypeScript 工程通過後、Vite/esbuild 起動時の `spawn EPERM` で停止。
- 作業領域ルート側へ同じ差分を同期し、ルートでも `npx tsc -b` 通過。

## 残課題
- この環境ではVite/esbuildの `spawn EPERM` が発生する場合があり、ブラウザ実表示確認は権限制限のない環境での再確認が必要。
