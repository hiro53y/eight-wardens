# Eight Wardens：八人の防衛隊 2.0

スマホ横向き専用の育成タワーディフェンス PWA です（公開先 https://eight-wardens.pages.dev/ ）。
2.0 で、名作フリーゲーム「Eight Defender's」（Nes 作）の仕組み（共有の EXP・休憩・Lv3 で2択の転職・飛行／メタル）に沿って一から作り直しました。元作品の名前・絵は使っていません。

## 遊び方
- 8人の守り手を12の台座に置き、左から来る魔物を右上の城門へ通さない。攻撃は自動。抜けられると村人が減り、0人で負け。
- 倒すと EXP と金貨が入る（全員で共有）。EXP を払って好きな仲間のレベルを上げる。戦闘中・一時停止中も育成と配置換えができる。
- 休憩：攻撃をやめてゲージをため、満タンで EXP。ボスのステージでは効かない。ボスを倒すたびに休憩の EXP が増える。
- 転職：Lv3 で金貨を払い、2つの職から選ぶ（剣・狩・盗 × 3段、21職）。3段目は Lv5（玄人は Lv10）まで、その先は上限突破。
- 敵：通常・飛行（道を無視して城門へ）・メタル（ふつうは1しか通らない）。全35ステージ（5章×7、各章の7番目がボス）。
- 難しさ：ふつう／玄人。負けても得た EXP・金貨は残る。

## 起動・確認
```bash
npm install
npm run dev
npm run test
npm run build
```
- `npm run test`：ゲームの仕組みの単体テスト・総当たり・ボットによる全35ステージ通し（Vitest）。
- `BALANCE=1 npm run test`：ボットで難しさを集計（ふつう・玄人）。`CALIBRATE=1`：ステージごとの硬さ（`HP_CALIB`）を探し直す。
- 確かめ用の口：開発中か `?dbg=1` の時だけ `window.__ew`（`run(秒)` で早送り、`start()` で出撃）。

## 構成
- `src/game/`：ゲームの仕組み（DOM に依存しない純粋な TS・固定の刻み・seed 付き乱数）。職業 `jobs.ts`、敵 `enemies.ts`、ステージ `stages.ts`、戦場の形 `field.ts`、進行 `sim.ts`、育成と結果 `progress.ts`、保存 `save.ts`。
- `src/view/`：Canvas の描画（`renderer.ts`）と演出（`effects.ts`）、絵の切り出し（`assets.ts`）。
- `src/ui/`：画面（タイトル・地図・戦闘・守り手の小窓・遊び方・設定）。
- `src/audio/`：BGM（mp3、章ごとに通常とボスの2曲）と効果音（Web Audio の合成音）。
- `public/assets/v2/`：使う絵の WebP 軽量版（元の PNG から `python scripts/make-webp.py` で作る。Pillow が要る）。
- 保存キー：`eight-wardens-v2:progress`・`eight-wardens-v2:settings`（旧 v1 の保存は読まない・消さない）。

## PWA
- `public/service-worker.js`（`/service-worker.js` に登録）と互換の `public/sw.js` は同じ内容。キャッシュ名 `eight-wardens-shell-v10-remake`。
- 先に入れるのは画面の枠と WebP の絵だけ。BGM は流す時に読み、キャッシュには入れない。
- manifest の `start_url "/"`・`orientation: landscape` は変えていない。

## 公開
GitHub `hiro53y/eight-wardens` の main に push すると Cloudflare Pages が `npm run build` して公開する。
