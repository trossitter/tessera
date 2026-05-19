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

type Snapshot = {
  pieces: Piece[];
  nextId: number;
};

export type WorkspaceState = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
};

export const initialWorkspace: WorkspaceState = {
  pieces: [],
  nextId: 1,
  past: [],
  future: [],
};

export type WorkspaceAction =
  | { type: "spawn"; denominator: Denominator; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "remove"; id: string }
  | { type: "undo" }
  | { type: "redo" };

export function pieceWidth(denominator: Denominator): number {
  return WHOLE_WIDTH / denominator;
}

export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function takeSnapshot(state: WorkspaceState): Snapshot {
  return { pieces: state.pieces, nextId: state.nextId };
}

function applyMutation(state: WorkspaceState, next: Snapshot): WorkspaceState {
  return {
    pieces: next.pieces,
    nextId: next.nextId,
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
      return applyMutation(state, {
        nextId: state.nextId + 1,
        pieces: [
          ...state.pieces,
          {
            id,
            denominator: action.denominator,
            x: snap(action.x, SNAP_X),
            y: snap(action.y, SNAP_Y),
          },
        ],
      });
    }
    case "move":
      return applyMutation(state, {
        nextId: state.nextId,
        pieces: state.pieces.map((p) =>
          p.id === action.id
            ? { ...p, x: snap(action.x, SNAP_X), y: snap(action.y, SNAP_Y) }
            : p,
        ),
      });
    case "remove":
      return applyMutation(state, {
        nextId: state.nextId,
        pieces: state.pieces.filter((p) => p.id !== action.id),
      });
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        pieces: previous.pieces,
        nextId: previous.nextId,
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
        past: [...state.past, takeSnapshot(state)],
        future: state.future.slice(1),
      };
    }
  }
}
