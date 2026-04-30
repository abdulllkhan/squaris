// Reddit-orange-dominant palette with blue accents, mapped by piece size.
// Returns a Tailwind background class for each piece size.
const PALETTE = [
  'bg-piece-blue',           // 1x1
  'bg-piece-orange',         // 2x2 (hero color)
  'bg-piece-blue-secondary', // 3x3
  'bg-piece-orange-light',   // 4x4
  'bg-piece-blue-light',     // 5x5
  'bg-piece-blue-pale',      // 6x6+
];

export function pieceBgClass(size: number): string {
  return PALETTE[(size - 1) % PALETTE.length];
}
