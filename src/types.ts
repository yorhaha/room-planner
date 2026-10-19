export type WallSide = 'n' | 'e' | 's' | 'w';
export type OpeningKind = 'door' | 'window' | 'opening';
export type ToolMode = 'select' | 'door' | 'window';
export type ViewMode = '2d' | '3d';
export type WallMode = 'ghost' | 'solid' | 'hidden';

export interface Room {
  id: string;
  name: string;
  /** 左边缘，单位米 */
  x: number;
  /** 上（北）边缘，单位米 */
  z: number;
  /** 东西向宽度 */
  w: number;
  /** 南北向进深 */
  d: number;
  height: number;
  wallThickness: number;
  floorColor: string;
  wallColor: string;
}

export interface Opening {
  id: string;
  roomId: string;
  side: WallSide;
  /** 沿墙方向，从墙起点到洞口中心，单位米 */
  offset: number;
  width: number;
  height: number;
  /** 离地高度（门通常为 0） */
  sill: number;
  kind: OpeningKind;
}

export type FurnitureType =
  | 'sofa'
  | 'armchair'
  | 'coffeeTable'
  | 'tvStand'
  | 'rug'
  | 'plant'
  | 'floorLamp'
  | 'bookshelf'
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'desk'
  | 'chair'
  | 'diningTable'
  | 'sideboard'
  | 'fridge'
  | 'stove'
  | 'counter'
  | 'toilet'
  | 'bathtub'
  | 'shower'
  | 'washer';

export interface Furniture {
  id: string;
  type: FurnitureType;
  roomId: string | null;
  /** 中心点 */
  x: number;
  z: number;
  /** 顺时针角度（平面视图），本地 +z 为家具正面 */
  rotation: number;
  color?: string;
}

export interface Project {
  name: string;
  rooms: Room[];
  openings: Opening[];
  furniture: Furniture[];
}

export type Selection =
  | { kind: 'room'; id: string }
  | { kind: 'opening'; id: string }
  | { kind: 'furniture'; id: string }
  | null;

export interface WallPiece {
  key: string;
  axis: 'x' | 'z';
  fixed: number;
  start: number;
  end: number;
  height: number;
  thickness: number;
  color: string;
  holes: WallHole[];
}

export interface WallHole {
  start: number;
  end: number;
  bottom: number;
  top: number;
  kind: OpeningKind;
}
