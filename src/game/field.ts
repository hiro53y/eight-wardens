// 戦場の形：背景の絵（1672×941）に描かれた12の台座・3本の道・城門。敵は道を左から右へ進み、城門で村に入る
export const FIELD_W = 1672;
export const FIELD_H = 941;

/** 12の防衛地点。番号は旧セーブと共通、座標と隣接は全処理で共有する。 */
export const PEDESTALS: [number, number][] = [
  [540,395], [850,365], [1160,415],
  [400,520], [720,530], [1030,545],
  [540,650], [880,660], [1190,690],
  [345,775], [710,785], [1040,780],
];
/** 近隣の地点を短い辺から結ぶ。最大3本、350px以内の相互接続。 */
export const NEIGHBORS: number[][] = PEDESTALS.map(()=>[]);
const edges=PEDESTALS.flatMap(([x,y],i)=>PEDESTALS.slice(i+1).map(([bx,by],k)=>({a:i,b:i+k+1,d:Math.hypot(x-bx,y-by)}))).filter(e=>e.d<=350).sort((a,b)=>a.d-b.d||a.a-b.a||a.b-b.b);
for(const e of edges)if(NEIGHBORS[e.a].length<3&&NEIGHBORS[e.b].length<3){NEIGHBORS[e.a].push(e.b);NEIGHBORS[e.b].push(e.a);}

/** 城門（敵がここに着くと村に入る） */
export const GATE: [number, number] = [1362, 404];

/** 3本の道の高さ */
export const LANES = [460, 548, 668];

export type Pt = [number, number];

/** 道すじ（左の外から城門まで） */
export function lanePath(lane: number): Pt[] {
  const y = LANES[lane] ?? LANES[1];
  if (lane === 0) return [[-70, y], [1250, y], [GATE[0], GATE[1] + 10]];
  if (lane === 1) return [[-70, y], [1210, y], [1290, 470], [GATE[0], GATE[1] + 10]];
  return [[-70, y], [1170, y], [1270, 560], [1300, 470], [GATE[0], GATE[1] + 10]];
}

/** 飛行の道すじ（道を無視して城門へ） */
export function flyPath(lane: number): Pt[] {
  const y = [300, 380, 470][lane] ?? 380;
  return [[-90, y], [GATE[0], GATE[1] - 30]];
}

export interface Path { pts: Pt[]; seg: number[]; length: number }

export function makePath(pts: Pt[]): Path {
  const seg: number[] = [];
  let length = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    length += d;
  }
  return { pts, seg, length };
}

/** 道すじの上の位置（d は始めからの距離） */
export function pointAt(p: Path, d: number): Pt {
  let rest = Math.max(0, Math.min(p.length, d));
  for (let i = 0; i < p.seg.length; i++) {
    if (rest <= p.seg[i] || i === p.seg.length - 1) {
      const k = p.seg[i] > 0 ? Math.min(1, rest / p.seg[i]) : 1;
      const a = p.pts[i], b = p.pts[i + 1];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    rest -= p.seg[i];
  }
  return p.pts[p.pts.length - 1];
}

const cache = new Map<string, Path>();
export function pathOf(lane: number, fly: boolean): Path {
  const key = `${fly ? 'f' : 'g'}${lane}`;
  let p = cache.get(key);
  if (!p) { p = makePath(fly ? flyPath(lane) : lanePath(lane)); cache.set(key, p); }
  return p;
}
