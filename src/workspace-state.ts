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

export type WorkspaceState = {
  pieces: Piece[];
  nextId: number;
};

export const initialWorkspace: WorkspaceState = {
  pieces: [],
  nextId: 1,
};

export type WorkspaceAction =
  | { type: "spawn"; denominator: Denominator; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "remove"; id: string };

export function pieceWidth(denominator: Denominator): number {
  return WHOLE_WIDTH / denominator;
}

export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "spawn": {
      const id = `piece-${state.nextId}`;
      return {
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
      };
    }
    case "move":
      return {
        ...state,
        pieces: state.pieces.map((p) =>
          p.id === action.id
            ? { ...p, x: snap(action.x, SNAP_X), y: snap(action.y, SNAP_Y) }
            : p,
        ),
      };
    case "remove":
      return {
        ...state,
        pieces: state.pieces.filter((p) => p.id !== action.id),
      };
  }
}
