export type Vec3 = [number, number, number];

export interface PieceType {
  id: string;
  label: string;
  color: string;
  orientations: Vec3[][];
}

export interface PuzzlePiece {
  typeId: string;
  orientationIndex: number;
  position: Vec3;
}

export interface Puzzle3D {
  grid: number;
  pieces: PuzzlePiece[];
}

export interface InventoryEntry {
  typeId: string;
  label: string;
  color: string;
  total: number;
  remaining: number;
}

export function cellKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function cubeCells(position: Vec3, size: number): Vec3[] {
  const [px, py, pz] = position;
  const out: Vec3[] = [];
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      for (let dz = 0; dz < size; dz++) {
        out.push([px + dx, py + dy, pz + dz]);
      }
    }
  }
  return out;
}

// ─── 3D rotation utility ──────────────────────────────────────────────────────

const ROT_X = ([x, y, z]: Vec3): Vec3 => [x, -z, y];
const ROT_Y = ([x, y, z]: Vec3): Vec3 => [z, y, -x];
const ROT_Z = ([x, y, z]: Vec3): Vec3 => [-y, x, z];

function buildRotations(): Array<(v: Vec3) => Vec3> {
  // BFS-compose ROT_X / ROT_Y / ROT_Z from identity. Closes after 24 elements
  // (the rotation group of a cube). Each rotation is keyed by where it sends
  // two basis vectors — that uniquely identifies a 3x3 rotation matrix.
  const id = (v: Vec3): Vec3 => v;
  const fnKey = (fn: (v: Vec3) => Vec3): string => {
    const a = fn([1, 0, 0]);
    const b = fn([0, 1, 0]);
    return `${a.join(',')}|${b.join(',')}`;
  };

  const map = new Map<string, (v: Vec3) => Vec3>();
  map.set(fnKey(id), id);

  let prev = 0;
  while (map.size !== prev) {
    prev = map.size;
    for (const fn of [...map.values()]) {
      for (const r of [ROT_X, ROT_Y, ROT_Z]) {
        const composed = (v: Vec3) => r(fn(v));
        const k = fnKey(composed);
        if (!map.has(k)) map.set(k, composed);
      }
    }
  }
  return [...map.values()];
}

const ROTATIONS_24 = buildRotations();

function normalizeOrientation(cells: Vec3[]): Vec3[] {
  const minX = Math.min(...cells.map(c => c[0]));
  const minY = Math.min(...cells.map(c => c[1]));
  const minZ = Math.min(...cells.map(c => c[2]));
  return cells.map(([x, y, z]) => [x - minX, y - minY, z - minZ] as Vec3);
}

function orientationKey(cells: Vec3[]): string {
  return [...cells].map(c => c.join(',')).sort().join('|');
}

export function uniqueOrientations(baseCells: Vec3[]): Vec3[][] {
  const seen = new Set<string>();
  const out: Vec3[][] = [];
  for (const rot of ROTATIONS_24) {
    const norm = normalizeOrientation(baseCells.map(rot));
    const key = orientationKey(norm);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(norm);
    }
  }
  return out;
}

export type RotationAxis = 'x' | 'y' | 'z';

// Rotate the orientation at `currentIndex` around an axis by `quarterTurns`
// 90° steps, normalize, and return the index of the matching orientation in
// the precomputed list. If the rotation lands on the same shape (e.g. for a
// cube, or a 180° rotation that maps the piece onto itself), returns the
// equivalent index. Returns `currentIndex` if no match is found (defensive
// guard — shouldn't happen when `orientations` was produced by
// `uniqueOrientations`, which is closed under rotation).
export function rotateOrientationAroundAxis(
  orientations: Vec3[][],
  currentIndex: number,
  axis: RotationAxis,
  quarterTurns = 1,
): number {
  if (currentIndex < 0 || currentIndex >= orientations.length) return 0;
  const rot = axis === 'x' ? ROT_X : axis === 'y' ? ROT_Y : ROT_Z;
  let cells = orientations[currentIndex];
  const turns = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    cells = cells.map(rot);
  }
  const targetKey = orientationKey(normalizeOrientation(cells));
  for (let i = 0; i < orientations.length; i++) {
    if (orientationKey(orientations[i]) === targetKey) return i;
  }
  return currentIndex;
}

// ─── Piece libraries ──────────────────────────────────────────────────────────

export const PIECE_TYPES: PieceType[] = [
  {
    id: 'cube1',
    label: '1×1×1',
    color: '#FF6A35',
    orientations: [[[0, 0, 0]]],
  },
  {
    id: 'cube2',
    label: '2×2×2',
    color: '#FF4500',
    orientations: [cubeCells([0, 0, 0], 2)],
  },
  {
    id: 'domino',
    label: 'Domino',
    color: '#2592FF',
    orientations: [
      [[0, 0, 0], [1, 0, 0]],
      [[0, 0, 0], [0, 1, 0]],
      [[0, 0, 0], [0, 0, 1]],
    ],
  },
  {
    id: 'plate',
    label: 'Plate',
    color: '#A2C9FF',
    orientations: [
      [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
      [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]],
      [[0, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 1]],
    ],
  },
];

export const DEFAULT_WEIGHTS: Record<string, number> = {
  cube1: 0.10,
  cube2: 0.40,
  domino: 0.20,
  plate: 0.30,
};

// Bent-pieces variant — uses real Tetris-shaped polycubes with bends. Significantly
// harder than cube packing because most orientations don't include the bounding
// box origin, so the generator has to anchor flexibly (see tryPlace below).
export const BENT_PIECE_TYPES: PieceType[] = [
  {
    id: 'cube1',
    label: '1×1×1',
    color: '#FF6A35',
    orientations: [[[0, 0, 0]]],
  },
  {
    id: 'tri-l',
    label: 'L-Tri',
    color: '#6FCF97',
    orientations: uniqueOrientations([[0, 0, 0], [1, 0, 0], [0, 1, 0]]),
  },
  {
    id: 'tetro-l',
    label: 'L-Tetro',
    color: '#F2C94C',
    orientations: uniqueOrientations([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]]),
  },
  {
    id: 'tetro-t',
    label: 'T-Tetro',
    color: '#BB6BD9',
    orientations: uniqueOrientations([[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]]),
  },
  {
    id: 'tetro-s',
    label: 'S-Tetro',
    color: '#EB5757',
    orientations: uniqueOrientations([[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]]),
  },
];

export const BENT_DEFAULT_WEIGHTS: Record<string, number> = {
  cube1: 0.05,
  'tri-l': 0.30,
  'tetro-l': 0.20,
  'tetro-t': 0.25,
  'tetro-s': 0.20,
};

export function getPieceType(typeId: string, types: PieceType[] = PIECE_TYPES): PieceType {
  const t = types.find(p => p.id === typeId);
  if (!t) throw new Error(`Unknown piece type: ${typeId}`);
  return t;
}

export function placedCells(piece: PuzzlePiece, types: PieceType[] = PIECE_TYPES): Vec3[] {
  const t = getPieceType(piece.typeId, types);
  const [px, py, pz] = piece.position;
  return t.orientations[piece.orientationIndex].map(([x, y, z]) => [
    x + px,
    y + py,
    z + pz,
  ] as Vec3);
}

export function isPlacementValid(cells: Vec3[], grid: number, occupied: Set<string>): boolean {
  for (const [x, y, z] of cells) {
    if (x < 0 || y < 0 || z < 0) return false;
    if (x >= grid || y >= grid || z >= grid) return false;
    if (occupied.has(cellKey(x, y, z))) return false;
  }
  return true;
}

// Smart-anchor placement: given a hover cell, find a placement of `orientation`
// where some cell of the orientation lands on the hover cell AND all cells fit
// (in-bounds, non-overlapping). Tries each cell of the orientation as the
// "anchor" in cell-index order; returns the first valid placement. If none is
// valid, falls back to anchoring at cell 0 with `valid: false` so the UI still
// has a ghost to render in red.
//
// This generalises the placement model so the player can position any cell of
// the piece at the hover point, not just the (0,0,0) cell of the normalised
// orientation. Mirrors the generator's tryPlace logic and removes the
// "can't place against the back wall" dead end.
export function computeAutoPlacement(
  orientation: Vec3[],
  hover: Vec3,
  occupied: Set<string>,
  grid: number,
): { origin: Vec3; cells: Vec3[]; valid: boolean; anchorCellIndex: number } {
  for (let i = 0; i < orientation.length; i++) {
    const [cx, cy, cz] = orientation[i];
    const origin: Vec3 = [hover[0] - cx, hover[1] - cy, hover[2] - cz];
    const cells = orientation.map(([x, y, z]) => [
      x + origin[0], y + origin[1], z + origin[2],
    ] as Vec3);
    if (isPlacementValid(cells, grid, occupied)) {
      return { origin, cells, valid: true, anchorCellIndex: i };
    }
  }
  const [cx, cy, cz] = orientation[0];
  const origin: Vec3 = [hover[0] - cx, hover[1] - cy, hover[2] - cz];
  const cells = orientation.map(([x, y, z]) => [
    x + origin[0], y + origin[1], z + origin[2],
  ] as Vec3);
  return { origin, cells, valid: false, anchorCellIndex: 0 };
}

export function occupiedFromPlaced(placed: PuzzlePiece[], types: PieceType[] = PIECE_TYPES): Set<string> {
  const out = new Set<string>();
  for (const p of placed) {
    for (const [x, y, z] of placedCells(p, types)) {
      out.add(cellKey(x, y, z));
    }
  }
  return out;
}

export function isFilled(occupied: Set<string>, grid: number): boolean {
  return occupied.size === grid * grid * grid;
}

export function inventoryFromPuzzle(puzzle: Puzzle3D, types: PieceType[] = PIECE_TYPES): InventoryEntry[] {
  const counts = new Map<string, number>();
  for (const p of puzzle.pieces) {
    counts.set(p.typeId, (counts.get(p.typeId) ?? 0) + 1);
  }
  const entries: InventoryEntry[] = [];
  for (const t of types) {
    const total = counts.get(t.id);
    if (!total) continue;
    entries.push({
      typeId: t.id,
      label: t.label,
      color: t.color,
      total,
      remaining: total,
    });
  }
  // Largest piece first (by orientation[0] cell count, descending).
  entries.sort((a, b) => {
    const av = getPieceType(a.typeId, types).orientations[0].length;
    const bv = getPieceType(b.typeId, types).orientations[0].length;
    return bv - av;
  });
  return entries;
}

export function adjustInventory(inv: InventoryEntry[], typeId: string, delta: number): InventoryEntry[] {
  return inv.map(item => {
    if (item.typeId !== typeId) return item;
    const next = Math.max(0, Math.min(item.total, item.remaining + delta));
    return { ...item, remaining: next };
  });
}

export function isInventoryEmpty(inv: InventoryEntry[]): boolean {
  return inv.every(i => i.remaining === 0);
}

function seededRandom(seed: number): () => number {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

export function dateToSeed(date: string): number {
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

interface GenerateOptions {
  pieceTypes?: PieceType[];
  weights?: Record<string, number>;
}

export function generatePuzzle3D(grid: number, seed: number, opts: GenerateOptions = {}): Puzzle3D {
  const random = seededRandom(seed);
  const types = opts.pieceTypes ?? PIECE_TYPES;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const cube1 = types.find(t => t.id === 'cube1');
  if (!cube1) {
    throw new Error('Piece set must include a "cube1" type as fallback');
  }
  const occupied = new Set<string>();
  const pieces: PuzzlePiece[] = [];

  const findFirstEmpty = (): Vec3 | null => {
    for (let y = 0; y < grid; y++) {
      for (let z = 0; z < grid; z++) {
        for (let x = 0; x < grid; x++) {
          if (!occupied.has(cellKey(x, y, z))) return [x, y, z];
        }
      }
    }
    return null;
  };

  const totalWeight = types.reduce((sum, t) => sum + (weights[t.id] ?? 0), 0);
  const pickType = (): PieceType => {
    if (totalWeight <= 0) return cube1;
    let r = random() * totalWeight;
    for (const t of types) {
      r -= weights[t.id] ?? 0;
      if (r <= 0) return t;
    }
    return cube1;
  };

  // Try every (orientation, anchor-cell) combination. For rectilinear shapes
  // the (0,0,0) cell of the orientation is always present, so this collapses
  // to the previous behaviour on the first inner-loop iteration. For bent
  // shapes some orientations don't contain (0,0,0); anchoring at any cell of
  // the orientation lets us still cover the empty cell `empty`.
  const tryPlace = (
    empty: Vec3,
    type: PieceType,
  ): { orientationIndex: number; position: Vec3; cells: Vec3[] } | null => {
    const orientationOrder = shuffle(type.orientations.map((_, i) => i), random);
    for (const oi of orientationOrder) {
      const orientation = type.orientations[oi];
      const cellOrder = shuffle(orientation.map((_, i) => i), random);
      for (const ci of cellOrder) {
        const [cx, cy, cz] = orientation[ci];
        const origin: Vec3 = [empty[0] - cx, empty[1] - cy, empty[2] - cz];
        const cells = orientation.map(([x, y, z]) => [
          x + origin[0],
          y + origin[1],
          z + origin[2],
        ] as Vec3);
        if (isPlacementValid(cells, grid, occupied)) {
          return { orientationIndex: oi, position: origin, cells };
        }
      }
    }
    return null;
  };

  while (true) {
    const empty = findFirstEmpty();
    if (!empty) break;

    const chosen = pickType();
    let placedType = chosen;
    let result = tryPlace(empty, chosen);
    if (!result && chosen.id !== 'cube1') {
      placedType = cube1;
      result = tryPlace(empty, cube1);
    }
    if (!result) {
      // Unreachable: cube1 always fits at any empty cell.
      throw new Error(`Failed to place fallback cube at ${empty.join(',')}`);
    }
    for (const [x, y, z] of result.cells) occupied.add(cellKey(x, y, z));
    pieces.push({
      typeId: placedType.id,
      orientationIndex: result.orientationIndex,
      position: result.position,
    });
  }

  return { grid, pieces };
}
