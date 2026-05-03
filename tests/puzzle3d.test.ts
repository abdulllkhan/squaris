import {
  cellKey,
  cubeCells,
  PIECE_TYPES,
  BENT_PIECE_TYPES,
  BENT_DEFAULT_WEIGHTS,
  PieceType,
  PuzzlePiece,
  Puzzle3D,
  placedCells,
  isPlacementValid,
  occupiedFromPlaced,
  isFilled,
  inventoryFromPuzzle,
  adjustInventory,
  isInventoryEmpty,
  generatePuzzle3D,
  dateToSeed,
  uniqueOrientations,
  computeAutoPlacement,
  rotateOrientationAroundAxis,
  Vec3,
} from '../src/puzzle3d';

describe('cubeCells', () => {
  it('returns size³ cells', () => {
    expect(cubeCells([0, 0, 0], 1)).toHaveLength(1);
    expect(cubeCells([0, 0, 0], 2)).toHaveLength(8);
    expect(cubeCells([0, 0, 0], 3)).toHaveLength(27);
  });

  it('anchors cells at the origin corner and extends in +x/+y/+z', () => {
    const cells = cubeCells([1, 2, 3], 2);
    expect(cells).toContainEqual([1, 2, 3]);
    expect(cells).toContainEqual([2, 3, 4]);
    cells.forEach(([x, y, z]) => {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(2);
      expect(y).toBeGreaterThanOrEqual(2);
      expect(y).toBeLessThanOrEqual(3);
      expect(z).toBeGreaterThanOrEqual(3);
      expect(z).toBeLessThanOrEqual(4);
    });
  });
});

describe('placedCells', () => {
  it('translates orientation cells by piece position', () => {
    const piece: PuzzlePiece = { typeId: 'domino', orientationIndex: 0, position: [2, 0, 0] };
    const cells = placedCells(piece);
    expect(cells).toContainEqual([2, 0, 0]);
    expect(cells).toContainEqual([3, 0, 0]);
  });

  it('applies the selected orientation', () => {
    const dx: PuzzlePiece = { typeId: 'domino', orientationIndex: 0, position: [0, 0, 0] };
    const dy: PuzzlePiece = { typeId: 'domino', orientationIndex: 1, position: [0, 0, 0] };
    const dz: PuzzlePiece = { typeId: 'domino', orientationIndex: 2, position: [0, 0, 0] };
    expect(placedCells(dx)).toContainEqual([1, 0, 0]);
    expect(placedCells(dy)).toContainEqual([0, 1, 0]);
    expect(placedCells(dz)).toContainEqual([0, 0, 1]);
  });
});

describe('isPlacementValid', () => {
  it('rejects out-of-bounds cells', () => {
    expect(isPlacementValid([[-1, 0, 0]], 4, new Set())).toBe(false);
    expect(isPlacementValid([[4, 0, 0]], 4, new Set())).toBe(false);
    expect(isPlacementValid([[0, 0, 4]], 4, new Set())).toBe(false);
  });

  it('rejects collisions with occupied cells', () => {
    const occ = new Set([cellKey(1, 1, 1)]);
    expect(isPlacementValid([[0, 0, 0], [1, 1, 1]], 4, occ)).toBe(false);
  });

  it('accepts a clean placement inside the grid', () => {
    expect(isPlacementValid([[0, 0, 0], [1, 0, 0]], 4, new Set())).toBe(true);
  });
});

describe('occupiedFromPlaced', () => {
  it('aggregates cells across multiple placed pieces', () => {
    const placed: PuzzlePiece[] = [
      { typeId: 'cube1', orientationIndex: 0, position: [0, 0, 0] },
      { typeId: 'cube2', orientationIndex: 0, position: [2, 0, 0] },
    ];
    const occ = occupiedFromPlaced(placed);
    expect(occ.size).toBe(1 + 8);
    expect(occ.has(cellKey(0, 0, 0))).toBe(true);
    expect(occ.has(cellKey(3, 1, 1))).toBe(true);
  });

  it('returns empty set when nothing is placed', () => {
    expect(occupiedFromPlaced([]).size).toBe(0);
  });
});

describe('isFilled', () => {
  it('is true exactly when occupied size equals grid³', () => {
    const occ = new Set<string>();
    expect(isFilled(occ, 4)).toBe(false);
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          occ.add(cellKey(x, y, z));
        }
      }
    }
    expect(isFilled(occ, 4)).toBe(true);
  });
});

describe('generatePuzzle3D', () => {
  const SEEDS = [1, 7, 42, 1234, 9999];

  it.each(SEEDS)('exactly tiles a 4×4×4 container with no gaps or overlaps (seed %p)', seed => {
    const puzzle = generatePuzzle3D(4, seed);
    const occ = occupiedFromPlaced(puzzle.pieces);
    const totalCells = puzzle.pieces.reduce(
      (sum, p) => sum + placedCells(p).length,
      0,
    );
    expect(totalCells).toBe(64);
    expect(occ.size).toBe(64);
    expect(isFilled(occ, 4)).toBe(true);
  });

  it('exactly tiles a 5×5×5 container', () => {
    const puzzle = generatePuzzle3D(5, 314);
    const occ = occupiedFromPlaced(puzzle.pieces);
    expect(occ.size).toBe(125);
  });

  it('keeps every piece within bounds', () => {
    const puzzle = generatePuzzle3D(4, 2024);
    for (const p of puzzle.pieces) {
      for (const [x, y, z] of placedCells(p)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(z).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(4);
        expect(y).toBeLessThan(4);
        expect(z).toBeLessThan(4);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    expect(generatePuzzle3D(4, 555)).toEqual(generatePuzzle3D(4, 555));
  });

  it('produces different puzzles for different seeds', () => {
    const a = generatePuzzle3D(4, 1);
    const b = generatePuzzle3D(4, 2);
    expect(a).not.toEqual(b);
  });

  it('uses only piece types from the provided library', () => {
    const onlyCubes: PieceType[] = PIECE_TYPES.filter(t => t.id === 'cube1' || t.id === 'cube2');
    const puzzle = generatePuzzle3D(4, 11, {
      pieceTypes: onlyCubes,
      weights: { cube1: 0.2, cube2: 0.8 },
    });
    expect(puzzle.pieces.every(p => p.typeId === 'cube1' || p.typeId === 'cube2')).toBe(true);
    expect(occupiedFromPlaced(puzzle.pieces, onlyCubes).size).toBe(64);
  });
});

describe('inventoryFromPuzzle', () => {
  it('groups by typeId with full remaining counts', () => {
    const puzzle: Puzzle3D = {
      grid: 4,
      pieces: [
        { typeId: 'cube2', orientationIndex: 0, position: [0, 0, 0] },
        { typeId: 'cube2', orientationIndex: 0, position: [2, 0, 0] },
        { typeId: 'cube1', orientationIndex: 0, position: [0, 0, 2] },
      ],
    };
    const inv = inventoryFromPuzzle(puzzle);
    const byId = Object.fromEntries(inv.map(i => [i.typeId, i]));
    expect(byId.cube2.total).toBe(2);
    expect(byId.cube2.remaining).toBe(2);
    expect(byId.cube1.total).toBe(1);
    expect(byId.cube1.remaining).toBe(1);
  });

  it('omits piece types that are not in the puzzle', () => {
    const puzzle: Puzzle3D = {
      grid: 4,
      pieces: [{ typeId: 'cube1', orientationIndex: 0, position: [0, 0, 0] }],
    };
    const inv = inventoryFromPuzzle(puzzle);
    expect(inv).toHaveLength(1);
    expect(inv[0].typeId).toBe('cube1');
  });

  it('orders the inventory with larger pieces first', () => {
    const puzzle: Puzzle3D = {
      grid: 4,
      pieces: [
        { typeId: 'cube1', orientationIndex: 0, position: [0, 0, 0] },
        { typeId: 'cube2', orientationIndex: 0, position: [2, 0, 0] },
        { typeId: 'plate', orientationIndex: 0, position: [0, 2, 0] },
      ],
    };
    const inv = inventoryFromPuzzle(puzzle);
    expect(inv.map(i => i.typeId)).toEqual(['cube2', 'plate', 'cube1']);
  });

  it('totals across the puzzle match piece counts (round trip with the generator)', () => {
    const puzzle = generatePuzzle3D(4, 77);
    const inv = inventoryFromPuzzle(puzzle);
    const totalFromInv = inv.reduce((sum, i) => sum + i.total, 0);
    expect(totalFromInv).toBe(puzzle.pieces.length);
  });
});

describe('adjustInventory', () => {
  const base = [
    { typeId: 'cube1', label: '1', color: '#a', total: 3, remaining: 3 },
    { typeId: 'cube2', label: '2', color: '#b', total: 2, remaining: 2 },
  ];

  it('decrements only the matching entry', () => {
    const next = adjustInventory(base, 'cube2', -1);
    expect(next.find(i => i.typeId === 'cube2')!.remaining).toBe(1);
    expect(next.find(i => i.typeId === 'cube1')!.remaining).toBe(3);
  });

  it('clamps remaining at 0 on over-decrement', () => {
    const next = adjustInventory(base, 'cube1', -10);
    expect(next.find(i => i.typeId === 'cube1')!.remaining).toBe(0);
  });

  it('clamps remaining at total on over-increment', () => {
    const next = adjustInventory(base, 'cube1', 99);
    expect(next.find(i => i.typeId === 'cube1')!.remaining).toBe(3);
  });

  it('does not mutate the input array', () => {
    const next = adjustInventory(base, 'cube1', -1);
    expect(next).not.toBe(base);
    expect(base[0].remaining).toBe(3);
  });

  it('is a no-op for unknown typeId', () => {
    const next = adjustInventory(base, 'nope', -1);
    expect(next).toEqual(base);
  });
});

describe('isInventoryEmpty', () => {
  it('is true when every remaining count is 0', () => {
    expect(isInventoryEmpty([
      { typeId: 'cube1', label: '1', color: '#a', total: 3, remaining: 0 },
      { typeId: 'cube2', label: '2', color: '#b', total: 2, remaining: 0 },
    ])).toBe(true);
  });

  it('is false when any remaining count is positive', () => {
    expect(isInventoryEmpty([
      { typeId: 'cube1', label: '1', color: '#a', total: 3, remaining: 1 },
      { typeId: 'cube2', label: '2', color: '#b', total: 2, remaining: 0 },
    ])).toBe(false);
  });
});

describe('place-and-remove invariants (full game loop simulation)', () => {
  it('placing every piece from a generated solution fills the box and empties the inventory', () => {
    const puzzle = generatePuzzle3D(4, 88);
    let inv = inventoryFromPuzzle(puzzle);
    const placed: PuzzlePiece[] = [];

    for (const piece of puzzle.pieces) {
      const cells = placedCells(piece);
      const occ = occupiedFromPlaced(placed);
      expect(isPlacementValid(cells, 4, occ)).toBe(true);
      placed.push(piece);
      inv = adjustInventory(inv, piece.typeId, -1);
    }

    expect(isFilled(occupiedFromPlaced(placed), 4)).toBe(true);
    expect(isInventoryEmpty(inv)).toBe(true);
  });

  it('removing all placed pieces restores inventory to the original totals', () => {
    const puzzle = generatePuzzle3D(4, 88);
    let inv = inventoryFromPuzzle(puzzle);
    const initialRemaining: Vec3 = inv.map(i => i.remaining) as unknown as Vec3;

    let placed: PuzzlePiece[] = [];
    for (const piece of puzzle.pieces) {
      placed.push(piece);
      inv = adjustInventory(inv, piece.typeId, -1);
    }

    while (placed.length > 0) {
      const last = placed[placed.length - 1];
      placed = placed.slice(0, -1);
      inv = adjustInventory(inv, last.typeId, +1);
    }

    expect(inv.map(i => i.remaining)).toEqual(Array.from(initialRemaining));
  });
});

describe('dateToSeed', () => {
  it('is deterministic and non-zero', () => {
    expect(dateToSeed('2026-05-03')).toBe(dateToSeed('2026-05-03'));
    expect(dateToSeed('2026-05-03')).toBeGreaterThan(0);
  });

  it('differs for different dates', () => {
    expect(dateToSeed('2026-05-03')).not.toBe(dateToSeed('2026-05-04'));
  });
});

describe('uniqueOrientations', () => {
  const expectations: Array<[string, Vec3[], number]> = [
    ['cube',     [[0, 0, 0]],                                          1],
    ['cube2',    cubeCells([0, 0, 0], 2),                              1],
    ['domino',   [[0, 0, 0], [1, 0, 0]],                               3],
    ['plate',    [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],         3],
    ['tri-l',    [[0, 0, 0], [1, 0, 0], [0, 1, 0]],                    12],
    ['tetro-l',  [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]],         24],
    ['tetro-t',  [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]],         12],
    ['tetro-s',  [[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]],         12],
  ];

  it.each(expectations)('returns the expected unique orientation count for %s', (_, base, expected) => {
    expect(uniqueOrientations(base).length).toBe(expected);
  });

  it('returns orientations with min(x)=min(y)=min(z)=0 (normalized)', () => {
    for (const [, base] of expectations) {
      for (const orientation of uniqueOrientations(base)) {
        const xs = orientation.map(c => c[0]);
        const ys = orientation.map(c => c[1]);
        const zs = orientation.map(c => c[2]);
        expect(Math.min(...xs)).toBe(0);
        expect(Math.min(...ys)).toBe(0);
        expect(Math.min(...zs)).toBe(0);
      }
    }
  });

  it('produces no duplicate orientations for any test shape', () => {
    for (const [, base] of expectations) {
      const orientations = uniqueOrientations(base);
      const keys = orientations.map(o =>
        [...o].map(c => c.join(',')).sort().join('|'),
      );
      expect(new Set(keys).size).toBe(orientations.length);
    }
  });

  it('preserves cell count under rotation (rotations only translate cells)', () => {
    for (const [, base] of expectations) {
      for (const orientation of uniqueOrientations(base)) {
        expect(orientation.length).toBe(base.length);
      }
    }
  });
});

describe('BENT_PIECE_TYPES', () => {
  const expectedCounts: Record<string, number> = {
    'cube1': 1,
    'tri-l': 12,
    'tetro-l': 24,
    'tetro-t': 12,
    'tetro-s': 12,
  };

  it('exports the expected piece ids', () => {
    expect(BENT_PIECE_TYPES.map(t => t.id).sort()).toEqual(
      Object.keys(expectedCounts).sort(),
    );
  });

  it.each(Object.entries(expectedCounts))(
    '%s has %i unique orientations',
    (id, count) => {
      const t = BENT_PIECE_TYPES.find(p => p.id === id)!;
      expect(t.orientations.length).toBe(count);
    },
  );

  it('always includes a cube1 fallback for the generator', () => {
    expect(BENT_PIECE_TYPES.find(t => t.id === 'cube1')).toBeDefined();
  });
});

describe('generatePuzzle3D with BENT_PIECE_TYPES', () => {
  const SEEDS = [3, 19, 88, 314, 7777];

  it.each(SEEDS)('exactly tiles a 4×4×4 with bent pieces (seed %p)', seed => {
    const puzzle = generatePuzzle3D(4, seed, {
      pieceTypes: BENT_PIECE_TYPES,
      weights: BENT_DEFAULT_WEIGHTS,
    });
    const occ = occupiedFromPlaced(puzzle.pieces, BENT_PIECE_TYPES);
    expect(occ.size).toBe(64);
    expect(isFilled(occ, 4)).toBe(true);
  });

  it('produces only piece types from BENT_PIECE_TYPES', () => {
    const puzzle = generatePuzzle3D(4, 12345, {
      pieceTypes: BENT_PIECE_TYPES,
      weights: BENT_DEFAULT_WEIGHTS,
    });
    const validIds = new Set(BENT_PIECE_TYPES.map(t => t.id));
    expect(puzzle.pieces.every(p => validIds.has(p.typeId))).toBe(true);
  });

  it('actually uses bent pieces, not just the cube1 fallback', () => {
    // With heavy bent-piece weights, a 4×4×4 puzzle should contain at least
    // one non-cube1 piece. (If only cube1 ever placed, the anchor fix is broken.)
    const puzzle = generatePuzzle3D(4, 4242, {
      pieceTypes: BENT_PIECE_TYPES,
      weights: BENT_DEFAULT_WEIGHTS,
    });
    const nonFallback = puzzle.pieces.filter(p => p.typeId !== 'cube1');
    expect(nonFallback.length).toBeGreaterThan(0);
  });

  it('keeps every piece within bounds (bent placements may have non-(0,0,0) anchor)', () => {
    const puzzle = generatePuzzle3D(4, 909090, {
      pieceTypes: BENT_PIECE_TYPES,
      weights: BENT_DEFAULT_WEIGHTS,
    });
    for (const p of puzzle.pieces) {
      for (const [x, y, z] of placedCells(p, BENT_PIECE_TYPES)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(z).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(4);
        expect(y).toBeLessThan(4);
        expect(z).toBeLessThan(4);
      }
    }
  });

  it('is deterministic for the same seed in bent mode', () => {
    const a = generatePuzzle3D(4, 555, {
      pieceTypes: BENT_PIECE_TYPES,
      weights: BENT_DEFAULT_WEIGHTS,
    });
    const b = generatePuzzle3D(4, 555, {
      pieceTypes: BENT_PIECE_TYPES,
      weights: BENT_DEFAULT_WEIGHTS,
    });
    expect(a).toEqual(b);
  });
});

describe('computeAutoPlacement', () => {
  const dominoX: Vec3[] = [[0, 0, 0], [1, 0, 0]];

  it('uses anchor cell 0 when default anchor produces a valid placement (no regression)', () => {
    const result = computeAutoPlacement(dominoX, [0, 0, 0], new Set(), 4);
    expect(result.valid).toBe(true);
    expect(result.anchorCellIndex).toBe(0);
    expect(result.origin).toEqual([0, 0, 0]);
    expect(result.cells).toEqual([[0, 0, 0], [1, 0, 0]]);
  });

  it('falls through to a later anchor cell when default would go out of bounds', () => {
    // Hovering the right-edge cell with a +x domino: anchor cell 0 puts the
    // piece at [(3,0,0),(4,0,0)] which is OOB. Anchor cell 1 (the +x end)
    // shifts origin to (2,0,0) so cells become [(2,0,0),(3,0,0)] — valid.
    const result = computeAutoPlacement(dominoX, [3, 0, 0], new Set(), 4);
    expect(result.valid).toBe(true);
    expect(result.anchorCellIndex).toBe(1);
    expect(result.origin).toEqual([2, 0, 0]);
    expect(result.cells).toEqual([[2, 0, 0], [3, 0, 0]]);
  });

  it('returns a hover-anchored ghost with valid=false when no anchor fits', () => {
    // Block the only valid cells so no placement of the domino fits when
    // hovering at (0, 0, 0): cell (1,0,0) occupied → anchor 0 collides;
    // cell (-1, 0, 0) is OOB → anchor 1 fails too.
    const occupied = new Set([cellKey(1, 0, 0)]);
    const result = computeAutoPlacement(dominoX, [0, 0, 0], occupied, 4);
    expect(result.valid).toBe(false);
    expect(result.anchorCellIndex).toBe(0);
    expect(result.origin).toEqual([0, 0, 0]);
    expect(result.cells).toEqual([[0, 0, 0], [1, 0, 0]]);
  });

  it('always positions the hover cell within the placement cells when valid', () => {
    // Spot-check across orientations: when valid, hover ∈ cells.
    const orientation: Vec3[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        const result = computeAutoPlacement(orientation, [x, y, 0], new Set(), 4);
        if (result.valid) {
          expect(result.cells).toContainEqual([x, y, 0]);
        }
      }
    }
  });

  it('handles single-cell pieces (cube1) trivially', () => {
    const result = computeAutoPlacement([[0, 0, 0]], [2, 1, 3], new Set(), 4);
    expect(result.valid).toBe(true);
    expect(result.origin).toEqual([2, 1, 3]);
    expect(result.cells).toEqual([[2, 1, 3]]);
  });

  it('finds a placement for a T-tetromino against the right wall (the bug from the screenshot)', () => {
    // T lying flat in xy: bar in +x, stem in +y. Hovering at (3, 0, 0)
    // with default anchor extends the bar OOB. Smart-anchor should anchor
    // at the right end of the bar (cell index 2 = (2,0,0)) so the piece
    // fits along x=1..3 with the stem at (2,1,0).
    const tFlat: Vec3[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]];
    const result = computeAutoPlacement(tFlat, [3, 0, 0], new Set(), 4);
    expect(result.valid).toBe(true);
    expect(result.cells).toContainEqual([3, 0, 0]);
    for (const [x, y, z] of result.cells) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(4);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(4);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThan(4);
    }
  });
});

describe('rotateOrientationAroundAxis', () => {
  it('returns currentIndex for a cube (only 1 unique orientation)', () => {
    const cube = uniqueOrientations(cubeCells([0, 0, 0], 2));
    expect(rotateOrientationAroundAxis(cube, 0, 'x')).toBe(0);
    expect(rotateOrientationAroundAxis(cube, 0, 'y')).toBe(0);
    expect(rotateOrientationAroundAxis(cube, 0, 'z')).toBe(0);
  });

  it('cycles a domino through its 3 orientations via Y-axis 90° rotations', () => {
    const domino = uniqueOrientations([[0, 0, 0], [1, 0, 0]]);
    expect(domino.length).toBe(3);
    // Rotating around Y maps a +x domino to a +z domino (and back).
    const i1 = rotateOrientationAroundAxis(domino, 0, 'y');
    expect(i1).not.toBe(0);
    const i2 = rotateOrientationAroundAxis(domino, i1, 'y');
    expect(i2).toBe(0); // 180° around Y of a +x domino → back to +x (since domino is centrally symmetric)
  });

  it('two 90° rotations equal one 180° rotation', () => {
    const triL = uniqueOrientations([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    for (const axis of ['x', 'y', 'z'] as const) {
      const single180 = rotateOrientationAroundAxis(triL, 0, axis, 2);
      const twice90 = rotateOrientationAroundAxis(
        triL,
        rotateOrientationAroundAxis(triL, 0, axis),
        axis,
      );
      expect(single180).toBe(twice90);
    }
  });

  it('four 90° rotations around any axis returns to the starting orientation', () => {
    const tetroL = uniqueOrientations([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]]);
    expect(tetroL.length).toBe(24);
    for (const axis of ['x', 'y', 'z'] as const) {
      let idx = 0;
      for (let i = 0; i < 4; i++) idx = rotateOrientationAroundAxis(tetroL, idx, axis);
      expect(idx).toBe(0);
    }
  });

  it('axis rotations together can reach every unique orientation of a tetro-l', () => {
    // BFS through the orientation graph using only X/Y/Z 90° rotations.
    // Should visit all 24 unique orientations — confirming the rotation set
    // is a complete generating set for the tetro-l rotation group.
    const tetroL = uniqueOrientations([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]]);
    const reachable = new Set<number>([0]);
    const queue: number[] = [0];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const axis of ['x', 'y', 'z'] as const) {
        const next = rotateOrientationAroundAxis(tetroL, cur, axis);
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    expect(reachable.size).toBe(24);
  });

  it('handles negative quarterTurns (counter-rotation)', () => {
    const triL = uniqueOrientations([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    const fwd = rotateOrientationAroundAxis(triL, 0, 'z', 1);
    const back = rotateOrientationAroundAxis(triL, fwd, 'z', -1);
    expect(back).toBe(0);
  });
});

describe('generatePuzzle3D anchor-fix smoke test', () => {
  it('tiles 4×4×4 using only [cube1, tri-l] heavily favoring tri-l', () => {
    // Pre-anchor-fix this would have looped forever for the 180°-rotated
    // L-tromino orientation (which has no (0,0,0) cell after normalization).
    const minimal: PieceType[] = BENT_PIECE_TYPES.filter(
      t => t.id === 'cube1' || t.id === 'tri-l',
    );
    const puzzle = generatePuzzle3D(4, 27182, {
      pieceTypes: minimal,
      weights: { cube1: 0.05, 'tri-l': 0.95 },
    });
    const occ = occupiedFromPlaced(puzzle.pieces, minimal);
    expect(occ.size).toBe(64);
    expect(puzzle.pieces.some(p => p.typeId === 'tri-l')).toBe(true);
  });
});
