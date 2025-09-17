export interface Square {
  id: number;
  size: number;
  x?: number;
  y?: number;
  placed: boolean;
}

export interface Container {
  width: number;
  height: number;
}

export interface PuzzleData {
  container: Container;
  squares: Square[];
  difficulty: 'easy' | 'medium' | 'difficult';
  date: string;
}

export interface GameState {
  puzzle: PuzzleData;
  startTime: number;
  currentTime: number;
  isCompleted: boolean;
  grid: (number | null)[][];
}