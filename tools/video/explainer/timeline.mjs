// サポートアーム解説動画のタイムライン定義
// diagram は右下アーム図の姿勢（compositor.html の DIAGRAMS のキー。省略時は 'wall'）。
// 座標(x, y)は元動画フレームに対する % 指定。kb はケンバーンズ（s=倍率, cx/cy=画面中心に来る元フレーム上の点）。
// シーンの開始時刻は「前シーン終了 − 入りトランジション長」で自動計算する。
// overlay の at はシーン内のローカル秒（scene を省略した場合は絶対秒）。

export const SRC = 'assets/videos/220217_IWASHIRO_SupportArm_VP_KAMPAKE.mp4';
export const FPS = 30;

// 吸引口比較カード（元動画 216.5s のフレームから左右パネルを切り出す）
export const STILLS = {
  straight: { t: 216.5, crop: { x: 168, y: 40, w: 778, h: 800 } },
  hood: { t: 216.5, crop: { x: 973, y: 40, w: 778, h: 800 } },
};

const full = {
  name: 'full',
  scenes: [
    {
      id: 'open', src: 205.9, speed: 0.75, dur: 5.0,
      kb: [{ s: 1.35, cx: 42, cy: 60 }, { s: 1.12, cx: 46, cy: 55 }],
      fx: { introReveal: 1.2, dim: 0.35 },
    },
    {
      id: 'family', src: 170.9, diagram: 'ceiling', speed: 1.3, dur: 4.4, trans: { type: 'whip', d: 0.4, dir: -1 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.1, cx: 58, cy: 45 }],
      fx: { dim: 0.25 },
    },
    {
      id: 'rot1', src: 31.8, speed: 1.25, dur: 4.6, trans: { type: 'zoom', d: 0.45 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.18, cx: 50, cy: 42 }],
    },
    {
      id: 'rot2', src: 37.4, diagram: 'wall-steep', speed: 1.8, dur: 3.6, trans: { type: 'whip', d: 0.35, dir: 1 },
      kb: [{ s: 1.08, cx: 46, cy: 50 }, { s: 1.0, cx: 50, cy: 50 }],
    },
    {
      id: 'hold1', src: 44.4, speed: 1.6, dur: 4.6, trans: { type: 'wipe', d: 0.5 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.12, cx: 55, cy: 45 }],
    },
    {
      // 伸ばしたアームから手を離し、その位置で止まっている様子（元動画 72.7s で手を離す）
      id: 'hold2', src: 70.3, diagram: 'wall-extend', speed: 0.8, dur: 5.6, trans: { type: 'whip', d: 0.35, dir: -1 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.1, cx: 40, cy: 42 }],
    },
    {
      id: 'tele1', src: 19.0, diagram: 'wall-steep', speed: 1.5, dur: 5.0, trans: { type: 'wipe', d: 0.5 },
      holds: [{ at: 2.67, d: 1.5 }],
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.28, cx: 40, cy: 58 }],
      spot: { t0: 2.67, t1: 4.17, x: 39, y: 45, rx: 11, ry: 17 },
    },
    {
      id: 'mouth1', src: 82.4, diagram: 'wall-steep', speed: 1.6, dur: 4.2, trans: { type: 'zoom', d: 0.45 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.12, cx: 34, cy: 40 }],
    },
    {
      id: 'mouth2', src: 90.5, diagram: 'wall-steep', speed: 1.2, dur: 3.2, trans: { type: 'whip', d: 0.35, dir: -1 },
      kb: [{ s: 1.05, cx: 48, cy: 45 }, { s: 1.0, cx: 50, cy: 50 }],
    },
    {
      id: 'ceil1', src: 140.6, diagram: 'ceiling-reach', speed: 1.0, dur: 4.0, trans: { type: 'wipe', d: 0.5 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.15, cx: 53, cy: 52 }],
    },
    {
      id: 'ceil2', src: 185.5, diagram: 'ceiling-reach', speed: 1.6, dur: 4.4, trans: { type: 'whip', d: 0.35, dir: 1 },
      kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.1, cx: 45, cy: 55 }],
    },
    {
      id: 'cards', type: 'cards', diagram: 'ceiling-reach', dur: 4.4, trans: { type: 'flash', d: 0.4 },
    },
    {
      id: 'cta', src: 171.5, speed: 0.6, dur: 5.6, trans: { type: 'fade', d: 0.6 },
      kb: [{ s: 1.15, cx: 50, cy: 50 }, { s: 1.05, cx: 50, cy: 50 }],
      fx: { blur: 14, dim: 0.62 },
    },
  ],
  chapters: [
    { scene: 'rot1', n: '01', title: '旋回', sub: 'アーム全体を左右に振る', joints: ['j1'] },
    { scene: 'hold1', n: '02', title: '角度保持', sub: '関節は好きな角度で止まる', joints: ['j2', 'j3'] },
    { scene: 'tele1', n: '03', title: '伸縮', sub: '先端アームの長さを調整', joints: ['tele'] },
    { scene: 'mouth1', n: '04', title: '吸引口の向き', sub: '前後・左右どの向きにも', joints: ['mouth'] },
    // 天井付け型の j1 は天井への取付け部で可動しないため光らせない（j2: 360°旋回部、j3: 先端のボールジョイント 上下±30°）
    { scene: 'ceil1', n: '05', title: '天井付け型', sub: '水平360°・上下±30°', joints: ['j2', 'j3'] },
    { scene: 'cards', n: '06', title: '吸引口の形状', sub: '発生源に合わせて選べる', joints: ['mouth'], slam: false },
  ],
  overlays: [
    // オープニング
    { type: 'title', scene: 'open', at: 0.5, until: 4.7, lines: ['ヒューム・粉じんは、', '発生源で吸う。'], accentLine: 1 },
    { type: 'callout', scene: 'open', at: 2.4, until: 4.7, x: 41, y: 66, label: '吸引口を発生源のすぐそばへ', dx: 300, dy: 150, ring: 70 },
    // 製品紹介
    { type: 'hero', scene: 'family', at: 0.2, until: 4.2, kicker: '局所排気用', name: 'サポートアーム', big: '3関節＋1伸縮', sub: 'ダクトを、狙った位置でピタッと止める。' },
    { type: 'diagramIntro', scene: 'family', at: 1.2 },
    // 01 旋回
    { type: 'arc', scene: 'rot1', at: 1.4, until: 4.4, x: 49, y: 30, r: 230, a0: 20, a1: 160, label: '左右 各90°', note: '壁付け型' },
    { type: 'callout', scene: 'rot1', at: 1.0, until: 4.4, x: 49, y: 30, label: '旋回ベース', dx: -420, dy: 120, ring: 60 },
    { type: 'lower', scene: 'rot2', at: 0.3, until: 3.4, text: 'アームごと左右に振って、作業位置へ' },
    // 02 角度保持
    { type: 'callout', scene: 'hold1', at: 1.3, until: 4.4, x: 45.5, y: 30, label: '関節', dx: -330, dy: -40, ring: 55, track: true },
    { type: 'lower', scene: 'hold1', at: 2.0, until: 4.4, text: '関節を曲げて、好きな高さ・角度に' },
    { type: 'callout', scene: 'hold2', at: 3.4, until: 5.3, x: 16.5, y: 37, label: '手を離しても止まる', dx: 330, dy: 230, ring: 70 },
    { type: 'badge', scene: 'hold2', at: 3.7, until: 5.3, label: '保持荷重', value: 3, unit: 'kg', pos: 'right' },
    // 03 伸縮
    { type: 'freeze', scene: 'tele1', at: 2.67, until: 4.17 },
    { type: 'callout', scene: 'tele1', at: 2.8, until: 4.3, x: 39, y: 45, label: 'クランプレバー', dx: 360, dy: -40, ring: 60 },
    { type: 'lower', scene: 'tele1', at: 2.9, until: 4.8, text: 'レバーを緩めて、先端アームを伸縮' },
    // 04 吸引口の向き
    { type: 'spin', scene: 'mouth1', at: 1.0, until: 4.0, x: 31, y: 32, r: 190 },
    { type: 'lower', scene: 'mouth1', at: 1.2, until: 4.0, text: '吸引口は、前後・左右どの向きでも保持' },
    { type: 'callout', scene: 'mouth2', at: 0.3, until: 3.0, x: 46, y: 37, label: '手元で向きを調整', dx: 330, dy: 140, ring: 55 },
    // 05 天井付け型
    // 水色リングは可動部（支柱下の360°旋回部）に付け、カメラのティルトに合わせて追従させる。
    // その下のヒンジはアームジョイント（ボールジョイントは先端側の関節）なので、白い引き出し線で名称のみ示す
    {
      type: 'callout', scene: 'ceil1', at: 1.0, until: 3.8, label: '360°旋回部', dx: 300, dy: 70, ring: 72,
      path: [[0.8, 53.0, 55.7], [1.3, 52.6, 55.2], [1.8, 52.8, 54.8], [2.3, 52.7, 54.0], [2.8, 52.7, 53.5], [3.3, 53.0, 53.5], [3.8, 53.0, 52.6]],
    },
    {
      type: 'callout', scene: 'ceil1', at: 1.5, until: 3.8, label: 'アームジョイント', dx: -200, dy: 170, plain: true,
      path: [[0.8, 52.8, 67.5], [1.3, 52.5, 67.0], [1.8, 53.1, 66.4], [2.3, 53.0, 65.6], [2.8, 53.0, 64.2], [3.3, 52.3, 63.6], [3.8, 51.9, 63.0]],
    },
    { type: 'badge', scene: 'ceil1', at: 1.5, until: 3.9, label: '水平旋回（天井付け型）', value: 360, unit: '°', pos: 'right' },
    { type: 'lower', scene: 'ceil2', at: 0.3, until: 4.2, text: '天井から吊るして、作業エリアを広く使える' },
    // 06 吸引口の形状は cards シーン側で描画
    // CTA は cta シーン側で描画
  ],
};

const hero = {
  name: 'hero',
  loop: true,
  // 落ち着いたテンポにするため、切り替えはすべてゆっくりしたクロスフェード（0.9秒）にそろえ、
  // カメラの寄り・パンも小さくする。チップは前後のクロスフェードと重ならない時間だけ表示する。
  scenes: [
    // 画面下端に作業者の帽子が見切れるため、上寄りに少し寄せて下端を元フレームの約86%までにする
    { id: 'h1', src: 31.8, speed: 1.0, dur: 4.4, kb: [{ s: 1.16, cx: 50, cy: 43.1 }, { s: 1.2, cx: 50, cy: 41.7 }] },
    { id: 'h2', src: 44.4, speed: 1.3, dur: 4.3, trans: { type: 'fade', d: 0.9 }, kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.05, cx: 52, cy: 48 }] },
    { id: 'h3', src: 69.0, speed: 1.0, dur: 4.3, trans: { type: 'fade', d: 0.9 }, kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.04, cx: 48, cy: 48 }] },
    { id: 'h4', src: 82.4, speed: 1.4, dur: 4.1, trans: { type: 'fade', d: 0.9 }, kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.05, cx: 44, cy: 46 }] },
    { id: 'h5', src: 185.5, speed: 1.3, dur: 4.4, trans: { type: 'fade', d: 0.9 }, kb: [{ s: 1.0, cx: 50, cy: 50 }, { s: 1.05, cx: 48, cy: 52 }] },
    { id: 'h6', src: 205.9, speed: 0.8, dur: 4.4, trans: { type: 'fade', d: 0.9 }, kb: [{ s: 1.2, cx: 43, cy: 58 }, { s: 1.14, cx: 45, cy: 56 }] },
    // ループの継ぎ目：先頭シーンの1フレーム目（h1 の開始構図）へクロスフェード
    { id: 'hloop', src: 31.8, speed: 1.0, dur: 0.9, still: true, trans: { type: 'fade', d: 0.9 }, kb: [{ s: 1.16, cx: 50, cy: 43.1 }, { s: 1.16, cx: 50, cy: 43.1 }] },
  ],
  chapters: [],
  overlays: [
    { type: 'chip', scene: 'h1', at: 0.6, until: 3.4, n: '01', text: '左右に旋回' },
    { type: 'chip', scene: 'h2', at: 1.0, until: 3.3, n: '02', text: '好きな角度で保持' },
    { type: 'chip', scene: 'h3', at: 1.0, until: 3.3, n: '03', text: '先端アームを上に逃がす' },
    { type: 'chip', scene: 'h4', at: 1.0, until: 3.1, n: '04', text: '吸引口の向きも自在' },
    { type: 'chip', scene: 'h5', at: 1.0, until: 3.4, n: '05', text: '天井付けにも対応' },
    { type: 'chip', scene: 'h6', at: 1.0, until: 3.4, n: '', text: '発生源のそばで、吸う。' },
  ],
};

export const TIMELINES = { full, hero };

// シーン開始時刻・総尺を計算し、overlay の時刻を絶対秒に解決する
export function resolve(tl) {
  let t = 0;
  let prevEnd = 0;
  const scenes = tl.scenes.map((s, i) => {
    const td = i === 0 ? 0 : (s.trans?.d ?? 0);
    const start = i === 0 ? 0 : prevEnd - td;
    prevEnd = start + s.dur;
    t = prevEnd;
    const holdTotal = (s.holds || []).reduce((a, h) => a + h.d, 0);
    return { ...s, start, clipDur: s.dur - holdTotal };
  });
  const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));
  const abs = (o, k) => (o.scene ? byId[o.scene].start + o[k] : o[k]);
  const overlays = tl.overlays.map((o) => ({ ...o, t0: abs(o, 'at'), t1: o.until != null ? abs(o, 'until') : null }));
  const chapters = tl.chapters.map((c) => ({ ...c, t0: byId[c.scene].start }));
  return { ...tl, scenes, overlays, chapters, duration: t, fps: FPS };
}
