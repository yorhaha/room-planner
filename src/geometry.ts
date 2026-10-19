import type {
  Furniture,
  Opening,
  Project,
  Room,
  WallHole,
  WallPiece,
  WallSide,
} from './types';

export const EPS = 1e-4;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}

export function fmt(v: number, digits = 2): string {
  const n = Number(v.toFixed(digits));
  return String(n);
}

let seq = 0;
export function uid(prefix = 'id'): string {
  seq = (seq + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function wallLength(room: Room, side: WallSide): number {
  return side === 'n' || side === 's' ? room.w : room.d;
}

export function wallStart(room: Room, side: WallSide): { x: number; z: number } {
  switch (side) {
    case 'n':
      return { x: room.x, z: room.z };
    case 's':
      return { x: room.x, z: room.z + room.d };
    case 'w':
      return { x: room.x, z: room.z };
    case 'e':
      return { x: room.x + room.w, z: room.z };
  }
}

/** 沿墙正方向：n/s 向东，e/w 向南 */
export function sideDir(side: WallSide): { dx: number; dz: number } {
  return side === 'n' || side === 's' ? { dx: 1, dz: 0 } : { dx: 0, dz: 1 };
}

/** 指向房间内部的法线 */
export function sideInward(side: WallSide): { nx: number; nz: number } {
  switch (side) {
    case 'n':
      return { nx: 0, nz: 1 };
    case 's':
      return { nx: 0, nz: -1 };
    case 'w':
      return { nx: 1, nz: 0 };
    case 'e':
      return { nx: -1, nz: 0 };
  }
}

export function wallPoint(room: Room, side: WallSide, offset: number): { x: number; z: number } {
  const s = wallStart(room, side);
  const d = sideDir(side);
  return { x: s.x + d.dx * offset, z: s.z + d.dz * offset };
}

export function wallMid(room: Room, side: WallSide): { x: number; z: number } {
  return wallPoint(room, side, wallLength(room, side) / 2);
}

export function roomCenter(room: Room): { x: number; z: number } {
  return { x: room.x + room.w / 2, z: room.z + room.d / 2 };
}

export function roomArea(room: Room): number {
  return room.w * room.d;
}

export function pointInRoom(room: Room, x: number, z: number, margin = 0): boolean {
  return (
    x >= room.x + margin &&
    x <= room.x + room.w - margin &&
    z >= room.z + margin &&
    z <= room.z + room.d - margin
  );
}

/** 两个房间是否真正重叠（仅共边不算） */
export function roomsOverlap(
  a: Pick<Room, 'x' | 'z' | 'w' | 'd'>,
  b: Pick<Room, 'x' | 'z' | 'w' | 'd'>,
): boolean {
  return (
    a.x < b.x + b.w - 0.001 &&
    a.x + a.w > b.x + 0.001 &&
    a.z < b.z + b.d - 0.001 &&
    a.z + a.d > b.z + 0.001
  );
}

export function roomOfPoint(rooms: Room[], x: number, z: number): Room | null {
  for (let i = rooms.length - 1; i >= 0; i -= 1) {
    if (pointInRoom(rooms[i], x, z)) return rooms[i];
  }
  return null;
}

export function projectBounds(project: Project): {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  w: number;
  d: number;
} {
  if (project.rooms.length === 0) {
    if (project.furniture.length) {
      let minX = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxZ = -Infinity;
      for (const f of project.furniture) {
        minX = Math.min(minX, f.x);
        minZ = Math.min(minZ, f.z);
        maxX = Math.max(maxX, f.x);
        maxZ = Math.max(maxZ, f.z);
      }
      return { minX: minX - 1, minZ: minZ - 1, maxX: maxX + 1, maxZ: maxZ + 1, w: maxX - minX + 2, d: maxZ - minZ + 2 };
    }
    return { minX: 0, minZ: 0, maxX: 8, maxZ: 6, w: 8, d: 6 };
  }
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const r of project.rooms) {
    minX = Math.min(minX, r.x);
    minZ = Math.min(minZ, r.z);
    maxX = Math.max(maxX, r.x + r.w);
    maxZ = Math.max(maxZ, r.z + r.d);
  }
  return { minX, minZ, maxX, maxZ, w: maxX - minX, d: maxZ - minZ };
}

/** 家具旋转后的轴对齐包围盒半宽 */
export function furnitureHalfExtents(f: Furniture, defW: number, defD: number): { hx: number; hz: number } {
  const rad = (f.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { hx: (c * defW) / 2 + (s * defD) / 2, hz: (s * defW) / 2 + (c * defD) / 2 };
}

/** 让洞口保持在墙内 */
export function clampOpening(room: Room, opening: Opening): Opening {
  const len = wallLength(room, opening.side);
  const maxWidth = Math.max(0.3, len - 0.1);
  const width = clamp(opening.width, 0.3, maxWidth);
  const offset = clamp(opening.offset, width / 2 + 0.03, Math.max(width / 2 + 0.03, len - width / 2 - 0.03));
  const isDoor = opening.kind === 'door';
  const height = clamp(opening.height, 0.3, room.height);
  const sill = isDoor ? 0 : clamp(opening.sill, 0, Math.max(0, room.height - height));
  return { ...opening, width, offset, height, sill };
}

interface RawWall {
  roomId: string;
  side: WallSide;
  axis: 'x' | 'z';
  fixed: number;
  start: number;
  end: number;
  height: number;
  thickness: number;
  color: string;
  holes: Array<{ start: number; end: number; bottom: number; top: number; kind: Opening['kind'] }>;
}

/**
 * 将各个房间的墙合并成不重复的墙段，并为洞口开洞。
 * 完全共线的墙体只渲染一次，因此相邻房间之间是一堵共享墙。
 */
export function buildWalls(project: Project): WallPiece[] {
  const raws: RawWall[] = [];

  for (const room of project.rooms) {
    const make = (side: WallSide, axis: 'x' | 'z', fixed: number, start: number, end: number) => {
      const holes: RawWall['holes'] = [];
      for (const op of project.openings) {
        if (op.roomId !== room.id || op.side !== side) continue;
        const s = Math.max(start, start + op.offset - op.width / 2);
        const e = Math.min(end, start + op.offset + op.width / 2);
        if (e - s <= 0.001) continue;
        const top = Math.min(room.height, op.sill + op.height);
        if (top <= op.sill) continue;
        holes.push({ start: s, end: e, bottom: op.sill, top, kind: op.kind });
      }
      raws.push({
        roomId: room.id,
        side,
        axis,
        fixed,
        start,
        end,
        height: room.height,
        thickness: room.wallThickness,
        color: room.wallColor,
        holes,
      });
    };
    make('n', 'x', room.z, room.x, room.x + room.w);
    make('s', 'x', room.z + room.d, room.x, room.x + room.w);
    make('w', 'z', room.x, room.z, room.z + room.d);
    make('e', 'z', room.x + room.w, room.z, room.z + room.d);
  }

  // 按 1mm 精度分组共线墙
  const groups = new Map<string, RawWall[]>();
  for (const raw of raws) {
    const key = `${raw.axis}|${raw.fixed.toFixed(3)}`;
    const list = groups.get(key);
    if (list) list.push(raw);
    else groups.set(key, [raw]);
  }

  const pieces: WallPiece[] = [];

  for (const [key, walls] of groups) {
    const bounds = Array.from(
      new Set(walls.flatMap((w) => [Number(w.start.toFixed(4)), Number(w.end.toFixed(4))])),
    ).sort((a, b) => a - b);

    for (let i = 0; i < bounds.length - 1; i += 1) {
      const a = bounds[i];
      const b = bounds[i + 1];
      if (b - a <= EPS) continue;

      const sources = walls.filter((w) => w.start <= a + EPS && w.end >= b - EPS);
      if (sources.length === 0) continue;

      const holes: WallHole[] = [];
      for (const source of sources) {
        for (const h of source.holes) {
          const hs = Math.max(a, h.start);
          const he = Math.min(b, h.end);
          if (he - hs <= 0.001) continue;
          holes.push({ start: hs, end: he, bottom: h.bottom, top: h.top, kind: h.kind });
        }
      }

      holes.sort((x, y) => x.start - y.start);
      const merged: WallHole[] = [];
      for (const h of holes) {
        const last = merged[merged.length - 1];
        if (last && h.start <= last.end + 0.001) {
          last.end = Math.max(last.end, h.end);
          last.bottom = Math.min(last.bottom, h.bottom);
          last.top = Math.max(last.top, h.top);
        } else {
          merged.push({ ...h });
        }
      }

      const axis = sources[0].axis;
      pieces.push({
        key: `${key}|${a.toFixed(3)}|${b.toFixed(3)}`,
        axis,
        fixed: sources[0].fixed,
        start: a,
        end: b,
        height: Math.max(...sources.map((s) => s.height)),
        thickness: Math.max(...sources.map((s) => s.thickness)),
        color: sources[0].color,
        holes: merged,
      });
    }
  }

  return pieces;
}

/** 3D 门窗组的位置与朝向 */
export function openingTransform(room: Room, op: Opening): {
  x: number;
  z: number;
  rotationY: number;
  inwardLocal: 1 | -1;
  thickness: number;
} {
  const p = wallPoint(room, op.side, op.offset);
  const horizontal = op.side === 'n' || op.side === 's';
  return {
    x: p.x,
    z: p.z,
    rotationY: horizontal ? 0 : -Math.PI / 2,
    inwardLocal: op.side === 'n' || op.side === 'e' ? 1 : -1,
    thickness: room.wallThickness,
  };
}

export function autoRoomName(existing: Room[]): string {
  const base = ['客厅', '卧室', '厨房', '书房', '卫生间', '餐厅', '儿童房', '阳台', '玄关', '客房'];
  const used = new Set(existing.map((r) => r.name));
  for (const name of base) {
    if (!used.has(name)) return name;
  }
  let i = existing.length + 1;
  while (used.has(`房间 ${i}`)) i += 1;
  return `房间 ${i}`;
}
