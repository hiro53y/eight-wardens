# Eight Wardens：八人の防衛隊

## 起動方法
Windows:

```bat
start-dev.bat
```

手動で起動する場合:

```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run build
```

## 操作
- 横向き画面で遊びます。縦向きでは案内画面が出ます。
- タイトルから「はじめる」または「つづきから」を選びます。
- ステージ選択で出撃し、バトル中はユニットを選んで攻撃/休憩/LvUp/転職を切り替えます。
- Wave10のボスを倒すとMVPクリアです。

## セーブ
- localStorageに保存されます。
- 保存キー: `eight-wardens-save-v1`
- 設定キー: `eight-wardens-settings-v1`
