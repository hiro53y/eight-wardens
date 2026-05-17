# Eight Wardens：八人の防衛隊

## 概要
スマホ横向き専用の少人数固定型・育成タワーディフェンスPWAです。React + TypeScript + Vite + Canvas APIで実装し、8人固定の防衛ユニットで左から右へ進む敵を倒して村を守ります。

## 目的
- 添付リファレンス画像のUI密度、色味、画面構成を参考にしたブラウザゲームMVPを作る。
- 職業、敵、Wave、ステージを後から追加しやすいデータ分離構成にする。
- 課金、広告、ガチャなしで、育成・休憩・転職・Gold稼ぎの基本ループを遊べる状態にする。

## 起動方法
```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run build
```

PWA確認:

```bash
npm run build
npm run preview
```

Android Chromeで配信URLを開き、インストール候補が「アプリ」として表示されることを確認します。manifest、Service Worker、192/512/maskableアイコン、standalone表示、landscape固定を含めています。

自己完結パッケージ:
- GitHubアップロード対象: `deliverables/eight-wardens/`
- 別名退避版: `deliverables/eight-wardens-pwa-ui-final-20260517/`

## 操作方法
- タイトル画面: 「はじめる」または「つづきから」でステージ選択へ進む。
- ステージ選択: 解放済みステージを選び「出撃」を押す。
- バトル: ユニットをタップ/クリックして選択し、「攻撃」「休憩」「LvUp」「転職」を操作する。
- 休憩: 休憩中は攻撃しない代わりに、通常Wave中だけ休憩ゲージが進み、100でEXPを得る。
- 転職: Goldを消費して転職する。下級→中級は100 Gold、中級→上級は800 Gold。

## ゲーム仕様
- 画面は16:9横向き前提。縦向きでは「スマホを横向きにしてください」を表示する。
- ゲーム本体は1つの16:9コンテナに収め、`100dvh` / `100svh` と safe-area inset を考慮してスマホ横画面で見切れにくくする。
- 初期ユニットは剣士、弓兵、斥候、斥候、重装騎士、砲術士、忍者、神官の8人固定。
- 敵は左から右へ進み、村ゲート到達時に村耐久を減らす。村耐久0でゲームオーバー。
- 味方は射程内で最も村に近い敵を自動攻撃する。
- 斥候系職業がとどめを刺すとGold報酬が3倍になる。
- Wave10のボス撃破でMVPクリア。
- セーブキーは `eight-wardens-save-v1`。設定値は `eight-wardens-settings-v1`。

## 技術スタック
- React
- TypeScript
- Vite
- Canvas API
- localStorage
- CSS
- Web App Manifest
- Service Worker

## 今回のUI/PWA改善
- `public/manifest.webmanifest`、`public/sw.js`、PWA用meta、192/512/maskableアイコンを追加。
- ChatGPT Images 2.0で生成した `public/assets/generated/title-background.png`、`map-background.png`、`battle-background.png`、`unit-portraits-sheet.png` を追加。
- タイトル画面に生成背景、紋章ロゴ、8人の防衛隊表示、装飾ボタンを追加。
- ステージ選択画面を生成地図背景、章バナー、ステージノード、敵/報酬/スタミナ付き詳細パネルへ更新。
- バトル画面のCanvas背景に生成背景を組み込み、村ゲート、ユニット台座、敵/味方表現、射程範囲図を強化。
- ユニット管理画面は生成ポートレートシート、2行x4列カード、選択ユニットの大型ポートレート、クラスツリー、編成プレビューの見た目を改善。
- 図鑑画面は敵/職業カードにアイコンと装飾を加え、スクロール前提のカードUIへ更新。

## まだ簡易実装の箇所
- 個別キャラクター立ち絵は1枚の生成ポートレートシートから切り出して表示。個別PNGへの分割は未実施。
- 装備、実績詳細、討伐記録、音声、ドラッグ編成は未実装。
- Service Workerは軽量なアプリシェルキャッシュ方式。細かいキャッシュ戦略は今後調整可能。

## 今後の拡張案
- ステージごとにWave内容、背景、報酬を変える。
- 神官系の回復、罠師系の設置罠、職業固有スキルを追加する。
- 図鑑に撃破数、敵詳細、職業ツリーの説明を追加する。
- 実績、装備、編成位置変更、演出強化を追加する。
