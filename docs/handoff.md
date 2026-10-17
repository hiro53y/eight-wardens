# 3.2 引継ぎ

正本はこのリポジトリ。既存URL https://eight-wardens.pages.dev/ へ3.2.0公開済み。main連携を継続する。

- 現行仕様はspec.md、検証は../_VERIFY.mdと../tests/test_checklist.md、素材はart-v32.json。
- 新配置はfield.tsを正本とする。見た目だけずらして射程/タップ位置を食い違わせない。古いセーブの配置番号は保持する。
- 8人物アトラス（各3ポーズ）、5拠点アトラス（各4種）、5背景をv32配下へ追加。元PNGはローカルout/v32。scripts/make-v32-webp.pyは形式変換と切り出し情報の生成のみ。
- 通常102件、ACCEPTANCE32=1で受入22件を加える。全35面通常/玄人各10seed、塔/日替わりを含む。
- ?qa=reviewと?qa=effectsはDEV限定。後者は保存を読み書きしない演出確認画面。本番に確認画面の文字列が残らないことも点検する。
- mainへpush後にCloudflare Pagesの成功、JS/CSS/画像/SWの一致、旧公開版で作った確認用セーブからの再開を読み戻す。Pixel 9a実機は未確認。

## 過去の3.1引継ぎ

# 3.1 引継ぎ

正本はこのリポジトリ。親フォルダーの旧src/publicは編集・同期しない。

- 公開先 https://eight-wardens.pages.dev/ 。mainのpushでCloudflare Pages公開。
- 変更と検証はREADME・_VERIFY.md・tests/test_checklist.mdを参照。
- 画像10点は組み込みimage_genで生成。完全なプロンプト/参照はart-v31.json。配信用WebPと切り出し情報はscripts/make-v31-webp.pyで再作成できる。元PNGはout/v31にローカル保管。
- 元素材の変更禁止確認はdocs/preserved-art-v31.json。黒い衣服を透明化せず、元の不透明ポートレートを使う。
- npm testは82件。ACCEPTANCE31=1で104件。旧任意のCALIBRATE/BALANCE/TOWERとは別に受入完走を実行する。
- 開発限定?qa=reviewは全ステージの見た目確認用。配信ビルドでは無効。既存?dbg=1は以前からの手動デバッグ入口。
- 保存確認/バックアップ/復元画面は追加しない。Pixel 9a実機は未確認。
