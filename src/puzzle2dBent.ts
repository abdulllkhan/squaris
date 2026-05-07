// 2D bent-pieces puzzle module — analog of puzzle3d.ts but for the planar
// case. Pieces are bent polyominoes (L-tromino, L/J/T/S/Z-tetrominoes) and
// the orientation group is one of:
//
//   C₄ — cyclic rotation group, 4 elements (rotation only)
//   D₄ — dihedral group, 8 elements (rotation + reflection)
//
// Easy/Medium difficulties use C₄; Hard uses D₄ to surface chirality
// (L ≢ J, S ≢ Z under rotation alone) — the player must use flip
// controls in addition to rotation.

export type Vec2 = [number, number];

export type SymmetryGroup = 'C4' | 'D4';

export interface PieceType2D {
  id: string;
  label: string;
  color: string;
  baseCells: Vec2[];
}

export interface PuzzlePiece2D {
  typeId: string;
  orientationIndex: number;
  position: Vec2;
}

export interface Puzzle2D {
  width: number;
  height: number;
  pieces: PuzzlePiece2D[];
}

export interface InventoryEntry2D {
  typeId: string;
  label: string;
  color: string;
  total: number;
  remaining: number;
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

export function cellKey2D(x: number, y: number): string {
  return `${x},${y}`;
}

function normalize2D(cells: Vec2[]): Vec2[] {
  const minX = Math.min(...cells.map(c => c[0]));
  const minY = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY] as Vec2);
}

function canonicalKey2D(cells: Vec2[]): string {
  return [...cells].map(c => c.join(',')).sort().join('|');
}

// ─── Symmetry primitives (screen coordinates: Y points down) ─────────────────

const ROT_CW = ([x, y]: Vec2): Vec2 => [-y, x];
const FLIP_H = ([x, y]: Vec2): Vec2 => [-x, y];

function buildSymmetryGroup(
  generators: Array<(v: Vec2) => Vec2>,
): Array<(v: Vec2) => Vec2> {
  // BFS-compose the generator set to closure. Functions are de-duplicated by
  // testing them on two basis vectors — that uniquely identifies a 2x2
  // orthogonal matrix.
  const id = (v: Vec2): Vec2 => v;
  const fnKey = (fn: (v: Vec2) => Vec2): string =>
    `${fn([1, 0]).join(',')}|${fn([0, 1]).join(',')}`;

  const map = new Map<string, (v: Vec2) => Vec2>();
  map.set(fnKey(id), id);

  let prev = 0;
  while (map.size !== prev) {
    prev = map.size;
    for (const fn of [...map.values()]) {
      for (const gen of generators) {
        const composed = (v: Vec2) => gen(fn(v));
        const k = fnKey(composed);
        if (!map.has(k)) map.set(k, composed);
      }
    }
  }
  return [...map.values()];
}

// Pre-built groups. C4 has 4 elements; D4 has 8.
const C4 = buildSymmetryGroup([ROT_CW]);
const D4 = buildSymmetryGroup([ROT_CW, FLIP_H]);

// ─── Public orientation API ───────────────────────────────────────────────────

export function uniqueOrientations2D(
  baseCells: Vec2[],
  group: SymmetryGroup = 'C4',
): Vec2[][] {
  const elements = group === 'D4' ? D4 : C4;
  const seen = new Set<string>();
  const out: Vec2[][] = [];
  for (const fn of elements) {
    const rotated = baseCells.map(fn);
    const norm = normalize2D(rotated);
    const key = canonicalKey2D(norm);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(norm);
    }
  }
  return out;
}

// ─── Piece library ────────────────────────────────────────────────────────────
//
// Cells use screen coordinates (Y down): a piece's first row is y=0,
// extending +y downward. All bases are normalised so min(x) = min(y) = 0.

export const BENT_2D_PIECES: PieceType2D[] = [
  {
    id: 'unit',
    label: '1×1',
    color: '#FF6A35', // orange — fallback only, the generator avoids it
    baseCells: [[0, 0]],
  },
  {
    id: 'L-tri',
    label: 'L-Tromino',
    color: '#6FCF97', // green
    baseCells: [[0, 0], [0, 1], [1, 1]],
  },
  {
    id: 'L-tetro',
    label: 'L-Tetromino',
    color: '#F2C94C', // yellow
    baseCells: [[0, 0], [0, 1], [0, 2], [1, 2]],
  },
  {
    id: 'J-tetro',
    label: 'J-Tetromino',
    color: '#56CCF2', // sky blue (chiral mirror of L)
    baseCells: [[1, 0], [1, 1], [1, 2], [0, 2]],
  },
  {
    id: 'T-tetro',
    label: 'T-Tetromino',
    color: '#BB6BD9', // purple
    baseCells: [[0, 0], [1, 0], [2, 0], [1, 1]],
  },
  {
    id: 'S-tetro',
    label: 'S-Tetromino',
    color: '#EB5757', // red
    baseCells: [[1, 0], [2, 0], [0, 1], [1, 1]],
  },
  {
    id: 'Z-tetro',
    label: 'Z-Tetromino',
    color: '#2D9CDB', // blue (chiral mirror of S)
    baseCells: [[0, 0], [1, 0], [1, 1], [2, 1]],
  },
];

export type ResolvedPieceType2D = PieceType2D & { orientations: Vec2[][] };

// Build a piece library with orientations baked in for the requested group.
// In Easy/Medium (C4), L ≠ J and S ≠ Z — they're separate piece types in
// the inventory. In Hard (D4), L's orientations include J's (and vice
// versa), so they collapse — the generator should be told to keep only
// one of each chiral pair (we drop J and Z to avoid duplicates).
export function buildPieceLibrary(group: SymmetryGroup): ResolvedPieceType2D[] {
  const drop = group === 'D4' ? new Set(['J-tetro', 'Z-tetro']) : new Set<string>();
  return BENT_2D_PIECES
    .filter(p => !drop.has(p.id))
    .map(p => ({ ...p, orientations: uniqueOrientations2D(p.baseCells, group) }));
}

// ─── Reverse-construction generator ──────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

export function dateToSeed2D(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash) + date.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const C4_DEFAULT_WEIGHTS: Record<string, number> = {
  unit: 0.02,
  'L-tri': 0.20,
  'L-tetro': 0.18,
  'J-tetro': 0.18,
  'T-tetro': 0.20,
  'S-tetro': 0.11,
  'Z-tetro': 0.11,
};

const D4_DEFAULT_WEIGHTS: Record<string, number> = {
  unit: 0.02,
  'L-tri': 0.20,
  'L-tetro': 0.34,
  'T-tetro': 0.22,
  'S-tetro': 0.22,
};

export interface GenerateOptions2D {
  group?: SymmetryGroup;
  weights?: Record<string, number>;
  pieceTypes?: ResolvedPieceType2D[];
  /** Retry attempts before allowing the 1×1 fallback. Default 200. */
  maxAttempts?: number;
}

// Mix the user-provided seed with the attempt index to get a deterministic
// per-attempt seed. Each attempt re-runs the whole greedy generator so a
// failure to place a non-unit piece is recoverable: instead of dropping in
// a 1×1 we restart with a fresh random stream.
function mixSeed(seed: number, attempt: number): number {
  let x = (seed ^ Math.imul(attempt + 1, 2654435761)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 2246822507) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x || 1;
}

// Weighted shuffle: returns a permutation of `items` whose order is biased
// by `weight(item)`. Uses the well-known Efraimidis–Spirakis trick — assign
// each item a key u^(1/w) and sort descending.
function weightedShuffle<T>(
  items: T[],
  weight: (t: T) => number,
  random: () => number,
): T[] {
  const keys = items.map(it => {
    const w = Math.max(weight(it), 1e-9);
    const u = Math.max(random(), 1e-12);
    return { it, key: Math.pow(u, 1 / w) };
  });
  keys.sort((a, b) => b.key - a.key);
  return keys.map(k => k.it);
}

// DFS backtracking generator. Cells are filled in raster order; at each
// empty cell we try every (type, orientation, anchor) combination in a
// weighted-random order. If no bent placement leads to a complete tiling,
// returns null. Bounded by a node-visit limit so an unsolvable shuffle
// can't burn unbounded time.
function attemptBacktrack(
  width: number,
  height: number,
  random: () => number,
  bentTypes: ResolvedPieceType2D[],
  weights: Record<string, number>,
  maxNodes: number,
): PuzzlePiece2D[] | null {
  const occupied = new Set<string>();
  const pieces: PuzzlePiece2D[] = [];

  const inBounds = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height;

  const isValid = (cells: Vec2[]): boolean => {
    for (const [x, y] of cells) {
      if (!inBounds(x, y)) return false;
      if (occupied.has(cellKey2D(x, y))) return false;
    }
    return true;
  };

  const findFirstEmpty = (): Vec2 | null => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!occupied.has(cellKey2D(x, y))) return [x, y];
      }
    }
    return null;
  };

  let nodes = 0;
  const fill = (): boolean => {
    if (++nodes > maxNodes) return false;
    const empty = findFirstEmpty();
    if (!empty) return true;

    const typeOrder = weightedShuffle(
      bentTypes,
      t => weights[t.id] ?? 0.001,
      random,
    );
    for (const type of typeOrder) {
      const orientationOrder = shuffle(
        type.orientations.map((_, i) => i),
        random,
      );
      for (const oi of orientationOrder) {
        const orientation = type.orientations[oi];
        const cellOrder = shuffle(
          orientation.map((_, i) => i),
          random,
        );
        for (const ci of cellOrder) {
          const [cx, cy] = orientation[ci];
          const origin: Vec2 = [empty[0] - cx, empty[1] - cy];
          const cells = orientation.map(([x, y]) => [
            x + origin[0],
            y + origin[1],
          ] as Vec2);
          if (!isValid(cells)) continue;
          for (const [x, y] of cells) occupied.add(cellKey2D(x, y));
          pieces.push({
            typeId: type.id,
            orientationIndex: oi,
            position: origin,
          });
          if (fill()) return true;
          pieces.pop();
          for (const [x, y] of cells) occupied.delete(cellKey2D(x, y));
          if (nodes > maxNodes) return false;
        }
      }
    }
    return false;
  };

  return fill() ? pieces : null;
}

// Greedy fallback that allows 1×1 unit pieces. Always succeeds because the
// unit piece fits at any empty cell. Used only when every backtracking
// attempt has timed out — extremely rare for the standard grid sizes.
function attemptGreedyWithUnit(
  width: number,
  height: number,
  random: () => number,
  types: ResolvedPieceType2D[],
  weights: Record<string, number>,
  unit: ResolvedPieceType2D,
): PuzzlePiece2D[] {
  const occupied = new Set<string>();
  const pieces: PuzzlePiece2D[] = [];

  const inBounds = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height;

  const isValid = (cells: Vec2[]): boolean => {
    for (const [x, y] of cells) {
      if (!inBounds(x, y)) return false;
      if (occupied.has(cellKey2D(x, y))) return false;
    }
    return true;
  };

  const findFirstEmpty = (): Vec2 | null => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!occupied.has(cellKey2D(x, y))) return [x, y];
      }
    }
    return null;
  };

  const tryPlace = (empty: Vec2, type: ResolvedPieceType2D) => {
    const orientationOrder = shuffle(
      type.orientations.map((_, i) => i),
      random,
    );
    for (const oi of orientationOrder) {
      const orientation = type.orientations[oi];
      const cellOrder = shuffle(orientation.map((_, i) => i), random);
      for (const ci of cellOrder) {
        const [cx, cy] = orientation[ci];
        const origin: Vec2 = [empty[0] - cx, empty[1] - cy];
        const cells = orientation.map(([x, y]) => [
          x + origin[0],
          y + origin[1],
        ] as Vec2);
        if (isValid(cells)) return { orientationIndex: oi, position: origin, cells };
      }
    }
    return null;
  };

  const bentTypes = types.filter(t => t.id !== 'unit');
  while (true) {
    const empty = findFirstEmpty();
    if (!empty) break;
    let placedType: ResolvedPieceType2D | null = null;
    let result = null as ReturnType<typeof tryPlace>;
    const order = weightedShuffle(bentTypes, t => weights[t.id] ?? 0.001, random);
    for (const t of order) {
      const r = tryPlace(empty, t);
      if (r) { placedType = t; result = r; break; }
    }
    if (!result || !placedType) {
      const r = tryPlace(empty, unit)!;
      placedType = unit;
      result = r;
    }
    for (const [x, y] of result.cells) occupied.add(cellKey2D(x, y));
    pieces.push({
      typeId: placedType.id,
      orientationIndex: result.orientationIndex,
      position: result.position,
    });
  }
  return pieces;
}

export function generatePuzzle2DBent(
  width: number,
  height: number,
  seed: number,
  opts: GenerateOptions2D = {},
): Puzzle2D {
  const group = opts.group ?? 'C4';
  const types = opts.pieceTypes ?? buildPieceLibrary(group);
  const weights =
    opts.weights ?? (group === 'D4' ? D4_DEFAULT_WEIGHTS : C4_DEFAULT_WEIGHTS);
  const maxAttempts = opts.maxAttempts ?? 50;

  const unit = types.find(t => t.id === 'unit');
  if (!unit) {
    throw new Error('Piece library must include a "unit" type as fallback');
  }

  const bentTypes = types.filter(t => t.id !== 'unit');

  // Try DFS backtracking up to `maxAttempts` times with different sub-seeds.
  // Each attempt refuses to use the 1×1 unit piece, so a successful return
  // is guaranteed to be a unit-free tiling. If every attempt times out
  // (which is extremely rare on the standard sizes), fall back to a greedy
  // pass that permits units so the player still gets a playable puzzle.
  const NODES_PER_ATTEMPT = 50_000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const subSeed = mixSeed(seed, attempt);
    const random = seededRandom(subSeed);
    const pieces = attemptBacktrack(
      width,
      height,
      random,
      bentTypes,
      weights,
      NODES_PER_ATTEMPT,
    );
    if (pieces) return { width, height, pieces };
  }

  const random = seededRandom(seed);
  const pieces = attemptGreedyWithUnit(width, height, random, types, weights, unit);
  return { width, height, pieces };
}

// ─── Cell-derivation helper for placed pieces ────────────────────────────────

export function placedCells2D(
  piece: PuzzlePiece2D,
  types: ResolvedPieceType2D[],
): Vec2[] {
  const t = types.find(p => p.id === piece.typeId);
  if (!t) return [];
  const [px, py] = piece.position;
  return t.orientations[piece.orientationIndex].map(([x, y]) => [
    x + px,
    y + py,
  ] as Vec2);
}

export function occupiedFromPlaced2D(
  placed: PuzzlePiece2D[],
  types: ResolvedPieceType2D[],
): Set<string> {
  const out = new Set<string>();
  for (const p of placed) {
    for (const [x, y] of placedCells2D(p, types)) {
      out.add(cellKey2D(x, y));
    }
  }
  return out;
}

export function isFilled2D(occupied: Set<string>, width: number, height: number): boolean {
  return occupied.size === width * height;
}

// ─── Smart-anchor placement (player-facing) ──────────────────────────────────
//
// Mirrors computeAutoPlacement from puzzle3d.ts. Given a hover cell, try each
// cell of the orientation as the anchor (the cell that lands at the cursor)
// and return the first valid placement. Falls back to anchor 0 with
// `valid: false` if nothing fits, so the UI still has a ghost to render.
//
// Removes the corner-unreachability defect: bent pieces whose normalized
// orientation lacks the (0,0) cell can't be anchored at the back wall under
// a naive (0,0)→hover model. This generalisation lets any cell of the piece
// land at the cursor.

export function isPlacementValid2D(
  cells: Vec2[],
  width: number,
  height: number,
  occupied: Set<string>,
): boolean {
  for (const [x, y] of cells) {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    if (occupied.has(cellKey2D(x, y))) return false;
  }
  return true;
}

// ─── Rotate / flip helpers (player-facing controls) ─────────────────────────
//
// Each helper rotates/flips the orientation at `currentIndex`, normalises,
// and returns the index of the matching orientation in the precomputed
// `orientations` list. If no match exists in the list (e.g. a flip on a
// C₄-only library where the result is a chiral mirror), returns
// `currentIndex` unchanged — the UI button is effectively a no-op for
// that piece in that mode.

export type RotationDir2D = 'cw' | 'ccw';
export type FlipAxis2D = 'h' | 'v';

const FLIP_V = ([x, y]: Vec2): Vec2 => [x, -y];
const ROT_CCW = ([x, y]: Vec2): Vec2 => [y, -x];

function findOrientationIndex(orientations: Vec2[][], cells: Vec2[]): number {
  const norm = normalize2D(cells);
  const key = canonicalKey2D(norm);
  for (let i = 0; i < orientations.length; i++) {
    if (canonicalKey2D(orientations[i]) === key) return i;
  }
  return -1;
}

export function applyRotation2D(
  orientations: Vec2[][],
  currentIndex: number,
  dir: RotationDir2D,
): number {
  if (currentIndex < 0 || currentIndex >= orientations.length) return 0;
  const fn = dir === 'cw' ? ROT_CW : ROT_CCW;
  const rotated = orientations[currentIndex].map(fn);
  const found = findOrientationIndex(orientations, rotated);
  return found === -1 ? currentIndex : found;
}

export function applyFlip2D(
  orientations: Vec2[][],
  currentIndex: number,
  axis: FlipAxis2D,
): number {
  if (currentIndex < 0 || currentIndex >= orientations.length) return 0;
  const fn = axis === 'h' ? FLIP_H : FLIP_V;
  const flipped = orientations[currentIndex].map(fn);
  const found = findOrientationIndex(orientations, flipped);
  return found === -1 ? currentIndex : found;
}

export function computeAutoPlacement2D(
  orientation: Vec2[],
  hover: Vec2,
  width: number,
  height: number,
  occupied: Set<string>,
): { origin: Vec2; cells: Vec2[]; valid: boolean; anchorCellIndex: number } {
  for (let i = 0; i < orientation.length; i++) {
    const [cx, cy] = orientation[i];
    const origin: Vec2 = [hover[0] - cx, hover[1] - cy];
    const cells = orientation.map(([x, y]) => [
      x + origin[0],
      y + origin[1],
    ] as Vec2);
    if (isPlacementValid2D(cells, width, height, occupied)) {
      return { origin, cells, valid: true, anchorCellIndex: i };
    }
  }
  // Fallback: invalid display anchored at cell 0.
  const [cx, cy] = orientation[0];
  const origin: Vec2 = [hover[0] - cx, hover[1] - cy];
  const cells = orientation.map(([x, y]) => [
    x + origin[0],
    y + origin[1],
  ] as Vec2);
  return { origin, cells, valid: false, anchorCellIndex: 0 };
}
