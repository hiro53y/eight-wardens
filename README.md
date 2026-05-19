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
- ユニット管理: 「編成」は選択ユニットを前方配置へ移動、「装備」はGold 30でHP/耐久を強化、「休憩設定」は選択ユニットの休憩状態を切り替える。

## BGM / SE 差し替え
以下の所定フォルダにmp3を保存すると、ゲーム中に自動で再生を試みます。ブラウザ仕様上、初回タップ後から再生されます。

```text
public/assets/audio/bgm/title.mp3
public/assets/audio/bgm/map.mp3
public/assets/audio/bgm/unit-management.mp3
public/assets/audio/bgm/settings.mp3
public/assets/audio/bgm/stage-1.mp3
public/assets/audio/bgm/stage-2.mp3
...
public/assets/audio/bgm/stage-10.mp3
public/assets/audio/se/damage.mp3
```

ファイルがない場合は無音のまま動作します。通常の差し替えではコード変更は不要です。

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
- `public/service-worker.js` を追加し、本番登録パスを `/service-worker.js` に統一。旧 `/sw.js` も互換用に残しています。
- ChatGPT Images 2.0で生成した `public/assets/generated/title-background.png`、`map-background.png`、`battle-background.png`、`unit-portraits-sheet.png` を追加。
- ChatGPT Images 2.0で追加生成した `public/assets/generated/warden-chibi-sheet.png`、`enemy-chibi-sheet.png`、`map-marker-sheet.png` を組み込み、漢字1文字の丸アイコンを置き換え。
- タイトル画面に生成背景、紋章ロゴ、主要3ボタンを配置。中央の職業丸アイコンや飾り導線は撤去。
- ステージ選択画面を生成地図背景、章バナー、ステージノード、敵/報酬/スタミナ付き詳細パネルへ更新。
- バトル画面のCanvas背景に生成背景を組み込み、村ゲート、ユニット台座、敵/味方表現、射程範囲図を強化。
- ユニット管理画面は生成ポートレートシート、2行x4列カード、選択ユニットの大型ポートレート、クラスツリー、編成プレビューの見た目を改善。
- 図鑑導線はスマホ横画面の主要操作から撤去し、ホーム/マップの操作密度を下げました。

## 2026-05-17 スマホ横向き修正
- Android Chromeの下部UIに隠れにくいよう、通常ブラウザ表示ではゲームフレーム下に保守的な余白を確保。standalone起動時はsafe-area中心の余白に戻ります。
- ホーム画面の飾りボタン「告 お知らせ」「贈 特典受取」「ローカルセーブ待機」、中央の隊員丸アイコン列、図鑑ボタンを撤去し、主要操作を「はじめる」「つづきから」「設定」に整理。
- マップ画面のヘッダー、ステージノード、右側詳細パネルを低背化。右側詳細パネルだけ内部スクロール可能にし、出撃ボタンが下端で隠れにくい構成に変更。
- ユニット管理画面は3カラムのまま、スマホ横向き用に高さを再配分。左一覧とクラスツリーを内部スクロール化し、右側操作ボタンが下端で切れないよう調整。
- ユニットカードの名前表示を2行まで許容し、「ア...」のような極端な省略を減らしました。
- ポートレートシートの表示を縦横に引き伸ばさない背景サイズへ変更し、スマホでも見やすい比率に調整。
- 図鑑画面は各一覧領域だけスクロールし、カードの余白・文字サイズ・枠線をスマホ横向き向けに再調整。
- 戦闘画面は敵味方を生成スプライトで描画し、HPバー、ダメージポップ、斬撃/矢/砲撃/魔法風エフェクト、被弾SE読み込みに対応。

## PWAインストール確認方法
1. `npm run build`
2. `npm run preview`
3. HTTPS配信先、またはローカルpreviewをChromeで開く
4. DevTools Applicationで `manifest.webmanifest` と `/service-worker.js` が読み込まれていることを確認
5. manifestの `display: standalone`、`orientation: landscape`、`scope: /`、192/512/maskable iconを確認

## スマホ横向き表示の確認方法
- Android Chromeで横向きにして、ホーム、マップ、ユニット管理、戦闘、設定を順に確認します。
- 通常ブラウザ表示では下部Chromeバーが出ても主要ボタンが隠れないことを確認します。
- PWAインストール後のstandalone表示では余白が縮み、ゲーム画面が中央に収まることを確認します。

## 既知の制約
- 個別キャラクター立ち絵は1枚の生成チビキャラスプライトシートから切り出して表示。個別PNGへの分割は未実施。
- 実績詳細、討伐記録、ドラッグ編成は現在の主要導線から外しています。
- Service Workerは軽量なアプリシェルキャッシュ方式。細かいキャッシュ戦略は今後調整可能。
- このCodex実行環境ではVite/esbuild起動が `spawn EPERM` で止まる場合があります。TypeScript確認は `npx tsc -b` で通過済みですが、最終ビルドは権限が正常な環境で確認してください。

## 今後の拡張案
- ステージごとにWave内容、背景、報酬を変える。
- 神官系の回復、罠師系の設置罠、職業固有スキルを追加する。
- 実績、敵詳細、職業ツリーの説明を追加する。
