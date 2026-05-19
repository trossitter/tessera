export const WHOLE_WIDTH = 640;
export const PIECE_HEIGHT = 56;
export const SNAP_X = 80;
export const SNAP_Y = 64;
export const SUPPLY_DENOMS = [1, 2, 4, 8] as const;

export type Denominator = (typeof SUPPLY_DENOMS)[number];

export type Piece = {
  id: string;
  denominator: Denominator;
  x: number;
  y: number;
};

export type Discovery = {
  id: string;          // canonical key like "2 = 4,4"
  configA: number[];   // denominators of pieces in one row (uniform), sorted by x
  configB: number[];   // denominators of pieces in the matching row
};

type Snapshot = {
  pieces: Piece[];
  nextId: number;
  discoveries: Discovery[];
};

export type WorkspaceState = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
};

export const initialWorkspace: WorkspaceState = {
  pieces: [],
  nextId: 1,
  discoveries: [],
  past: [],
  future: [],
};

export type WorkspaceAction =
  | { type: "spawn"; denominator: Denominator; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "remove"; id: string }
  | { type: "undo" }
  | { type: "redo" };

export function pieceWidth(denominator: number): number {
  return WHOLE_WIDTH / denominator;
}

export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

// --- discovery detection ---

type RowAnalysis = {
  y: number;
  denominators: number[];
  minX: number;
  maxX: number;
  filled: boolean;   // edge-to-edge, no gaps
  uniform: boolean;  // all pieces same denominator
};

function analyzeRows(pieces: Piece[]): RowAnalysis[] {
  const byY = new Map<number, Piece[]>();
  for (const p of pieces) {
    if (!byY.has(p.y)) byY.set(p.y, []);
    byY.get(p.y)!.push(p);
  }
  const rows: RowAnalysis[] = [];
  for (const [y, ps] of byY) {
    const sorted = [...ps].sort((a, b) => a.x - b.x);
    const widths = sorted.map((p) => pieceWidth(p.denominator));
    const minX = sorted[0].x;
    const sumWidth = widths.reduce((a, b) => a + b, 0);
    const maxX = sorted[sorted.length - 1].x + widths[widths.length - 1];
    rows.push({
      y,
      denominators: sorted.map((p) => p.denominator),
      minX,
      maxX,
      filled: sumWidth === maxX - minX,
      uniform: sorted.every((p) => p.denominator === sorted[0].denominator),
    });
  }
  return rows;
}

function configKey(config: number[]): string {
  return config.join(",");
}

function discoveryId(configA: number[], configB: number[]): string {
  const keys = [configKey(configA), configKey(configB)].sort();
  return `${keys[0]} = ${keys[1]}`;
}

export function detectDiscoveries(pieces: Piece[]): Discovery[] {
  const rows = analyzeRows(pieces).filter((r) => r.filled && r.uniform);
  const found: Discovery[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.minX !== b.minX || a.maxX !== b.maxX) continue;
      if (configKey(a.denominators) === configKey(b.denominators)) continue;
      const id = discoveryId(a.denominators, b.denominators);
      if (seen.has(id)) continue;
      seen.add(id);
      const [smaller, larger] =
        a.denominators.length < b.denominators.length
          ? [a.denominators, b.denominators]
          : [b.denominators, a.denominators];
      found.push({ id, configA: smaller, configB: larger });
    }
  }
  return found;
}

function takeSnapshot(state: WorkspaceState): Snapshot {
  return {
    pieces: state.pieces,
    nextId: state.nextId,
    discoveries: state.discoveries,
  };
}

function applyMutation(
  state: WorkspaceState,
  nextPieces: Piece[],
  nextId: number,
): WorkspaceState {
  const detected = detectDiscoveries(nextPieces);
  const existingIds = new Set(state.discoveries.map((d) => d.id));
  const additions = detected.filter((d) => !existingIds.has(d.id));
  return {
    pieces: nextPieces,
    nextId,
    discoveries: [...state.discoveries, ...additions],
    past: [...state.past, takeSnapshot(state)],
    future: [],
  };
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "spawn": {
      const id = `piece-${state.nextId}`;
      const nextPieces = [
        ...state.pieces,
        {
          id,
          denominator: action.denominator,
          x: snap(action.x, SNAP_X),
          y: snap(action.y, SNAP_Y),
        },
      ];
      return applyMutation(state, nextPieces, state.nextId + 1);
    }
    case "move": {
      const nextPieces = state.pieces.map((p) =>
        p.id === action.id
          ? { ...p, x: snap(action.x, SNAP_X), y: snap(action.y, SNAP_Y) }
          : p,
      );
      return applyMutation(state, nextPieces, state.nextId);
    }
    case "remove": {
      const nextPieces = state.pieces.filter((p) => p.id !== action.id);
      return applyMutation(state, nextPieces, state.nextId);
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        pieces: previous.pieces,
        nextId: previous.nextId,
        discoveries: previous.discoveries,
        past: state.past.slice(0, -1),
        future: [takeSnapshot(state), ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        pieces: next.pieces,
        nextId: next.nextId,
        discoveries: next.discoveries,
        past: [...state.past, takeSnapshot(state)],
        future: state.future.slice(1),
      };
    }
  }
}
