# 農業経営ダッシュボード (AgriCRM) — Vercel デプロイ手順

## ディレクトリ構成

```
agricrm/                 ← このフォルダをGitHubにそのままプッシュ
├── index.html           ← アプリ本体（単一ファイル）
├── manifest.json        ← PWA マニフェスト
├── sw.js                ← Service Worker（オフライン対応）
├── vercel.json          ← Vercel 設定ファイル
├── icons/
│   ├── icon-192.png     ← Android / PWA アイコン (192x192)
│   ├── icon-512.png     ← Android / PWA アイコン (512x512)
│   └── apple-touch-icon.png  ← iOS ホーム画面アイコン (180x180)
└── README.md            ← この手順書
```

---

## Vercel へのデプロイ手順

### 方法①：GitHub 連携（推奨）

1. **GitHubリポジトリを作成**
   ```bash
   git init
   git add .
   git commit -m "initial: AgriCRM PWA"
   git branch -M main
   git remote add origin https://github.com/あなたのユーザー名/agricrm.git
   git push -u origin main
   ```

2. **Vercelにログイン** → https://vercel.com

3. **「New Project」→ GitHubリポジトリを選択**

4. **設定はデフォルトのままで「Deploy」**
   - Framework Preset: **Other**（フレームワークなし）
   - Root Directory: `/`（ルートのまま）
   - Build Command: **空欄**（ビルド不要）
   - Output Directory: **空欄**（ルートをそのまま公開）

5. **デプロイ完了** → `https://あなたのプロジェクト名.vercel.app` でアクセス可能

---

### 方法②：Vercel CLI（コマンドライン）

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ（プロジェクトルートで実行）
cd agricrm
vercel

# 本番デプロイ
vercel --prod
```

---

## ホーム画面への追加手順（スマートフォン）

### iPhone (iOS Safari)

1. Safari でデプロイURLにアクセス
2. 画面下部の **「共有」ボタン（四角に矢印）** をタップ
3. **「ホーム画面に追加」** をタップ
4. アプリ名を確認して **「追加」** をタップ
5. ホーム画面に「農業経営」アイコンが追加される

### Android (Chrome)

1. Chrome でデプロイURLにアクセス
2. アドレスバー右の **「︙」メニュー** → **「ホーム画面に追加」**
3. または、ページ下部に自動で「インストール」バナーが表示される
4. **「インストール」** をタップ

---

## PWA の動作確認（Chrome DevTools）

1. Chrome でデプロイURLにアクセス
2. `F12` → **Application タブ**
3. 以下を確認:
   - **Manifest**: アプリ名・アイコンが表示されているか
   - **Service Workers**: Status が `activated and running`
   - **Cache Storage**: `agricrm-shell-v1` にファイルがキャッシュされているか
4. **Lighthouse** → **Progressive Web App** でスコアを確認

---

## よくあるトラブルと対処法

| 症状 | 原因 | 対処 |
|------|------|------|
| `manifest.json` が読み込まれない | Content-Type ヘッダー不正 | `vercel.json` の headers 設定を確認 |
| SW が登録されない | HTTPS 未対応 | Vercel はデフォルトでHTTPS ✅ |
| アイコンが表示されない | パスが間違っている | `/icons/` のスラッシュを確認 |
| オフライン時に白画面になる | SW の install が失敗 | DevTools > Application > SW で「Skip waiting」を手動実行 |
| CDN（Tailwind/Chart.js）が読み込まれない | ネットワーク不通 | 初回はオンラインで開いてキャッシュを作る必要あり |

---

## キャッシュの更新方法

`CACHE_NAME = 'agricrm-v1'` の `v1` 部分をインクリメントすると、
次回アクセス時に古いキャッシュが削除されて新しいバージョンが適用されます。

```js
// sw.js
const CACHE_NAME = 'agricrm-v2'; // ← バージョンを上げる
```

---

## データについて

- すべてのデータは **ブラウザのlocalStorage** に保存されます
- Vercelサーバーにはデータは一切送信されません
- スマートフォンを機種変更する場合はデータのバックアップが必要です（現状、CSVエクスポートのみ対応）
