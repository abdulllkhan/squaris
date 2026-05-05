// Pure helpers for hydrating user preferences from a string (typically a
// localStorage value). Each function returns the parsed value if it's a
// known enum member, otherwise the safe default. Pulled out of App.tsx so
// they can be unit-tested without React.

export type Difficulty = 'easy' | 'medium' | 'difficult';
export type Squaris3DMode = 'cubes' | 'bent';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'difficult'];
const MODES: readonly Squaris3DMode[] = ['cubes', 'bent'];

export function parseDifficulty(stored: string | null | undefined): Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(stored ?? '')
    ? (stored as Difficulty)
    : 'medium';
}

export function parseMode3D(stored: string | null | undefined): Squaris3DMode {
  return (MODES as readonly string[]).includes(stored ?? '')
    ? (stored as Squaris3DMode)
    : 'cubes';
}
