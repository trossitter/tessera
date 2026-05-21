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
  id: string;
  configA: number[];
  configB: number[];
};

type Snapshot = {
  pieces: Piece[];
  nextId: number;
  discoveries: Discovery[];
};

export type WorkspaceState = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
  touchCount: number;
  seenConfigs: string[]; // every filled-row configKey ever seen; append-only, never rolled back
};

const SEED_PIECE: Piece = { id: "piece-seed", denominator: 1, x: 0, y: 64 };

export const initialWorkspace: WorkspaceState = {
  pieces: [SEED_PIECE],
  nextId: 1,
  discoveries: [],
  seenConfigs: [],
  past: [],
  future: [],
  touchCount: 0,
};

export type WorkspaceAction =
  | { type: "spawn"; denominator: Denominator }
  | { type: "spawn_at"; denominator: Denominator; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "replay"; discovery: Discovery }
  | { type: "replay_config"; config: Denominator[] }
  | { type: "undo" }
  | { type: "redo" };

export function pieceWidth(denominator: number): number {
  return WHOLE_WIDTH / denominator;
}

export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function findEmptySlot(
  pieces: Piece[],
  denominator: number,
): { x: number; y: number } {
  const w = pieceWidth(denominator);
  const COLS = [0, 80, 160, 240, 320, 400, 480, 560];
  const MAX_ROW_Y = 64 * 8;

  const byY = new Map<number, Piece[]>();
  for (const p of pieces) {
    if (!byY.has(p.y)) byY.set(p.y, []);
    byY.get(p.y)!.push(p);
  }

  const sortedYs = Array.from(byY.keys()).sort((a, b) => a - b);

  // First pass: same-denomination rows
  for (const y of sortedYs) {
    const rowPieces = byY.get(y)!;
    if (!rowPieces.every((p) => p.denominator === denominator)) continue;
    for (const x of COLS) {
      const collides = rowPieces.some((p) => {
        const pW = pieceWidth(p.denominator);
        return x < p.x + pW && p.x < x + w;
      });
      if (!collides) return { x, y };
    }
  }

  // Second pass: any existing row with space
  for (const y of sortedYs) {
    const rowPieces = byY.get(y)!;
    for (const x of COLS) {
      const collides = rowPieces.some((p) => {
        const pW = pieceWidth(p.denominator);
        return x < p.x + pW && p.x < x + w;
      });
      if (!collides) return { x, y };
    }
  }

  // Third pass: new empty row
  for (let y = 64; y <= MAX_ROW_Y; y += SNAP_Y) {
    if (!byY.has(y)) return { x: 0, y };
  }

  // Fallback: any empty spot
  for (let y = 64; y <= MAX_ROW_Y; y += SNAP_Y) {
    for (const x of COLS) {
      const collides = pieces.some((p) => {
        if (p.y !== y) return false;
        const pW = pieceWidth(p.denominator);
        return x < p.x + pW && p.x < x + w;
      });
      if (!collides) return { x, y };
    }
  }

  return { x: 0, y: 64 };
}

// --- discovery detection (combination-based; mixed rows allowed) ---

type RowAnalysis = {
  y: number;
  sortedDenominators: number[];
  minX: number;
  maxX: number;
  filled: boolean;
};

function analyzeRows(pieces: Piece[]): RowAnalysis[] {
  const byY = new Map<number, Piece[]>();
  for (const p of pieces) {
    if (!byY.has(p.y)) byY.set(p.y, []);
    byY.get(p.y)!.push(p);
  }
  const rows: RowAnalysis[] = [];
  for (const [y, ps] of byY) {
    const sortedByX = [...ps].sort((a, b) => a.x - b.x);
    const widths = sortedByX.map((p) => pieceWidth(p.denominator));
    const minX = sortedByX[0].x;
    const sumWidth = widths.reduce((a, b) => a + b, 0);
    const maxX = sortedByX[sortedByX.length - 1].x + widths[widths.length - 1];
    const sortedDenominators = ps
      .map((p) => p.denominator)
      .sort((a, b) => a - b);
    rows.push({
      y,
      sortedDenominators,
      minX,
      maxX,
      filled: sumWidth === maxX - minX,
    });
  }
  return rows;
}

export type FilledRow = { config: number[]; sum: number };

export function getFilledRows(pieces: Piece[]): FilledRow[] {
  return analyzeRows(pieces)
    .filter(r => r.filled)
    .map(r => ({
      config: r.sortedDenominators,
      sum: r.sortedDenominators.reduce((s: number, d: number) => s + 1 / d, 0),
    }));
}

export function configKey(config: number[]): string {
  return [...config].sort((a, b) => a - b).join(",");
}

export function pieceIdsForConfig(pieces: Piece[], targetKey: string): string[] {
  const byY = new Map<number, Piece[]>();
  for (const p of pieces) {
    if (!byY.has(p.y)) byY.set(p.y, []);
    byY.get(p.y)!.push(p);
  }
  for (const [, ps] of byY) {
    const key = configKey(ps.map(p => p.denominator));
    if (key === targetKey) return ps.map(p => p.id);
  }
  return [];
}

function discoveryId(configA: number[], configB: number[]): string {
  const keys = [configKey(configA), configKey(configB)].sort();
  return `${keys[0]} = ${keys[1]}`;
}

export function detectDiscoveries(pieces: Piece[]): Discovery[] {
  const rows = analyzeRows(pieces).filter((r) => r.filled);
  const found: Discovery[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.minX !== b.minX || a.maxX !== b.maxX) continue;
      if (configKey(a.sortedDenominators) === configKey(b.sortedDenominators))
        continue;
      const id = discoveryId(a.sortedDenominators, b.sortedDenominators);
      if (seen.has(id)) continue;
      seen.add(id);
      const [smaller, larger] =
        a.sortedDenominators.length < b.sortedDenominators.length
          ? [a.sortedDenominators, b.sortedDenominators]
          : [b.sortedDenominators, a.sortedDenominators];
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
  const filledRows = analyzeRows(nextPieces).filter((r) => r.filled);

  // Accumulate seenConfigs: every filled-row config the child has ever built.
  const seenSet = new Set(state.seenConfigs);
  const newSeenKeys: string[] = [];
  for (const row of filledRows) {
    const key = configKey(row.sortedDenominators);
    if (!seenSet.has(key)) {
      seenSet.add(key);
      newSeenKeys.push(key);
    }
  }

  // Detect cross-row equivalence discoveries.
  const detected = detectDiscoveries(nextPieces);
  const existingIds = new Set(state.discoveries.map((d) => d.id));
  const additions = detected.filter((d) => !existingIds.has(d.id));

  return {
    pieces: nextPieces,
    nextId,
    discoveries: [...state.discoveries, ...additions],
    seenConfigs: newSeenKeys.length > 0
      ? [...state.seenConfigs, ...newSeenKeys]
      : state.seenConfigs,
    past: [...state.past, takeSnapshot(state)],
    future: [],
    touchCount: state.touchCount + 1,
  };
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "spawn": {
      const slot = findEmptySlot(state.pieces, action.denominator);
      const id = `piece-${state.nextId}`;
      const nextPieces = [
        ...state.pieces,
        { id, denominator: action.denominator, x: slot.x, y: slot.y },
      ];
      return applyMutation(state, nextPieces, state.nextId + 1);
    }
    case "spawn_at": {
      const id = `piece-${state.nextId}`;
      const nextPieces = [
        ...state.pieces,
        { id, denominator: action.denominator, x: action.x, y: action.y },
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
    case "clear": {
      return {
        pieces: [],
        nextId: state.nextId,
        discoveries: state.discoveries,
        seenConfigs: state.seenConfigs,
        past: [...state.past, takeSnapshot(state)],
        future: [],
        touchCount: state.touchCount + 1,
      };
    }
    case "replay": {
      const { discovery } = action;
      let nextId = state.nextId;
      const newPieces: Piece[] = [SEED_PIECE];
      let x = 0;
      for (const denom of discovery.configA) {
        newPieces.push({ id: `piece-${nextId++}`, denominator: denom as Denominator, x, y: 128 });
        x += pieceWidth(denom);
      }
      x = 0;
      for (const denom of discovery.configB) {
        newPieces.push({ id: `piece-${nextId++}`, denominator: denom as Denominator, x, y: 192 });
        x += pieceWidth(denom);
      }
      return {
        pieces: newPieces,
        nextId,
        discoveries: state.discoveries,
        seenConfigs: state.seenConfigs,
        past: [...state.past, takeSnapshot(state)],
        future: [],
        touchCount: state.touchCount,
      };
    }
    case "replay_config": {
      let nextId = state.nextId;
      const occupiedYs = new Set(state.pieces.map(p => p.y));
      let targetY = SNAP_Y;
      while (occupiedYs.has(targetY) && targetY <= SNAP_Y * 8) targetY += SNAP_Y;
      const newPieces = [...state.pieces];
      let x = 0;
      for (const denom of action.config) {
        newPieces.push({ id: `piece-${nextId++}`, denominator: denom as Denominator, x, y: targetY });
        x += pieceWidth(denom);
      }
      return {
        pieces: newPieces,
        nextId,
        discoveries: state.discoveries,
        seenConfigs: state.seenConfigs,
        past: [...state.past, takeSnapshot(state)],
        future: [],
        touchCount: state.touchCount,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        pieces: previous.pieces,
        nextId: previous.nextId,
        discoveries: previous.discoveries,
        seenConfigs: state.seenConfigs,
        past: state.past.slice(0, -1),
        future: [takeSnapshot(state), ...state.future],
        touchCount: state.touchCount,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        pieces: next.pieces,
        nextId: next.nextId,
        discoveries: next.discoveries,
        seenConfigs: state.seenConfigs,
        past: [...state.past, takeSnapshot(state)],
        future: state.future.slice(1),
        touchCount: state.touchCount,
      };
    }
  }
}
