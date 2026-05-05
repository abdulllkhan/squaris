import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import type { Group } from 'three';
import { sfx } from '../lib/sound';
import {
  PIECE_TYPES,
  DEFAULT_WEIGHTS,
  BENT_PIECE_TYPES,
  BENT_DEFAULT_WEIGHTS,
  PuzzlePiece,
  Vec3,
  InventoryEntry,
  RotationAxis,
  cellKey,
  generatePuzzle3D,
  inventoryFromPuzzle,
  adjustInventory,
  isFilled,
  occupiedFromPlaced,
  placedCells,
  getPieceType,
  dateToSeed,
  computeAutoPlacement,
  rotateOrientationAroundAxis,
} from '../puzzle3d';

export type { Squaris3DMode } from '../lib/preferences';
import type { Squaris3DMode } from '../lib/preferences';

const GRID = 4;
const CELL = 1;

interface PlacedRecord {
  id: string;
  piece: PuzzlePiece;
  color: string;
}

interface Props {
  onExit: () => void;
  mode?: Squaris3DMode;
  onModeChange?: (mode: Squaris3DMode) => void;
}

export function Squaris3D({ onExit, mode = 'cubes', onModeChange }: Props) {
  const pieceTypes = mode === 'bent' ? BENT_PIECE_TYPES : PIECE_TYPES;
  const pieceWeights = mode === 'bent' ? BENT_DEFAULT_WEIGHTS : DEFAULT_WEIGHTS;

  const puzzle = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return generatePuzzle3D(GRID, dateToSeed(today), {
      pieceTypes,
      weights: pieceWeights,
    });
    // mode-driven libraries are stable references; the parent remounts via
    // `key={mode}` when mode flips, so this memo only fires once per instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialInventory = useMemo(
    () => inventoryFromPuzzle(puzzle, pieceTypes),
    [puzzle, pieceTypes],
  );

  const [inventory, setInventory] = useState<InventoryEntry[]>(initialInventory);
  const [layer, setLayer] = useState(0);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(initialInventory[0]?.typeId ?? 'cube1');
  const [orientationIndex, setOrientationIndex] = useState(0);
  const [placed, setPlaced] = useState<PlacedRecord[]>([]);
  const [hoverCell, setHoverCell] = useState<Vec3 | null>(null);
  const [won, setWon] = useState(false);
  const placedIdRef = useRef(0);

  const selectedType = useMemo(
    () => getPieceType(selectedTypeId, pieceTypes),
    [selectedTypeId, pieceTypes],
  );

  const occupied = useMemo(
    () => occupiedFromPlaced(placed.map(p => p.piece), pieceTypes),
    [placed, pieceTypes],
  );

  const ghostPlacement = useMemo(() => {
    if (!hoverCell) return null;
    return computeAutoPlacement(
      selectedType.orientations[orientationIndex],
      hoverCell,
      occupied,
      GRID,
    );
  }, [hoverCell, selectedType, orientationIndex, occupied]);

  const ghostCells = ghostPlacement?.cells ?? null;
  const ghostAnchorCell = ghostPlacement
    ? ghostPlacement.cells[ghostPlacement.anchorCellIndex]
    : null;

  const remainingForSelected = inventory.find(i => i.typeId === selectedTypeId)?.remaining ?? 0;

  const ghostValid = useMemo(() => {
    if (!ghostPlacement) return false;
    if (remainingForSelected <= 0) return false;
    return ghostPlacement.valid;
  }, [ghostPlacement, remainingForSelected]);

  const tryPlace = () => {
    if (!ghostValid || !ghostPlacement) {
      sfx.click();
      return;
    }
    sfx.click();
    setPlaced(prev => [
      ...prev,
      {
        id: `placed-${placedIdRef.current++}`,
        piece: {
          typeId: selectedTypeId,
          orientationIndex,
          position: ghostPlacement.origin,
        },
        color: selectedType.color,
      },
    ]);
    setInventory(inv => adjustInventory(inv, selectedTypeId, -1));
    setHoverCell(null);
  };

  const removePiece = (id: string) => {
    sfx.click();
    const target = placed.find(p => p.id === id);
    if (!target) return;
    setPlaced(prev => prev.filter(p => p.id !== id));
    setInventory(inv => adjustInventory(inv, target.piece.typeId, +1));
  };

  const reset = () => {
    sfx.click();
    setPlaced([]);
    setHoverCell(null);
    setWon(false);
    setInventory(initialInventory.map(i => ({ ...i })));
  };

  const applyRotation = (axis: RotationAxis, quarterTurns = 1) => {
    sfx.click();
    setOrientationIndex(i =>
      rotateOrientationAroundAxis(selectedType.orientations, i, axis, quarterTurns),
    );
  };

  // Keyboard shortcuts: X/Y/Z = 90° CW around the named axis,
  // Shift+X/Y/Z = 90° CCW. Space/Enter = place. Bound at the document level
  // so they work regardless of focus inside the canvas.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const dir = e.shiftKey ? -1 : 1;
      switch (e.key.toLowerCase()) {
        case 'x': applyRotation('x', dir); e.preventDefault(); break;
        case 'y': applyRotation('y', dir); e.preventDefault(); break;
        case 'z': applyRotation('z', dir); e.preventDefault(); break;
        case ' ':
        case 'enter':
          tryPlace();
          e.preventDefault();
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // Win detection.
  useEffect(() => {
    if (!won && isFilled(occupied, GRID)) {
      setWon(true);
      sfx.click();
    }
  }, [occupied, won]);

  // If the active piece runs out, jump to the next type that has stock.
  useEffect(() => {
    if (remainingForSelected > 0) return;
    const next = inventory.find(i => i.remaining > 0);
    if (next) {
      setSelectedTypeId(next.typeId);
      setOrientationIndex(0);
    }
  }, [inventory, remainingForSelected]);

  // Reset orientation index when the user picks a new piece type.
  const selectType = (typeId: string) => {
    sfx.click();
    setSelectedTypeId(typeId);
    setOrientationIndex(0);
    setHoverCell(null);
  };

  const totalCells = GRID * GRID * GRID;
  const filledCells = occupied.size;
  const canRotate = selectedType.orientations.length > 1;

  return (
    <div className="fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      <TopBar
        onExit={onExit}
        filled={filledCells}
        total={totalCells}
        mode={mode}
        onModeChange={onModeChange}
      />

      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [GRID * 1.6, GRID * 1.4, GRID * 1.8], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#1A1A1B']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[8, 12, 6]} intensity={0.85} castShadow />
          <directionalLight position={[-6, 4, -8]} intensity={0.3} color="#2592FF" />

          <Scene
            layer={layer}
            pieceTypes={pieceTypes}
            placed={placed}
            ghostCells={ghostCells}
            ghostAnchorCell={ghostAnchorCell}
            ghostValid={ghostValid}
            ghostColor={selectedType.color}
            occupied={occupied}
            onCellHover={setHoverCell}
            onCellClick={tryPlace}
            onPieceClick={removePiece}
          />

          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={GRID * 1.4}
            maxDistance={GRID * 4}
            target={[0, 0, 0]}
            enableDamping
            dampingFactor={0.12}
          />
        </Canvas>

        <LayerSlider value={layer} max={GRID - 1} onChange={setLayer} />

        <InventoryTray
          inventory={inventory}
          pieceTypes={pieceTypes}
          selectedTypeId={selectedTypeId}
          orientationIndex={orientationIndex}
          onSelect={selectType}
          onRotate={applyRotation}
          onPlace={tryPlace}
          canRotate={canRotate}
          canPlace={ghostValid}
        />

        {won && <WinOverlay onReset={reset} onExit={onExit} />}
      </div>

      <BottomNav onReset={reset} onExit={onExit} />
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  layer: number;
  pieceTypes: typeof PIECE_TYPES;
  placed: PlacedRecord[];
  ghostCells: Vec3[] | null;
  ghostAnchorCell: Vec3 | null;
  ghostValid: boolean;
  ghostColor: string;
  occupied: Set<string>;
  onCellHover: (cell: Vec3 | null) => void;
  onCellClick: () => void;
  onPieceClick: (id: string) => void;
}

function Scene({
  layer,
  pieceTypes,
  placed,
  ghostCells,
  ghostAnchorCell,
  ghostValid,
  ghostColor,
  occupied,
  onCellHover,
  onCellClick,
  onPieceClick,
}: SceneProps) {
  return (
    <group position={[-(GRID - 1) / 2, -(GRID - 1) / 2, -(GRID - 1) / 2]}>
      <ContainerBox />
      <ActiveLayerPlane
        layer={layer}
        occupied={occupied}
        onCellHover={onCellHover}
        onCellClick={onCellClick}
      />

      {placed.map(p => (
        <PieceMesh
          key={p.id}
          cells={placedCells(p.piece, pieceTypes)}
          color={p.color}
          onClick={() => onPieceClick(p.id)}
        />
      ))}

      {ghostCells && (
        <GhostPiece
          cells={ghostCells}
          anchorCell={ghostAnchorCell}
          valid={ghostValid}
          color={ghostColor}
        />
      )}
    </group>
  );
}

function ContainerBox() {
  const size = GRID * CELL;
  const center = (GRID - 1) / 2;
  return (
    <group position={[center, center, center]}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial color="#FF4500" transparent opacity={0.04} depthWrite={false} />
        <Edges color="#FF4500" linewidth={1.5} threshold={1} />
      </mesh>
    </group>
  );
}

interface ActiveLayerPlaneProps {
  layer: number;
  occupied: Set<string>;
  onCellHover: (cell: Vec3 | null) => void;
  onCellClick: () => void;
}

function ActiveLayerPlane({ layer, occupied, onCellHover, onCellClick }: ActiveLayerPlaneProps) {
  // Only render plane tiles on cells that aren't already filled — so the orange
  // grid never visually slices through a placed cube.
  const cells = useMemo(() => {
    const out: Vec3[] = [];
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        if (!occupied.has(cellKey(x, layer, z))) out.push([x, layer, z]);
      }
    }
    return out;
  }, [layer, occupied]);

  return (
    <group>
      {cells.map(([x, y, z]) => (
        <mesh
          key={`${x}-${y}-${z}`}
          // Position slab at the floor of the active layer (cells are centered
          // on integer positions, so the floor of layer Y is at Y - 0.5).
          position={[x, y - 0.48, z]}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onCellHover([x, y, z]);
          }}
          onPointerOut={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onCellHover(null);
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onCellClick();
          }}
        >
          <boxGeometry args={[CELL * 0.96, CELL * 0.04, CELL * 0.96]} />
          <meshBasicMaterial color="#FF4500" transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

interface PieceMeshProps {
  cells: Vec3[];
  color: string;
  onClick?: () => void;
}

function PieceMesh({ cells, color, onClick }: PieceMeshProps) {
  return (
    <group>
      {cells.map(([x, y, z]) => (
        <mesh
          key={`${x}-${y}-${z}`}
          position={[x, y, z]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (!onClick) return;
            e.stopPropagation();
            onClick();
          }}
        >
          <boxGeometry args={[CELL * 0.94, CELL * 0.94, CELL * 0.94]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
          <Edges color="#000" linewidth={1} threshold={15} />
        </mesh>
      ))}
    </group>
  );
}

interface GhostPieceProps {
  cells: Vec3[];
  anchorCell: Vec3 | null;
  valid: boolean;
  color: string;
}

function GhostPiece({ cells, anchorCell, valid, color }: GhostPieceProps) {
  const fill = valid ? color : '#ff4040';
  return (
    <group>
      {cells.map(([x, y, z], i) => {
        const isAnchor =
          anchorCell !== null &&
          anchorCell[0] === x &&
          anchorCell[1] === y &&
          anchorCell[2] === z;
        return (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[CELL * 0.92, CELL * 0.92, CELL * 0.92]} />
            <meshStandardMaterial
              color={fill}
              transparent
              opacity={valid ? (isAnchor ? 0.7 : 0.4) : 0.55}
              emissive={fill}
              emissiveIntensity={valid ? (isAnchor ? 0.45 : 0.12) : 0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

interface TopBarProps {
  onExit: () => void;
  filled: number;
  total: number;
  mode: Squaris3DMode;
  onModeChange?: (mode: Squaris3DMode) => void;
}

function TopBar({ onExit, filled, total, mode, onModeChange }: TopBarProps) {
  const pct = Math.round((filled / total) * 100);
  const modeLabel = mode === 'bent' ? 'Bent Pieces' : 'Cube Packing';
  return (
    <header className="bg-surface border-b border-divider flex justify-between items-center w-full px-4 sm:px-6 h-16 z-40 gap-3">
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        <button
          onClick={onExit}
          className="text-text hover:text-white p-1.5 rounded-lg hover:bg-divider active:scale-95 transition-all flex-shrink-0"
          aria-label="Back to menu"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <span className="text-xl sm:text-2xl font-black text-accent tracking-tight flex-shrink-0">Squaris 3D</span>
        <div className="hidden sm:block h-6 w-px bg-divider" />
        <span className="hidden md:inline label-caps text-text-muted whitespace-nowrap">
          Spike · 4×4×4 · {modeLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {onModeChange && <ModeToggle mode={mode} onChange={onModeChange} />}
        <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-full border border-divider">
          <span className="material-symbols-outlined text-accent text-sm">analytics</span>
          <span className="text-sm font-mono font-bold">
            {filled}/{total} · {pct}%
          </span>
        </div>
      </div>
    </header>
  );
}

function ModeToggle({ mode, onChange }: { mode: Squaris3DMode; onChange: (m: Squaris3DMode) => void }) {
  const pillClass = (active: boolean) =>
    `px-3 py-1.5 text-[11px] uppercase font-bold tracking-wider transition-all ${
      active
        ? 'bg-accent text-white shadow-accent-soft'
        : 'text-text-muted hover:text-white'
    }`;
  return (
    <div className="flex items-center bg-surface-elevated rounded-full border border-divider overflow-hidden">
      <button
        onClick={() => mode !== 'cubes' && (sfx.click(), onChange('cubes'))}
        className={pillClass(mode === 'cubes')}
        title="Cube Packing — easier intro mode with rectilinear pieces"
      >
        Cubes
      </button>
      <button
        onClick={() => mode !== 'bent' && (sfx.click(), onChange('bent'))}
        className={pillClass(mode === 'bent')}
        title="Bent Pieces — advanced mode with bent Tetris-shaped polycubes"
      >
        Bent
      </button>
    </div>
  );
}

interface LayerSliderProps {
  value: number;
  max: number;
  onChange: (n: number) => void;
}

function LayerSlider({ value, max, onChange }: LayerSliderProps) {
  return (
    <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-surface-elevated/90 backdrop-blur p-3 rounded-xl border border-divider shadow-2xl">
      <span className="material-symbols-outlined text-text-muted text-base">layers</span>
      <div className="flex flex-col-reverse gap-1.5">
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
              i === value
                ? 'bg-accent text-white shadow-accent-soft scale-105'
                : 'bg-surface text-text-muted hover:bg-divider hover:text-white'
            }`}
            aria-label={`Layer ${i}`}
          >
            {i}
          </button>
        ))}
      </div>
      <span className="label-caps text-text-muted">Y</span>
    </div>
  );
}

interface InventoryTrayProps {
  inventory: InventoryEntry[];
  pieceTypes: typeof PIECE_TYPES;
  selectedTypeId: string;
  orientationIndex: number;
  onSelect: (typeId: string) => void;
  onRotate: (axis: RotationAxis, quarterTurns?: number) => void;
  onPlace: () => void;
  canRotate: boolean;
  canPlace: boolean;
}

function InventoryTray({
  inventory,
  pieceTypes,
  selectedTypeId,
  orientationIndex,
  onSelect,
  onRotate,
  onPlace,
  canRotate,
  canPlace,
}: InventoryTrayProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-surface-elevated/85 backdrop-blur-md rounded-2xl border border-divider shadow-2xl max-w-[95vw]">
      <div className="flex flex-col gap-1.5">
        <span className="label-caps text-text-muted">Inventory</span>
        <div className="flex gap-2">
          {inventory.map(item => {
            const active = item.typeId === selectedTypeId;
            const out = item.remaining === 0;
            const type = pieceTypes.find(t => t.id === item.typeId);
            const oi = active ? orientationIndex : 0;
            return (
              <div key={item.typeId} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => !out && onSelect(item.typeId)}
                  disabled={out}
                  className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all overflow-hidden ${
                    out
                      ? 'border-divider/40 bg-surface/40 opacity-30 cursor-not-allowed'
                      : active
                        ? 'border-accent bg-accent/15 shadow-accent-soft'
                        : 'border-divider hover:border-divider-hover bg-surface'
                  }`}
                  title={item.label}
                >
                  {type && <PieceIcon3D cells={type.orientations[oi]} color={item.color} />}
                </button>
                <span
                  className={`text-[12px] font-mono font-bold tabular-nums tracking-tight ${
                    out
                      ? 'text-text-muted/60 line-through'
                      : active
                        ? 'text-accent'
                        : 'text-text'
                  }`}
                >
                  ×{item.remaining}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-px h-12 bg-divider" />

      <div className="flex flex-col items-center gap-1.5">
        <span className="label-caps text-text-muted">Rotate</span>
        <div className="grid grid-cols-3 gap-1">
          <OrientButton
            label="↻ X"
            title="Rotate +90° around X axis (key: X)"
            disabled={!canRotate}
            onClick={() => onRotate('x', 1)}
          />
          <OrientButton
            label="↻ Y"
            title="Rotate +90° around Y axis — vertical (key: Y)"
            disabled={!canRotate}
            onClick={() => onRotate('y', 1)}
          />
          <OrientButton
            label="↻ Z"
            title="Rotate +90° around Z axis (key: Z)"
            disabled={!canRotate}
            onClick={() => onRotate('z', 1)}
          />
          <OrientButton
            label="↺ X"
            title="Rotate −90° around X axis (key: Shift+X)"
            disabled={!canRotate}
            onClick={() => onRotate('x', -1)}
          />
          <OrientButton
            label="↺ Y"
            title="Rotate −90° around Y axis (key: Shift+Y)"
            disabled={!canRotate}
            onClick={() => onRotate('y', -1)}
          />
          <OrientButton
            label="↺ Z"
            title="Rotate −90° around Z axis (key: Shift+Z)"
            disabled={!canRotate}
            onClick={() => onRotate('z', -1)}
          />
        </div>
      </div>

      <div className="w-px h-12 bg-divider" />

      <button
        onClick={onPlace}
        disabled={!canPlace}
        className={`px-5 py-3 rounded-xl font-bold text-sm uppercase transition-all self-center ${
          canPlace
            ? 'bg-accent text-white hover:bg-accent-hover shadow-accent-glow active:scale-95'
            : 'bg-surface text-text-muted border border-divider cursor-not-allowed'
        }`}
        title="Place selected piece (key: Space)"
      >
        Place
      </button>
    </div>
  );
}

function OrientButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`min-w-[44px] h-8 px-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
        disabled
          ? 'bg-surface/40 text-text-muted/50 border border-divider/40 cursor-not-allowed'
          : 'bg-surface border border-divider text-text hover:border-accent hover:text-accent hover:bg-accent/10 active:scale-95'
      }`}
    >
      {label}
    </button>
  );
}

function PieceIcon3D({ cells, color }: { cells: Vec3[]; color: string }) {
  const { center, distance } = useMemo(() => {
    const xs = cells.map(c => c[0]);
    const ys = cells.map(c => c[1]);
    const zs = cells.map(c => c[2]);
    const c: Vec3 = [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    ];
    const extent = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
      Math.max(...zs) - Math.min(...zs),
    ) + 1;
    return { center: c, distance: Math.max(2.4, extent * 2.1) };
  }, [cells]);

  return (
    <div className="w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [distance, distance * 0.85, distance], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 4]} intensity={0.9} />
        <directionalLight position={[-3, -2, -3]} intensity={0.25} color="#FF4500" />
        <RotatingPiece cells={cells} color={color} center={center} />
      </Canvas>
    </div>
  );
}

function RotatingPiece({ cells, color, center }: { cells: Vec3[]; color: string; center: Vec3 }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  return (
    <group ref={ref}>
      <group position={[-center[0], -center[1], -center[2]]}>
        {cells.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[0.92, 0.92, 0.92]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
            <Edges color="#000" linewidth={1} threshold={15} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WinOverlay({ onReset, onExit }: { onReset: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-surface-elevated border border-divider rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
        <span className="material-symbols-outlined text-accent text-5xl mb-2">
          emoji_events
        </span>
        <h2 className="text-3xl font-black text-accent mb-2">Cube Complete</h2>
        <p className="text-text-muted mb-6">
          Every cell of the 4×4×4 container is filled. Nice solve.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-5 py-3 rounded-xl bg-accent text-white font-bold text-sm uppercase hover:bg-accent-hover active:scale-95 transition-all"
          >
            Play Again
          </button>
          <button
            onClick={onExit}
            className="px-5 py-3 rounded-xl bg-surface border border-divider text-text font-bold text-sm uppercase hover:border-accent hover:text-accent active:scale-95 transition-all"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ onReset, onExit }: { onReset: () => void; onExit: () => void }) {
  return (
    <nav className="w-full flex justify-around items-center h-16 bg-surface border-t border-divider z-40">
      <button onClick={onReset} className="flex flex-col items-center justify-center text-text-muted hover:text-white active:translate-y-0.5 transition-all">
        <span className="material-symbols-outlined text-xl">restart_alt</span>
        <span className="text-[10px] uppercase tracking-widest mt-0.5 font-bold">Reset</span>
      </button>
      <button className="flex flex-col items-center justify-center text-text-muted hover:text-white active:translate-y-0.5 transition-all" disabled>
        <span className="material-symbols-outlined text-xl opacity-50">lightbulb</span>
        <span className="text-[10px] uppercase tracking-widest mt-0.5 font-bold opacity-50">Hint</span>
      </button>
      <button onClick={onExit} className="flex flex-col items-center justify-center text-text-muted hover:text-white active:translate-y-0.5 transition-all">
        <span className="material-symbols-outlined text-xl">menu</span>
        <span className="text-[10px] uppercase tracking-widest mt-0.5 font-bold">Menu</span>
      </button>
    </nav>
  );
}
