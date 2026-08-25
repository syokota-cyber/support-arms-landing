# GA4 計測仕様（サポートアームLP）

測定ID: `G-DE9NN4XB0P` / gtag.js を `index.html` に直接設置（GTMなし）

実装ファイル:

| ファイル | 役割 |
| --- | --- |
| `scripts/analytics.js` | セクション閲覧・滞在時間・クリック計測（今回追加） |
| `scripts/main.js` | 既存の機能実装内に埋め込まれた計測（CTA・FAQ・フォーム・3Dモデル等） |
| `tools/verify-analytics.mjs` | Puppeteer による自動検証 |

---

## 1. 計測できること

### セクション単位

| イベント | 発火条件 | パラメータ |
| --- | --- | --- |
| `section_view` | セクションが50%以上（画面より高い場合は画面の60%以上）表示され、**1秒以上**継続したとき。1ページ表示につきセクションごとに1回 | `section_id`, `section_name`, `section_index` |
| `section_engagement` | そのセクションを離れた時点で、累積滞在が**3秒以上**あれば送信。離脱時に残りを送信 | `section_id`, `section_name`, `section_index`, `engagement_sec` |
| `page_engagement_summary` | タブを離れる／ページを離脱するたびに1回 | `summary_seq`, `top_section_id`, `top_section_name`, `top_section_sec`, `total_engagement_sec` |

滞在時間はタブが**可視のときだけ**加算する（バックグラウンド放置は計上しない）。
セクションを離れた時点で随時送るため、離脱時の一括送信に失敗しても大半は取得できる。

モーダル（活用例・FAQ・資料DL・ギャラリー拡大）を開いている間は、背後のセクションではなく
**モーダル自身**に滞在が加算される（`section_id` はモーダルのID、`section_index` は `-1`）。

`page_engagement_summary` は「前回サマリ以降の区間」を表す差分イベント。
タブを離れて戻ったユーザーでも合計が正しくなるよう、`summary_seq` を振って複数回送る。
`total_engagement_sec` は **SUM で合計して使ってよい**。
「何セクション見たか」は `section_view` のユニーク数で数える。

### クリック（今回追加）

| イベント | 対象 | パラメータ |
| --- | --- | --- |
| `tel_click` | `tel:` リンク全4箇所（ヘッダー2・問い合わせ・フッター） | `section_id`, `section_name`, `phone_number` |
| `download_modal_open` | 資料DLモーダルを開くボタン（ヘッダー・バナー・フッター） | `section_id`, `section_name`, `link_text` |
| `file_open` | PDF等のファイルリンク（相対パスも含む） | `section_id`, `section_name`, `file_name`, `file_extension`, `link_text` |
| `faq_modal_open` | FAQモーダルを開く操作 | `section_id`, `section_name`, `open_from`(`button`/`category`), `faq_category`, `link_text` |
| `gallery_image_open` | 製品ギャラリー画像（ライトボックス表示） | `section_id`, `section_name`, `image_label` |
| `carousel_interact` | 法規制・特徴・ギャラリー・お役立ち情報の各カルーセル操作 | `section_id`, `section_name`, `direction`(`prev`/`next`/`indicator`) |
| `knowledge_tab_select` | お役立ち情報のタブ切替 | `section_id`, `section_name`, `tab_index`, `tab_name` |
| `nav_click` | ヘッダー・フッターのページ内リンク | `section_id`, `section_name`, `link_text`, `target_section` |

### フォーム（今回追加）

| イベント | 発火条件 | パラメータ |
| --- | --- | --- |
| `form_input_start` | 最初の入力操作（フォームごとに1回） | `form_name`(`contact`/`download_survey`) |
| `form_submit_attempt` | 送信ボタンを押した時点（成否を問わない） | `form_name` |
| `form_validation_error` | 入力エラーで送信できなかったとき（1回の送信操作につき1件） | `form_name`, `field_name` |

`form_submit_attempt` − `contact_form_submit` の差が「送信を試みたが完了しなかった」数になる。

### 既存イベント（`scripts/main.js`）

`contact_click` / `external_link_click` / `application_modal_open` / `faq_click` /
`contact_form_submit` / `guide_download` / `product_3d_load` / `product_3d_toggle` /
`video_load` / `scroll_depth`

`faq_click` のカテゴリは `category` という汎用名だったため、`faq_modal_open` と揃えて `faq_category` にリネームした。

既存イベントは UA 由来の `event_category` / `event_label` を送っている。`event_label` には
FAQの質問文・CTAの文言・活用例名・3Dモデル種別など、他のパラメータでは取れない値が入っているため
カスタムディメンションとして登録が必要。`event_category` は固定文字列なので登録しない。

`contact_click` と `external_link_click` には今回 `section_id` / `section_name` を追加した。
同じ文言のCTA（「この用途で相談する」など）が複数箇所にあり、これまで区別できなかったため。

---

## 2. 今回修正した既存の不具合

| 修正前 | 修正後 | 理由 |
| --- | --- | --- |
| `3d_model_load` | `product_3d_load` | GA4のイベント名は**英字始まり必須**。数字始まりは記録されない |
| `3d_model_toggle` | `product_3d_toggle` | 同上 |
| `form_submit` | `contact_form_submit` | GA4拡張計測が自動収集する `form_submit` と名前が衝突し、「送信試行」と「送信成功」が同じ名前で混ざっていた |

> リネームにより、GA4上で過去データとの連続性は途切れる。`3d_model_*` はそもそも記録されていなかった可能性が高く、`form_submit` は数値が混在していたため、いずれも作り直しが妥当と判断した。

---

## 3. GA4管理画面で必要な設定

### 3-1. カスタムディメンション登録（必須）

**登録しないとレポート・探索でパラメータを選べない。** 管理 → データの表示 → カスタム定義 → カスタムディメンション（イベントスコープ）。上限50個。

```
section_id / section_name / section_index
form_name / field_name
file_name / file_extension / link_text
image_label / direction / open_from / faq_category / tab_index / tab_name / target_section
event_label                          （既存イベントが実データを載せているため必要）
phone_number / top_section_id / top_section_name / summary_seq
inquiry_type / contact_job_role      （contact_form_submit 用）
job_role / lev_status                （guide_download 用）
modal_id / link_url                  （既存イベント用）
```

### 3-2. カスタム指標登録（必須）

管理 → カスタム定義 → カスタム指標（イベントスコープ、単位: 標準）。

```
engagement_sec / top_section_sec / total_engagement_sec
```

### 3-2b. 一括登録スクリプト

管理画面での手入力（コピペが効かない）を避けるため、Admin API で 3-1 / 3-2 をまとめて登録できる。

```bash
# アクセストークンを取得（gcloud不要・有効期限1時間）
#   https://developers.google.com/oauthplayground/ で
#   スコープ https://www.googleapis.com/auth/analytics.edit を承認 → Access token をコピー
export GA4_TOKEN="ya29...."

node tools/ga4-setup-dimensions.mjs           # 差分表示のみ
node tools/ga4-setup-dimensions.mjs --apply   # 作成・修正を実行
```

登録済みのものは触らない（表示名・説明は管理画面で付けたものを尊重する）。
スクリプト内の `FIXES` に挙げたものだけ表示名・説明を上書きする。
`parameterName` は作成後に変更できないため、パラメータ名を間違えた場合は削除して作り直す。

### 3-3. キーイベント（旧コンバージョン）

- `contact_form_submit`（問い合わせ完了）
- `guide_download`（資料DL完了）
- `tel_click`（電話タップ。BtoBでは主要な問い合わせ経路）

`section_view` / `section_engagement` / `download_modal_open` などは診断用途なのでキーイベントにしない。

### 3-4. 拡張計測との重複に注意

拡張計測（データストリーム設定で既定ON）は以下を自動収集する。自前実装と**別イベントとして併存**するので、集計時はどちらを正とするか決めておく。

| 自前 | 拡張計測 | 関係 |
| --- | --- | --- |
| `scroll_depth`(25/50/75/100%) | `scroll`(90%到達1回) | 粒度が違う。分析には自前を使う |
| `external_link_click` | `click`(outbound) | ほぼ同一条件。自前はセクション情報が付くぶん有利 |
| `file_open` | `file_download` | ほぼ同一条件。自前はセクション情報が付く。拡張計測側をOFFにすると重複が消える |
| `form_input_start` / `form_submit_attempt` | `form_start` / `form_submit` | 名前は衝突させていない。全フォーム対象の拡張計測より自前のほうがフォームを区別できる |

---

## 4. GA4の制約（実装時の前提）

- イベント名: 40文字以内・英字始まり・英数字と `_` のみ・`ga_` `google_` `firebase_` `gtag_` および先頭 `_` は禁止
- パラメータ名: 40文字以内、同じ文字制約
- パラメータ値: **100文字以内**（超過分は切り捨て）
- 1イベントあたりのパラメータ数: **25個まで**（自動付与分込み）
- 上限超過は**エラーにならず、黙って記録されない**

`analytics.js` の `clip()` が値を100文字に丸めている。

出典:
- [[GA4] Event collection limits](https://support.google.com/analytics/answer/9267744)
- [[GA4] Automatically collected events](https://support.google.com/analytics/answer/9234069)
- [[GA4] Enhanced measurement events](https://support.google.com/analytics/answer/9216061)
- [[GA4] Custom dimensions and metrics limits](https://support.google.com/analytics/answer/10075209)

---

## 5. 検証方法

```bash
python3 -m http.server 8899          # リポジトリルートで
node tools/verify-analytics.mjs                # デスクトップ 1280x900
node tools/verify-analytics.mjs --mobile       # モバイル 390x844
node tools/verify-analytics.mjs --headful      # ブラウザを表示して確認
```

Puppeteer で `dataLayer` をフックし、実際に送信されるイベントを検査する。
GA4本番へはヒットを飛ばさない（`google-analytics.com` / `googletagmanager.com` へのリクエストは遮断）。

検証項目（31件・デスクトップ/モバイル両方で PASS）:
- 全16セクションで `section_view` が1回ずつ発火する
- タブを離れて戻った場合もサマリが更新される（`summary_seq` が進み、区間ごとの値になる）
- モーダル閲覧中の滞在が背後のセクションに誤加算されない
- Enterキーによる暗黙送信も `form_submit_attempt` で拾える
- 絶対URLのPDFリンクが `file_open` と `external_link_click` で二重計上されない
- セクションを離れた時点で `section_engagement` が実滞在時間どおりに送信される
- `page_engagement_summary` が離脱時に1回だけ送信される
- 追加した各クリック計測が発火し、正しいセクション情報を持つ
- モーダル内CTAの発生元モーダルが区別できる
- フォームの入力開始・送信試行・入力エラーが計測される
- 全イベント名・パラメータ名・値・個数がGA4の制約を満たす
- 拡張計測の自動収集イベント名と衝突していない
- 既存計測（`contact_click` / `faq_click` / `product_3d_toggle`）が壊れていない
- JSエラーが出ていない

本番反映後は GA4 の **DebugView** で実際にパラメータが届いているかを必ず目視確認すること
（上限超過は無言で欠落するため、コード側の検証だけでは検出できない）。

---

## 6. 既知の限界

- OSレベルの強制終了・アプリキル時は、最後に見ていたセクションの滞在時間が失われる
- bfcache から復帰した場合、復帰後の滞在は新しい区間として計上されるが、`section_view` の重複ガードは維持されたままになる
- YouTube動画の再生は iframe 内で完結するため、`video_load`（読み込み）しか取れない。再生数を取るなら YouTube IFrame Player API の導入が必要
- 3Dビューアのドラッグ操作そのものは計測していない（読み込みとモデル切替のみ）
