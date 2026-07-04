---
name: photo-to-3d-viewer
description: 製品写真1枚からBlender(bpy)スクリプトで3D CADモデル(GLB)を作成し、model-viewerでWebサイトに360°回転ビューとして実装する。写真から3Dモデルを作りたい、360°ビューアにモデルを追加/差し替えたい、GLBの色・質感・白とびを直したいときに使う。
---

# 写真→3D CADモデル→Web 360°ビューア実装

製品写真を参考にBlenderのPythonスクリプトでパラメトリックにモデリングし、
GLBを書き出して `<model-viewer>` の360°ビューアに組み込む一連の手順。

AI画像→3D生成(Tripo等)と違い、**裏側の破綻・色汚染(錆状の茶色ムラ)が原理的に
発生せず、ファイルサイズも1/100以下**(実績: 133KB vs AI生成16MB)になる。
機械部品(パイプ・関節・平板・ブラケット類)に最適。有機的形状(蛇腹ホース等)は
カーブ+配列モディファイアが必要で難度が上がる。

## 前提

- Blender(このマシンは `/Applications/Blender.app`)。FreeCADでも可能だが、
  glTFエクスポートとPBRマテリアルの扱いはBlenderのほうが素直。
- 実行: `/Applications/Blender.app/Contents/MacOS/Blender -b -P <script.py>`
- 既存の実例: `tools/blender/build_tablet_arm.py`(壁付けタブレットアーム。
  ヘルパー関数・マテリアル値・座標系対応が全部入りなので、**新モデルはこれを
  コピーして改変するのが最速**)

## 手順

### 1. 写真から構造を読み取る

写真を Read で開き、部品を列挙する: ベースプレート、アーム(角パイプ/丸パイプ)、
関節(円筒/球)、クランプ、ブラケット、保持対象物。各部品の接続関係と
おおよその寸法比を決める(実寸メートルで考える。全長1〜2m程度)。

### 2. bpyスクリプトでモデリング

`tools/blender/build_tablet_arm.py` をコピーし、ヘルパーを使って組み立てる:

- `box(center, size, mat, rot)` — 直方体。**size=1のキューブに o.scale = size
  (半分にしない。過去に半寸バグで部品がバラバラに浮いた)**
- `seg(p1, p2, w, mat, kind="square"|"round", r)` — 2点間のパイプ。
  `to_track_quat("Z","Y")` で向きを合わせる
- `cyl(center, radius, depth, mat, axis)` — 関節などの円筒
- `ball(center, radius, mat)` — ボールジョイント

キーポイント(関節位置)を先に `Vector` で定義し、部品はそこから相対配置する。
傾いた面(タブレット等)は `mathutils.Euler(rot).to_matrix()` から法線 n・面内軸
ex/ey を取り、`center + n*オフセット` で積層する(本体→スクリーン→クリップ)。

### 3. 座標系の罠(必ず確認)

- Blenderは Z-up、glTFは Y-up。エクスポータが自動変換する(X→X, Z→Y, Y→-Z)
- **model-viewerの初期カメラはBlenderの -Y 方向から見る**。正面を向けたい面の
  法線は -Y へ。「画面が横を向く/そっくり返る」不具合はほぼこれが原因
- 上下傾斜はEuler X回転で付ける: `rot=(radians(70),0,0)` → 法線が-Y向き・上20°

### 4. マテリアル(白とび対策込み)

Principled BSDFはノード名でなく `n.type == "BSDF_PRINCIPLED"` で取得
(Blender 5系はノード名参照が不安定)。

model-viewerの環境光は強く、**metallic=1.0 + 明るいbaseColorは白とびして
輪郭が消える**。かといってmetallicを下げすぎるとプラスチックに見える。
実績値(そのまま使ってよい):

| 用途 | baseColor | metallic | roughness |
|---|---|---|---|
| ステンレス角パイプ | (0.50, 0.51, 0.53) | 0.85 | 0.45 |
| 磨き丸パイプ | (0.58, 0.59, 0.61) | 1.00 | 0.25 |
| 黒メタル金具 | (0.28, 0.28, 0.30) | 1.0 | 0.45 |
| タブレット筐体(アルミ) | (0.30, 0.31, 0.33) | 0.9 | 0.40 |
| スクリーン | (0.03, 0.035, 0.055) | 0.0 | 0.55 |

原則: **metallicは高く保ち、baseColorを半分に下げて反射ピークを制御**。
スクリーン等の平滑面は roughness 0.5+ にしないと環境光を鏡面反射して白く飛ぶ。
黒い物は真っ黒(0.015)にしない — 影と同化して輪郭が消える。

### 5. エクスポートとサイト組み込み

- `bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")`。
  出力先は `assets/images/hero/<name>.glb`
- `index.html` の `.model-viewer__toggle` にボタン追加:
  `<button class="model-toggle-btn" data-model="./assets/images/hero/<name>.glb?v=1">表示名</button>`
  JS(`scripts/main.js`)は変更不要。表示名はGA計測のラベルにもなる
- **GLBを差し替えたら必ず `?v=N` を上げる**(ブラウザがGLBをディスクキャッシュ
  するため、上げないと再訪ユーザーと自分のローカル確認の両方で旧モデルが出続ける)
- ビューア操作性: `<model-viewer>` に `min-camera-orbit="auto auto 20%"` で
  接近ズームを許可。パン(右ドラッグ/2本指)の案内をヒント文に入れる

### 6. 検証ループ

1. `python3 -m http.server 8972` でサーブし、Chromeで
   `http://localhost:8972/index.html#viewer360-header` を開く
2. トグルを切り替えてスクリーンショット確認。**GLB更新後はハードリロード
   (Cmd+Shift+R)か ?v= 更新が必須**
3. ドラッグ回転で全周チェック(部品の分離・貫通・法線向き)
4. ズームインで細部チェック(白とび・輪郭消失)
5. 白い画面のままのときは一度クリックしてから撮る(バックグラウンドタブは
   rAF停止で描画が止まる)
6. 微調整(角度・サイズ・色)はスクリプトの数値を変えて再実行するだけ

### 7. 既存GLBの色修正だけしたい場合(AI生成モデルの錆色など)

3D再生成は不要。テクスチャだけ直す:

```bash
npx @gltf-transform/cli copy in.glb out.gltf   # テクスチャ分離
# PILで baseColor_*.png をグレースケール化(製品が無彩色の場合)+autocontrast
npx @gltf-transform/cli draco out.gltf fixed.glb  # 再パック+圧縮
```

無彩色の製品(黒ダクト+ステンレス等)なら全面グレースケール化で
色汚染(茶色ムラ・緑斑点)が一掃できる。
