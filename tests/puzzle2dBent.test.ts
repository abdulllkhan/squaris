import {
  Vec2,
  BENT_2D_PIECES,
  uniqueOrientations2D,
  buildPieceLibrary,
  generatePuzzle2DBent,
  placedCells2D,
  occupiedFromPlaced2D,
  isFilled2D,
  cellKey2D,
  dateToSeed2D,
  computeAutoPlacement2D,
  isPlacementValid2D,
  applyRotation2D,
  applyFlip2D,
} from '../src/puzzle2dBent';

const find = (id: string) => BENT_2D_PIECES.find(p => p.id === id)!.baseCells;

describe('uniqueOrientations2D — orientation counts under C4', () => {
  // C4 = rotation only (4 elements). Some pieces are achiral (full count
  // even without reflection), some have rotational self-symmetry.
  const cases: Array<[string, number]> = [
    ['L-tri', 4],     // bent corner — distinct under each of 4 rotations
    ['L-tetro', 4],   // L-shape — distinct under each rotation, J is separate
    ['J-tetro', 4],   // J-shape — separate set from L under rotation only
    ['T-tetro', 4],   // achiral
    ['S-tetro', 2],   // 180° rotational symmetry
    ['Z-tetro', 2],   // 180° rotational symmetry
  ];
  it.each(cases)('%s under C4 has %i unique orientations', (id, expected) => {
    expect(uniqueOrientations2D(find(id), 'C4').length).toBe(expected);
  });
});

describe('uniqueOrientations2D — orientation counts under D4', () => {
  // D4 = rotation + reflection (8 elements). Chiral pieces gain orientations
  // that the C4 group can't reach; achiral pieces stay the same count.
  const cases: Array<[string, number]> = [
    ['L-tri', 4],     // achiral — D4 adds nothing
    ['L-tetro', 8],   // chiral — gains 4 reflected orientations (= J's set)
    ['J-tetro', 8],   // same set as L under D4
    ['T-tetro', 4],   // achiral
    ['S-tetro', 4],   // chiral — gains 2 reflected orientations (= Z's set)
    ['Z-tetro', 4],   // same set as S under D4
  ];
  it.each(cases)('%s under D4 has %i unique orientations', (id, expected) => {
    expect(uniqueOrientations2D(find(id), 'D4').length).toBe(expected);
  });
});

describe('chirality merge under D4', () => {
  const keysOf = (orientations: Vec2[][]) =>
    new Set(
      orientations.map(o =>
        [...o].map(c => c.join(',')).sort().join('|'),
      ),
    );

  it('L-tetromino and J-tetromino produce the SAME orientation set under D4 (chirality merge)', () => {
    const ls = keysOf(uniqueOrientations2D(find('L-tetro'), 'D4'));
    const js = keysOf(uniqueOrientations2D(find('J-tetro'), 'D4'));
    expect(ls).toEqual(js);
  });

  it('S-tetromino and Z-tetromino produce the SAME orientation set under D4 (chirality merge)', () => {
    const ss = keysOf(uniqueOrientations2D(find('S-tetro'), 'D4'));
    const zs = keysOf(uniqueOrientations2D(find('Z-tetro'), 'D4'));
    expect(ss).toEqual(zs);
  });

  it('L-tetromino and J-tetromino produce DIFFERENT orientation sets under C4 (no chirality merge)', () => {
    const ls = keysOf(uniqueOrientations2D(find('L-tetro'), 'C4'));
    const js = keysOf(uniqueOrientations2D(find('J-tetro'), 'C4'));
    expect(ls).not.toEqual(js);
  });

  it('S-tetromino and Z-tetromino produce DIFFERENT orientation sets under C4', () => {
    const ss = keysOf(uniqueOrientations2D(find('S-tetro'), 'C4'));
    const zs = keysOf(uniqueOrientations2D(find('Z-tetro'), 'C4'));
    expect(ss).not.toEqual(zs);
  });
});

describe('uniqueOrientations2D — invariants', () => {
  const allBases = BENT_2D_PIECES.map(p => p.baseCells);

  it('every orientation is normalised to min(x)=0 and min(y)=0 (C4)', () => {
    for (const base of allBases) {
      for (const o of uniqueOrientations2D(base, 'C4')) {
        const xs = o.map(c => c[0]);
        const ys = o.map(c => c[1]);
        expect(Math.min(...xs)).toBe(0);
        expect(Math.min(...ys)).toBe(0);
      }
    }
  });

  it('every orientation is normalised to min(x)=0 and min(y)=0 (D4)', () => {
    for (const base of allBases) {
      for (const o of uniqueOrientations2D(base, 'D4')) {
        const xs = o.map(c => c[0]);
        const ys = o.map(c => c[1]);
        expect(Math.min(...xs)).toBe(0);
        expect(Math.min(...ys)).toBe(0);
      }
    }
  });

  it('orientations contain no duplicates within a single piece', () => {
    for (const base of allBases) {
      const orientations = uniqueOrientations2D(base, 'D4');
      const keys = orientations.map(o =>
        [...o].map(c => c.join(',')).sort().join('|'),
      );
      expect(new Set(keys).size).toBe(orientations.length);
    }
  });

  it('every orientation has the same cell count as the input (rotations/reflections preserve cell count)', () => {
    for (const base of allBases) {
      for (const o of uniqueOrientations2D(base, 'D4')) {
        expect(o.length).toBe(base.length);
      }
    }
  });
});

describe('buildPieceLibrary', () => {
  it('keeps all 6 bent pieces + unit fallback under C4', () => {
    const lib = buildPieceLibrary('C4');
    expect(lib.map(p => p.id).sort()).toEqual(
      ['J-tetro', 'L-tetro', 'L-tri', 'S-tetro', 'T-tetro', 'Z-tetro', 'unit'],
    );
  });

  it('drops J and Z under D4 (chirality-collapsed library), unit stays', () => {
    const lib = buildPieceLibrary('D4');
    expect(lib.map(p => p.id).sort()).toEqual(
      ['L-tetro', 'L-tri', 'S-tetro', 'T-tetro', 'unit'],
    );
  });

  it('orientations baked into the library match uniqueOrientations2D for that group', () => {
    for (const group of ['C4', 'D4'] as const) {
      const lib = buildPieceLibrary(group);
      for (const p of lib) {
        expect(p.orientations.length).toBe(
          uniqueOrientations2D(p.baseCells, group).length,
        );
      }
    }
  });
});

describe('generatePuzzle2DBent — exact tiling invariants', () => {
  const SEEDS = [3, 19, 88, 314, 7777];
  const sizes: Array<[number, number]> = [
    [5, 5],
    [7, 6],
    [8, 7],
  ];

  for (const [w, h] of sizes) {
    it.each(SEEDS)(`tiles ${w}×${h} exactly under C4 (seed %p)`, seed => {
      const puzzle = generatePuzzle2DBent(w, h, seed, { group: 'C4' });
      const lib = buildPieceLibrary('C4');
      const occ = occupiedFromPlaced2D(puzzle.pieces, lib);
      expect(occ.size).toBe(w * h);
      expect(isFilled2D(occ, w, h)).toBe(true);
    });

    it.each(SEEDS)(`tiles ${w}×${h} exactly under D4 (seed %p)`, seed => {
      const puzzle = generatePuzzle2DBent(w, h, seed, { group: 'D4' });
      const lib = buildPieceLibrary('D4');
      const occ = occupiedFromPlaced2D(puzzle.pieces, lib);
      expect(occ.size).toBe(w * h);
      expect(isFilled2D(occ, w, h)).toBe(true);
    });
  }
});

describe('generatePuzzle2DBent — properties', () => {
  it('keeps every cell within bounds', () => {
    const puzzle = generatePuzzle2DBent(7, 6, 12345, { group: 'D4' });
    const lib = buildPieceLibrary('D4');
    for (const p of puzzle.pieces) {
      for (const [x, y] of placedCells2D(p, lib)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(7);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(6);
      }
    }
  });

  it('is deterministic for the same seed and group', () => {
    const a = generatePuzzle2DBent(7, 6, 555, { group: 'C4' });
    const b = generatePuzzle2DBent(7, 6, 555, { group: 'C4' });
    expect(a).toEqual(b);
  });

  it('produces different puzzles for different seeds', () => {
    const a = generatePuzzle2DBent(7, 6, 1, { group: 'C4' });
    const b = generatePuzzle2DBent(7, 6, 2, { group: 'C4' });
    expect(a).not.toEqual(b);
  });

  it('produces different puzzles for the same seed but different groups', () => {
    // Different libraries (C4 has J & Z; D4 collapses them) → different
    // generator paths, even with the same seed.
    const c4 = generatePuzzle2DBent(7, 6, 999, { group: 'C4' });
    const d4 = generatePuzzle2DBent(7, 6, 999, { group: 'D4' });
    expect(c4).not.toEqual(d4);
  });
});

describe('generatePuzzle2DBent — avoids 1×1 fillers', () => {
  // Bent-piece generation should NEVER drop in single 1×1 unit pieces under
  // normal conditions — those are tedious to play. Backtracking with
  // cross-seed retries should always find a unit-free tiling on standard
  // grid sizes.
  const SIZES: Array<[number, number]> = [[5, 5], [7, 6], [8, 7]];
  const SEEDS = [1, 17, 42, 137, 7919];

  for (const [w, h] of SIZES) {
    it.each(SEEDS)(`${w}×${h} under C4 (seed %p) contains no 1×1 unit pieces`, seed => {
      const puzzle = generatePuzzle2DBent(w, h, seed, { group: 'C4' });
      const units = puzzle.pieces.filter(p => p.typeId === 'unit').length;
      expect(units).toBe(0);
    });

    it.each(SEEDS)(`${w}×${h} under D4 (seed %p) contains no 1×1 unit pieces`, seed => {
      const puzzle = generatePuzzle2DBent(w, h, seed, { group: 'D4' });
      const units = puzzle.pieces.filter(p => p.typeId === 'unit').length;
      expect(units).toBe(0);
    });
  }
});

describe('generatePuzzle2DBent — D4 actually uses reflections', () => {
  // A D4-mode generator should sometimes place pieces in reflected
  // orientations. Specifically, an L-tetromino orientation that's outside
  // the C4 set proves a reflection was used.
  it('over multiple seeds, at least one D4 puzzle places an L-tetromino in a reflected orientation', () => {
    const c4Lib = buildPieceLibrary('C4');
    const d4Lib = buildPieceLibrary('D4');
    const lTetroC4Keys = new Set(
      uniqueOrientations2D(BENT_2D_PIECES.find(p => p.id === 'L-tetro')!.baseCells, 'C4')
        .map(o => [...o].map(c => c.join(',')).sort().join('|')),
    );

    let foundReflected = false;
    for (let seed = 1; seed <= 30 && !foundReflected; seed++) {
      const puzzle = generatePuzzle2DBent(8, 7, seed, { group: 'D4' });
      for (const p of puzzle.pieces) {
        if (p.typeId !== 'L-tetro') continue;
        const orientation = d4Lib.find(t => t.id === 'L-tetro')!.orientations[p.orientationIndex];
        const key = [...orientation].map(c => c.join(',')).sort().join('|');
        if (!lTetroC4Keys.has(key)) {
          foundReflected = true;
          break;
        }
      }
    }
    expect(foundReflected).toBe(true);
  });

  it('uses both J and L as separate piece types under C4 (no chirality collapse in inventory)', () => {
    const types = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const puzzle = generatePuzzle2DBent(8, 7, seed, { group: 'C4' });
      for (const p of puzzle.pieces) types.add(p.typeId);
      if (types.has('J-tetro') && types.has('L-tetro')) break;
    }
    expect(types.has('J-tetro')).toBe(true);
    expect(types.has('L-tetro')).toBe(true);
  });
});

describe('isPlacementValid2D', () => {
  it('rejects out-of-bounds cells (left/top/right/bottom)', () => {
    expect(isPlacementValid2D([[-1, 0]], 5, 5, new Set())).toBe(false);
    expect(isPlacementValid2D([[0, -1]], 5, 5, new Set())).toBe(false);
    expect(isPlacementValid2D([[5, 0]], 5, 5, new Set())).toBe(false);
    expect(isPlacementValid2D([[0, 5]], 5, 5, new Set())).toBe(false);
  });

  it('rejects placements that overlap an occupied cell', () => {
    const occ = new Set([cellKey2D(2, 2)]);
    expect(isPlacementValid2D([[0, 0], [2, 2]], 5, 5, occ)).toBe(false);
  });

  it('accepts a clean placement inside the grid', () => {
    expect(isPlacementValid2D([[0, 0], [1, 0]], 5, 5, new Set())).toBe(true);
  });
});

describe('computeAutoPlacement2D', () => {
  const dominoX: Vec2[] = [[0, 0], [1, 0]];
  const lTetroFlat: Vec2[] = [[0, 0], [1, 0], [2, 0], [0, 1]]; // bar in +x with foot

  it('uses anchor cell 0 when default would be valid (no regression)', () => {
    const r = computeAutoPlacement2D(dominoX, [0, 0], 5, 5, new Set());
    expect(r.valid).toBe(true);
    expect(r.anchorCellIndex).toBe(0);
    expect(r.cells).toEqual([[0, 0], [1, 0]]);
  });

  it('falls through to a later anchor cell at the right edge', () => {
    // Hover at (4, 0) on a 5-wide grid: anchor 0 puts the +x domino at
    // (4,0)+(5,0) → OOB; anchor 1 shifts origin to (3,0) so cells become
    // (3,0)+(4,0) — valid.
    const r = computeAutoPlacement2D(dominoX, [4, 0], 5, 5, new Set());
    expect(r.valid).toBe(true);
    expect(r.anchorCellIndex).toBe(1);
    expect(r.cells).toEqual([[3, 0], [4, 0]]);
  });

  it('handles the L-tetromino-vs-right-wall case (regression for the screenshot bug, 2D)', () => {
    // Hovering at (4, 1) on a 5×5 grid with the +x bar L. Anchor 0 puts
    // cells at (4,1),(5,1),(6,1),(4,2) — OOB. Smart anchor should pick
    // an inner cell so the bar fits.
    const r = computeAutoPlacement2D(lTetroFlat, [4, 1], 5, 5, new Set());
    expect(r.valid).toBe(true);
    expect(r.cells).toContainEqual([4, 1]);
    for (const [x, y] of r.cells) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(5);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(5);
    }
  });

  it('returns valid=false at hover positions where no anchor fits', () => {
    // Block the only valid neighbour so domino at (0,0) can't go either way.
    const occ = new Set([cellKey2D(1, 0)]);
    const r = computeAutoPlacement2D(dominoX, [0, 0], 5, 5, occ);
    expect(r.valid).toBe(false);
  });

  it('handles single-cell pieces trivially', () => {
    const r = computeAutoPlacement2D([[0, 0]], [3, 2], 5, 5, new Set());
    expect(r.valid).toBe(true);
    expect(r.cells).toEqual([[3, 2]]);
  });

  it('always positions the hover cell within the placement cells when valid', () => {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const r = computeAutoPlacement2D(lTetroFlat, [x, y], 5, 5, new Set());
        if (r.valid) expect(r.cells).toContainEqual([x, y]);
      }
    }
  });
});

describe('applyRotation2D — group-theory invariants', () => {
  it('cw four times returns to the starting orientation (R⁴ = identity)', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'C4');
    let idx = 0;
    for (let i = 0; i < 4; i++) idx = applyRotation2D(orientations, idx, 'cw');
    expect(idx).toBe(0);
  });

  it('ccw four times returns to the starting orientation', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'C4');
    let idx = 0;
    for (let i = 0; i < 4; i++) idx = applyRotation2D(orientations, idx, 'ccw');
    expect(idx).toBe(0);
  });

  it('cw then ccw is the identity', () => {
    const orientations = uniqueOrientations2D(find('T-tetro'), 'C4');
    const i1 = applyRotation2D(orientations, 0, 'cw');
    const i2 = applyRotation2D(orientations, i1, 'ccw');
    expect(i2).toBe(0);
  });

  it('returns currentIndex for a single-orientation library (rotation is a no-op)', () => {
    const orientations = uniqueOrientations2D([[0, 0]], 'C4'); // unit cell
    expect(orientations.length).toBe(1);
    expect(applyRotation2D(orientations, 0, 'cw')).toBe(0);
  });

  it('on a C4-only library, every rotation lands on a valid index (closure)', () => {
    const orientations = uniqueOrientations2D(find('S-tetro'), 'C4');
    for (let i = 0; i < orientations.length; i++) {
      const next = applyRotation2D(orientations, i, 'cw');
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(orientations.length);
    }
  });
});

describe('applyFlip2D — group-theory invariants', () => {
  it('flipH twice is the identity (F² = I)', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'D4');
    const i1 = applyFlip2D(orientations, 0, 'h');
    const i2 = applyFlip2D(orientations, i1, 'h');
    expect(i2).toBe(0);
  });

  it('flipV twice is the identity', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'D4');
    const i1 = applyFlip2D(orientations, 0, 'v');
    const i2 = applyFlip2D(orientations, i1, 'v');
    expect(i2).toBe(0);
  });

  it('flipH ∘ flipV = 180° rotation (R² in D₄)', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'D4');
    const i1 = applyFlip2D(orientations, 0, 'h');
    const i2 = applyFlip2D(orientations, i1, 'v');
    const r1 = applyRotation2D(orientations, 0, 'cw');
    const r2 = applyRotation2D(orientations, r1, 'cw');
    expect(i2).toBe(r2);
  });

  it('on a C4-only library, flipping a chiral piece is a no-op (mirror not reachable)', () => {
    // L-tetromino under C₄ has 4 orientations, none of which is the J-chirality.
    // Flipping should land on a non-existent orientation → returns currentIndex.
    const orientations = uniqueOrientations2D(find('L-tetro'), 'C4');
    expect(applyFlip2D(orientations, 0, 'h')).toBe(0);
  });

  it('on a D4 library, flipping reaches the chiral mirror orientation', () => {
    // Under D₄, L-tetro has 8 orientations including the J-chirality. Flipping
    // should land on a different index.
    const orientations = uniqueOrientations2D(find('L-tetro'), 'D4');
    const flipped = applyFlip2D(orientations, 0, 'h');
    expect(flipped).not.toBe(0);
  });
});

describe('rotation + flip controls form a complete generating set of D4', () => {
  it('BFS via {rotate cw, flip h} reaches every D4 orientation of L-tetromino', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'D4');
    expect(orientations.length).toBe(8);

    const reachable = new Set<number>([0]);
    const queue: number[] = [0];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const next of [
        applyRotation2D(orientations, cur, 'cw'),
        applyFlip2D(orientations, cur, 'h'),
      ]) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    expect(reachable.size).toBe(8);
  });

  it('BFS via {rotate cw} alone reaches every C4 orientation of L-tetromino', () => {
    const orientations = uniqueOrientations2D(find('L-tetro'), 'C4');
    expect(orientations.length).toBe(4);
    const reachable = new Set<number>([0]);
    const queue: number[] = [0];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const next = applyRotation2D(orientations, cur, 'cw');
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
    expect(reachable.size).toBe(4);
  });
});

describe('dateToSeed2D', () => {
  it('is deterministic and non-zero', () => {
    expect(dateToSeed2D('2026-05-05')).toBe(dateToSeed2D('2026-05-05'));
    expect(dateToSeed2D('2026-05-05')).toBeGreaterThan(0);
  });

  it('differs for different dates', () => {
    expect(dateToSeed2D('2026-05-05')).not.toBe(dateToSeed2D('2026-05-06'));
  });
});
