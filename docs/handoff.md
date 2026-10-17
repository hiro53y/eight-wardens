# 3.1 引継ぎ

正本はこのリポジトリ。親フォルダーの旧src/publicは編集・同期しない。

- 公開先 https://eight-wardens.pages.dev/ 。mainのpushでCloudflare Pages公開。
- 変更と検証はREADME・_VERIFY.md・tests/test_checklist.mdを参照。
- 画像10点は組み込みimage_genで生成。完全なプロンプト/参照はart-v31.json。配信用WebPと切り出し情報はscripts/make-v31-webp.pyで再作成できる。元PNGはout/v31にローカル保管。
- 元素材の変更禁止確認はdocs/preserved-art-v31.json。黒い衣服を透明化せず、元の不透明ポートレートを使う。
- npm testは82件。ACCEPTANCE31=1で104件。旧任意のCALIBRATE/BALANCE/TOWERとは別に受入完走を実行する。
- 開発限定?qa=reviewは全ステージの見た目確認用。配信ビルドでは無効。既存?dbg=1は以前からの手動デバッグ入口。
- 保存確認/バックアップ/復元画面は追加しない。Pixel 9a実機は未確認。
