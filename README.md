# サポートアーム ランディングページ

岩代工業株式会社のサポートアーム製品紹介ページです。

## 公開URL

- **本番サイト**: https://support-arm.com
- **Cloudflare Pages**: https://support-arms-landing.pages.dev
- **GitHub**: https://github.com/syokota-cyber/support-arms-landing

## ホスティング構成

```
GitHub Repository (syokota-cyber/support-arms-landing)
         ↓
      git push
         ↓
   Cloudflare Pages（自動デプロイ）
         ↓
   https://support-arm.com
```

## デプロイ方法

ファイルを編集後、以下のコマンドで本番サイトに反映されます：

```bash
cd /Users/yokota/Desktop/support_arms

# 変更をステージング
git add .

# コミット（メッセージは変更内容を記述）
git commit -m "変更内容の説明"

# プッシュ → 自動的にCloudflare Pagesにデプロイ
git push
```

**デプロイ完了まで**: 約1〜2分

## プロジェクト構成

```
support_arms/
├── index.html          # メインHTML
├── styles/
│   └── main.css        # スタイルシート
├── scripts/
│   └── main.js         # JavaScript
└── assets/
    ├── images/         # 画像ファイル
    │   ├── hero/       # 3Dモデル (.glb)
    │   ├── company/    # 会社・製品図
    │   ├── products/   # 製品画像
    │   └── works/      # 活用例画像
    ├── videos/         # 動画ファイル
    └── *.pdf           # 取扱説明書
```

## ローカルでの確認方法

### 方法1: ブラウザで直接開く
```bash
open index.html
```

### 方法2: ローカルサーバーを起動
```bash
npx serve .
```
→ http://localhost:3000 でアクセス

## 管理画面

- **Cloudflare Pages**: https://dash.cloudflare.com → Workers & Pages → support-arms-landing
- **GitHub Settings**: https://github.com/syokota-cyber/support-arms-landing/settings

## 関連ファイル（バックアップ）

LP制作に使用した素材ファイルは以下に保存：
```
/Users/yokota/Desktop/support_arms_backup/
```

## 製品情報

サポートアームは、作業効率を劇的に向上させる多関節アームシステムです。
思い通りの位置で、思い通りの角度で、確実にホールドします。

### 特徴
- 多関節構造（7関節）
- 確実なホールド
- 軽量設計（アルミニウム合金）
- 高耐久性
- 多彩な取付オプション
- 安全設計

## お問い合わせ

岩代工業株式会社
- TEL: 03-3756-1511
- [お問い合わせフォーム](https://forms.gle/RpNWkLg2wVazYFdP7)

---

最終更新: 2026-01-22
