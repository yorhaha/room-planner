export type WallSide = 'n' | 'e' | 's' | 'w';
export type OpeningKind = 'door' | 'window' | 'opening';
export type DoorType = 'swing' | 'sliding';
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
  /** 门的类型：swing 平开门，sliding 推拉门；仅对 door 有效 */
  doorType?: DoorType;
  /** 门的开启方向：in 开向所属房间，out 向房间外开 */
  swing?: 'in' | 'out';
  /** 门铰链位于墙的起点侧或终点侧 */
  hinge?: 'start' | 'end';
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
  | 'washer'
  | 'officeChair'
  | 'loungeChair'
  | 'stool'
  | 'bench'
  | 'sideTable'
  | 'dresser'
  | 'crib'
  | 'vanity'
  | 'kitchenIsland'
  | 'shoeCabinet';

export interface FurnitureSize {
  w: number;
  d: number;
  h: number;
}

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
  /** 单件家具的实际尺寸，缺省时使用家具库默认尺寸 */
  size?: FurnitureSize;
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
