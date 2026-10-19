import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { getDef, shade, withAlpha } from '../catalog';
import {
  buildWalls,
  clamp,
  fmt,
  furnitureHalfExtents,
  projectBounds,
  roomOfPoint,
  roundTo,
  sideDir,
  sideInward,
  wallLength,
  wallPoint,
  wallStart,
} from '../geometry';
import { usePlanner } from '../store';
import type {
  Furniture,
  Opening,
  Project,
  Room,
  WallPiece,
  WallSide,
} from '../types';
import {
  CursorIcon,
  DoorIcon,
  FitIcon,
  MinusIcon,
  PlusIcon,
  RoomIcon,
  SparklesIcon,
  WindowIcon,
} from './icons';

const SNAP = 0.05;
const ALIGN_THRESHOLD = 0.18;
const MIN_ROOM = 1.2;
const WALL_SIDES: WallSide[] = ['n', 'e', 's', 'w'];

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

interface PlanPoint {
  x: number;
  z: number;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface SnapGuides {
  v?: number;
  h?: number;
}

type Drag =
  | { type: 'pan'; startClient: { x: number; y: number }; startView: ViewState }
  | {
      type: 'room-move';
      roomId: string;
      start: PlanPoint;
      orig: Room;
      moved: boolean;
    }
  | {
      type: 'room-resize';
      roomId: string;
      handle: ResizeHandle;
      start: PlanPoint;
      orig: Room;
      moved: boolean;
    }
  | {
      type: 'furniture-move';
      id: string;
      start: PlanPoint;
      origX: number;
      origZ: number;
      moved: boolean;
    }
  | {
      type: 'furniture-rotate';
      id: string;
      center: PlanPoint;
      moved: boolean;
    }
  | {
      type: 'opening-move';
      id: string;
      roomId: string;
      side: WallSide;
      moved: boolean;
    };

interface WallHover {
  roomId: string;
  side: WallSide;
  offset: number;
  dist: number;
  width: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

function snapEdgeTo(value: number, targets: number[]): number | null {
  let best: number | null = null;
  let bestDist = ALIGN_THRESHOLD;
  for (const t of targets) {
    const d = Math.abs(t - value);
    if (d <= bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

function snapRoomMove(room: Room, rawX: number, rawZ: number, rooms: Room[]): {
  x: number;
  z: number;
  guides: SnapGuides;
} {
  const others = rooms.filter((r) => r.id !== room.id);
  const xEdges = [rawX, rawX + room.w];
  const zEdges = [rawZ, rawZ + room.d];
  let bestDx = 0;
  let hasX = false;
  let bestDxDist = ALIGN_THRESHOLD;
  let guideV: number | undefined;
  let bestDz = 0;
  let hasZ = false;
  let bestDzDist = ALIGN_THRESHOLD;
  let guideH: number | undefined;

  for (const other of others) {
    for (const target of [other.x, other.x + other.w]) {
      for (const edge of xEdges) {
        const diff = target - edge;
        if (Math.abs(diff) <= bestDxDist) {
          bestDxDist = Math.abs(diff);
          bestDx = diff;
          hasX = true;
          guideV = target;
        }
      }
    }
    for (const target of [other.z, other.z + other.d]) {
      for (const edge of zEdges) {
        const diff = target - edge;
        if (Math.abs(diff) <= bestDzDist) {
          bestDzDist = Math.abs(diff);
          bestDz = diff;
          hasZ = true;
          guideH = target;
        }
      }
    }
  }

  return {
    x: hasX ? Math.round((rawX + bestDx) * 1000) / 1000 : roundTo(rawX, SNAP),
    z: hasZ ? Math.round((rawZ + bestDz) * 1000) / 1000 : roundTo(rawZ, SNAP),
    guides: { v: guideV, h: guideH },
  };
}

function resizeRoom(
  orig: Room,
  handle: ResizeHandle,
  dx: number,
  dz: number,
  rooms: Room[],
): Room {
  let left = orig.x;
  let top = orig.z;
  let right = orig.x + orig.w;
  let bottom = orig.z + orig.d;

  if (handle.includes('w')) left += dx;
  if (handle.includes('e')) right += dx;
  if (handle.includes('n')) top += dz;
  if (handle.includes('s')) bottom += dz;

  const others = rooms.filter((r) => r.id !== orig.id);
  const xTargets = others.flatMap((r) => [r.x, r.x + r.w]);
  const zTargets = others.flatMap((r) => [r.z, r.z + r.d]);

  if (handle.includes('w') || handle.includes('e')) {
    const value = handle.includes('w') ? left : right;
    const snapped = snapEdgeTo(value, xTargets) ?? roundTo(value, SNAP);
    if (handle.includes('w')) left = snapped;
    else right = snapped;
  }
  if (handle.includes('n') || handle.includes('s')) {
    const value = handle.includes('n') ? top : bottom;
    const snapped = snapEdgeTo(value, zTargets) ?? roundTo(value, SNAP);
    if (handle.includes('n')) top = snapped;
    else bottom = snapped;
  }

  if (right - left < MIN_ROOM) {
    if (handle.includes('w')) left = right - MIN_ROOM;
    else right = left + MIN_ROOM;
  }
  if (bottom - top < MIN_ROOM) {
    if (handle.includes('n')) top = bottom - MIN_ROOM;
    else bottom = top + MIN_ROOM;
  }

  return {
    ...orig,
    x: Math.round(left * 1000) / 1000,
    z: Math.round(top * 1000) / 1000,
    w: Math.round((right - left) * 1000) / 1000,
    d: Math.round((bottom - top) * 1000) / 1000,
  };
}

function snapFurniture(
  x: number,
  z: number,
  item: Furniture,
  rooms: Room[],
): PlanPoint {
  const def = getDef(item.type);
  const { hx, hz } = furnitureHalfExtents(item, def.w, def.d);
  let sx = roundTo(x, SNAP);
  let sz = roundTo(z, SNAP);
  const room = roomOfPoint(rooms, x, z);
  if (!room) return { x: sx, z: sz };
  const inset = room.wallThickness / 2 + 0.02;
  const targetsX = [
    room.x + inset + hx,
    room.x + room.w - inset - hx,
  ];
  const targetsZ = [
    room.z + inset + hz,
    room.z + room.d - inset - hz,
  ];
  const snapX = snapEdgeTo(x, targetsX);
  const snapZ = snapEdgeTo(z, targetsZ);
  if (snapX !== null) sx = snapX;
  if (snapZ !== null) sz = snapZ;
  return { x: Math.round(sx * 1000) / 1000, z: Math.round(sz * 1000) / 1000 };
}

function findWallAt(project: Project, x: number, z: number, toolWidth: number): WallHover | null {
  let best: WallHover | null = null;
  for (const room of project.rooms) {
    for (const side of WALL_SIDES) {
      const len = wallLength(room, side);
      const start = wallStart(room, side);
      const dir = sideDir(side);
      const rel = (x - start.x) * dir.dx + (z - start.z) * dir.dz;
      const t = clamp(rel, 0, len);
      const px = start.x + dir.dx * t;
      const pz = start.z + dir.dz * t;
      const dist = Math.hypot(x - px, z - pz);
      if (dist > 0.42) continue;
      const offset = clamp(t, toolWidth / 2 + 0.03, Math.max(toolWidth / 2 + 0.03, len - toolWidth / 2 - 0.03));
      if (!best || dist < best.dist) {
        best = { roomId: room.id, side, offset, dist, width: toolWidth };
      }
    }
  }
  return best;
}

export default function PlanEditor() {
  const project = usePlanner((s) => s.project);
  const selection = usePlanner((s) => s.selection);
  const tool = usePlanner((s) => s.tool);
  const epoch = usePlanner((s) => s.epoch);
  const addRoom = usePlanner((s) => s.addRoom);
  const setTool = usePlanner((s) => s.setTool);
  const select = usePlanner((s) => s.select);
  const loadSample = usePlanner((s) => s.loadSample);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<ViewState>({ x: 90, y: 80, scale: 64 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const dragRef = useRef<Drag | null>(null);
  const spaceRef = useRef(false);
  const [spaceActive, setSpaceActive] = useState(false);
  const [guides, setGuides] = useState<SnapGuides>({});
  const [hover, setHover] = useState<WallHover | null>(null);
  const hoverRef = useRef<WallHover | null>(null);
  hoverRef.current = hover;

  const roomMap = useMemo(() => new Map(project.rooms.map((r) => [r.id, r])), [project.rooms]);
  const walls = useMemo(() => buildWalls(project), [project]);
  const bounds = useMemo(() => projectBounds(project), [project]);

  const selectedRoom = selection?.kind === 'room' ? roomMap.get(selection.id) ?? null : null;
  const selectedFurniture =
    selection?.kind === 'furniture'
      ? project.furniture.find((f) => f.id === selection.id) ?? null
      : null;
  const selectedOpening =
    selection?.kind === 'opening'
      ? project.openings.find((o) => o.id === selection.id) ?? null
      : null;

  const orderedFurniture = useMemo(() => {
    return [...project.furniture].sort((a, b) => {
      const ar = a.type === 'rug' ? 0 : 1;
      const br = b.type === 'rug' ? 0 : 1;
      return ar - br;
    });
  }, [project.furniture]);

  const toPlan = useCallback((clientX: number, clientY: number): PlanPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.scale,
      z: (clientY - rect.top - v.y) / v.scale,
    };
  }, []);

  const fitView = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const state = usePlanner.getState();
    const b = projectBounds(state.project);
    const usableW = Math.max(240, rect.width - 170);
    const usableH = Math.max(200, rect.height - 150);
    const scale = clamp(Math.min(usableW / Math.max(b.w, 1), usableH / Math.max(b.d, 1)), 22, 150);
    setView({
      x: rect.width / 2 - (b.minX + b.w / 2) * scale,
      y: rect.height / 2 - (b.minZ + b.d / 2) * scale,
      scale,
    });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(fitView);
    return () => cancelAnimationFrame(id);
  }, [epoch, fitView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const nextScale = clamp(v.scale * Math.exp(-e.deltaY * 0.0014), 18, 240);
        const k = nextScale / v.scale;
        return {
          scale: nextScale,
          x: mx - (mx - v.x) * k,
          y: my - (my - v.y) * k,
        };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Space' && !spaceRef.current) {
        e.preventDefault();
        spaceRef.current = true;
        setSpaceActive(true);
      }
      if (e.key === 'f' || e.key === 'F') {
        fitView();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setSpaceActive(false);
      }
    };
    const onBlur = () => {
      spaceRef.current = false;
      setSpaceActive(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [fitView]);

  /* ---------------- 拖拽 ---------------- */
  useEffect(() => {
    const ensureCheckpoint = (drag: Drag) => {
      if ('moved' in drag && !drag.moved) {
        drag.moved = true;
        usePlanner.getState().checkpoint();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const state = usePlanner.getState();
      const p = toPlan(e.clientX, e.clientY);

      if (drag.type === 'pan') {
        setView({
          ...drag.startView,
          x: drag.startView.x + (e.clientX - drag.startClient.x),
          y: drag.startView.y + (e.clientY - drag.startClient.y),
        });
        return;
      }

      if (drag.type === 'room-move') {
        const dx = p.x - drag.start.x;
        const dz = p.z - drag.start.z;
        if (Math.abs(dx) < 0.004 && Math.abs(dz) < 0.004) return;
        ensureCheckpoint(drag);
        const snapped = snapRoomMove(
          { ...drag.orig },
          drag.orig.x + dx,
          drag.orig.z + dz,
          state.project.rooms,
        );
        setGuides(snapped.guides);
        state.moveRoom(drag.roomId, snapped.x, snapped.z, true);
        return;
      }

      if (drag.type === 'room-resize') {
        const dx = p.x - drag.start.x;
        const dz = p.z - drag.start.z;
        if (Math.abs(dx) < 0.004 && Math.abs(dz) < 0.004) return;
        ensureCheckpoint(drag);
        const resized = resizeRoom(drag.orig, drag.handle, dx, dz, state.project.rooms);
        state.updateRoom(
          drag.roomId,
          { x: resized.x, z: resized.z, w: resized.w, d: resized.d },
          true,
        );
        return;
      }

      if (drag.type === 'furniture-move') {
        const dx = p.x - drag.start.x;
        const dz = p.z - drag.start.z;
        if (Math.abs(dx) < 0.004 && Math.abs(dz) < 0.004) return;
        ensureCheckpoint(drag);
        const item = state.project.furniture.find((f) => f.id === drag.id);
        if (!item) return;
        const snapped = snapFurniture(drag.origX + dx, drag.origZ + dz, item, state.project.rooms);
        state.updateFurniture(drag.id, { x: snapped.x, z: snapped.z }, true);
        return;
      }

      if (drag.type === 'furniture-rotate') {
        const item = state.project.furniture.find((f) => f.id === drag.id);
        if (!item) return;
        const angle = (Math.atan2(p.z - drag.center.z, p.x - drag.center.x) * 180) / Math.PI + 90;
        const normalized = ((angle % 360) + 360) % 360;
        const rotation = e.altKey ? Math.round(normalized * 10) / 10 : Math.round(normalized / 15) * 15;
        ensureCheckpoint(drag);
        state.updateFurniture(drag.id, { rotation }, true);
        return;
      }

      if (drag.type === 'opening-move') {
        const room = roomMap.get(drag.roomId);
        const opening = state.project.openings.find((o) => o.id === drag.id);
        if (!room || !opening) return;
        const len = wallLength(room, drag.side);
        const raw = drag.side === 'n' || drag.side === 's' ? p.x - room.x : p.z - room.z;
        const offset = clamp(
          roundTo(raw, 0.01),
          opening.width / 2 + 0.03,
          Math.max(opening.width / 2 + 0.03, len - opening.width / 2 - 0.03),
        );
        const overlaps = state.project.openings.some(
          (o) =>
            o.id !== opening.id &&
            o.roomId === opening.roomId &&
            o.side === opening.side &&
            Math.abs(o.offset - offset) < (o.width + opening.width) / 2 + 0.04,
        );
        if (overlaps) return;
        ensureCheckpoint(drag);
        state.updateOpening(drag.id, { offset }, true);
      }
    };

    const onPointerUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setGuides({});
      document.body.classList.remove('is-grabbing');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [roomMap, toPlan]);

  const isPanGesture = (e: ReactPointerEvent) =>
    e.button === 1 || (e.button === 0 && spaceRef.current);

  const startPan = (e: ReactPointerEvent) => {
    dragRef.current = {
      type: 'pan',
      startClient: { x: e.clientX, y: e.clientY },
      startView: { ...viewRef.current },
    };
    document.body.classList.add('is-grabbing');
  };

  const handleSvgPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (isPanGesture(e)) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;

    if (tool === 'door' || tool === 'window') {
      const p = toPlan(e.clientX, e.clientY);
      const width = tool === 'door' ? 0.9 : 1.4;
      const h = findWallAt(project, p.x, p.z, width);
      if (!h) return;
      const state = usePlanner.getState();
      const existing = state.project.openings.find(
        (o) =>
          o.roomId === h.roomId &&
          o.side === h.side &&
          Math.abs(o.offset - h.offset) < (o.width + width) / 2 + 0.08,
      );
      if (existing) {
        state.select({ kind: 'opening', id: existing.id });
        state.notify('这里已有一个洞口，可拖动它调整位置');
        return;
      }
      state.addOpening(h.roomId, h.side, h.offset, tool);
      return;
    }

    select(null);
  };

  const handleSvgPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current) return;
    if (tool !== 'door' && tool !== 'window') {
      if (hoverRef.current) setHover(null);
      return;
    }
    const p = toPlan(e.clientX, e.clientY);
    const width = tool === 'door' ? 0.9 : 1.4;
    const next = findWallAt(project, p.x, p.z, width);
    setHover(next);
  };

  const handleRoomPointerDown = (e: ReactPointerEvent, room: Room) => {
    if (isPanGesture(e)) return;
    if (e.button !== 0) return;
    if (tool !== 'select') return;
    e.stopPropagation();
    select({ kind: 'room', id: room.id });
    dragRef.current = {
      type: 'room-move',
      roomId: room.id,
      start: toPlan(e.clientX, e.clientY),
      orig: { ...room },
      moved: false,
    };
  };

  const handleFurniturePointerDown = (e: ReactPointerEvent, item: Furniture) => {
    if (isPanGesture(e)) return;
    if (e.button !== 0) return;
    if (tool !== 'select') return;
    e.stopPropagation();
    select({ kind: 'furniture', id: item.id });
    dragRef.current = {
      type: 'furniture-move',
      id: item.id,
      start: toPlan(e.clientX, e.clientY),
      origX: item.x,
      origZ: item.z,
      moved: false,
    };
  };

  const handleOpeningPointerDown = (e: ReactPointerEvent, opening: Opening) => {
    if (isPanGesture(e)) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    select({ kind: 'opening', id: opening.id });
    dragRef.current = {
      type: 'opening-move',
      id: opening.id,
      roomId: opening.roomId,
      side: opening.side,
      moved: false,
    };
  };

  const handleRotatePointerDown = (e: ReactPointerEvent, item: Furniture) => {
    if (isPanGesture(e)) return;
    if (e.button !== 0) return;
    if (tool !== 'select') return;
    e.stopPropagation();
    select({ kind: 'furniture', id: item.id });
    dragRef.current = {
      type: 'furniture-rotate',
      id: item.id,
      center: { x: item.x, z: item.z },
      moved: false,
    };
  };

  const handleResizePointerDown = (e: ReactPointerEvent, room: Room, handle: ResizeHandle) => {
    if (isPanGesture(e)) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    select({ kind: 'room', id: room.id });
    dragRef.current = {
      type: 'room-resize',
      roomId: room.id,
      handle,
      start: toPlan(e.clientX, e.clientY),
      orig: { ...room },
      moved: false,
    };
  };

  const zoomBy = (factor: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    setView((v) => {
      const nextScale = clamp(v.scale * factor, 18, 240);
      const k = nextScale / v.scale;
      return {
        scale: nextScale,
        x: mx - (mx - v.x) * k,
        y: my - (my - v.y) * k,
      };
    });
  };

  const handles: Array<{ key: ResizeHandle; x: number; z: number; cursor: string }> = selectedRoom
    ? [
        { key: 'nw', x: selectedRoom.x, z: selectedRoom.z, cursor: 'nwse-resize' },
        { key: 'n', x: selectedRoom.x + selectedRoom.w / 2, z: selectedRoom.z, cursor: 'ns-resize' },
        { key: 'ne', x: selectedRoom.x + selectedRoom.w, z: selectedRoom.z, cursor: 'nesw-resize' },
        { key: 'e', x: selectedRoom.x + selectedRoom.w, z: selectedRoom.z + selectedRoom.d / 2, cursor: 'ew-resize' },
        { key: 'se', x: selectedRoom.x + selectedRoom.w, z: selectedRoom.z + selectedRoom.d, cursor: 'nwse-resize' },
        { key: 's', x: selectedRoom.x + selectedRoom.w / 2, z: selectedRoom.z + selectedRoom.d, cursor: 'ns-resize' },
        { key: 'sw', x: selectedRoom.x, z: selectedRoom.z + selectedRoom.d, cursor: 'nesw-resize' },
        { key: 'w', x: selectedRoom.x, z: selectedRoom.z + selectedRoom.d / 2, cursor: 'ew-resize' },
      ]
    : [];

  const ghost = useMemo(() => {
    if (!hover || (tool !== 'door' && tool !== 'window')) return null;
    const room = roomMap.get(hover.roomId);
    if (!room) return null;
    const start = wallPoint(room, hover.side, hover.offset - hover.width / 2);
    const end = wallPoint(room, hover.side, hover.offset + hover.width / 2);
    return {
      start,
      end,
      center: wallPoint(room, hover.side, hover.offset),
      kind: tool,
      thickness: room.wallThickness,
    };
  }, [hover, roomMap, tool]);

  const toolHint =
    tool === 'door'
      ? '点击墙体放置门，拖动门扇可沿墙移动 · Esc 退出'
      : tool === 'window'
        ? '点击墙体放置窗，拖动窗户可沿墙移动 · Esc 退出'
        : null;

  return (
    <div className={`plan-wrap${spaceActive ? ' space-pan' : ''}`} ref={wrapRef}>
      <svg
        ref={svgRef}
        className={`plan-svg${tool !== 'select' ? ' tool-openings' : ''}`}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="grid-minor" width={0.5} height={0.5} patternUnits="userSpaceOnUse">
            <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#d9d2c5" strokeWidth={0.006} />
          </pattern>
          <pattern id="grid-major" width={2} height={2} patternUnits="userSpaceOnUse">
            <rect width={2} height={2} fill="url(#grid-minor)" />
            <path d="M 2 0 L 0 0 0 2" fill="none" stroke="#c8bfae" strokeWidth={0.012} />
          </pattern>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <rect x={-300} y={-300} width={800} height={700} fill="#f7f4ee" />
          <rect x={-300} y={-300} width={800} height={700} fill="url(#grid-major)" />

          {project.rooms.map((room) => (
            <g key={room.id}>
              <rect
                x={room.x}
                y={room.z}
                width={room.w}
                height={room.d}
                rx={0.02}
                fill={room.floorColor}
                className="room-floor"
                onPointerDown={(e) => handleRoomPointerDown(e, room)}
              />
              {selectedRoom?.id === room.id && (
                <rect
                  x={room.x}
                  y={room.z}
                  width={room.w}
                  height={room.d}
                  fill="none"
                  stroke="#b2653f"
                  strokeWidth={0.03}
                  strokeDasharray="0.18 0.11"
                  pointerEvents="none"
                />
              )}
            </g>
          ))}

          <g className="walls" pointerEvents="none">
            {walls.map((piece) => (
              <Wall2D key={piece.key} piece={piece} />
            ))}
          </g>

          <g className="openings">
            {project.openings.map((opening) => {
              const room = roomMap.get(opening.roomId);
              if (!room) return null;
              return (
                <Opening2D
                  key={opening.id}
                  room={room}
                  opening={opening}
                  selected={selectedOpening?.id === opening.id}
                  interactive
                  onPointerDown={handleOpeningPointerDown}
                />
              );
            })}
          </g>

          <g className="furniture">
            {orderedFurniture.map((item) => {
              const def = getDef(item.type);
              const isSelected = selectedFurniture?.id === item.id;
              const color = item.color ?? def.color;
              return (
                <g
                  key={item.id}
                  transform={`translate(${item.x} ${item.z}) rotate(${item.rotation})`}
                  opacity={tool === 'select' ? 1 : 0.72}
                  style={{ pointerEvents: tool === 'select' ? 'auto' : 'none' }}
                >
                  <g onPointerDown={(e) => handleFurniturePointerDown(e, item)} className="furniture-body">
                    {def.round ? (
                      <ellipse
                        cx={0}
                        cy={0}
                        rx={def.w / 2}
                        ry={def.d / 2}
                        fill={withAlpha(color, item.type === 'rug' ? 0.55 : 0.3)}
                        stroke={shade(color, -0.18)}
                        strokeWidth={0.022}
                      />
                    ) : (
                      <rect
                        x={-def.w / 2}
                        y={-def.d / 2}
                        width={def.w}
                        height={def.d}
                        rx={0.035}
                        fill={withAlpha(color, item.type === 'rug' ? 0.5 : 0.24)}
                        stroke={shade(color, -0.2)}
                        strokeWidth={0.02}
                        strokeDasharray={item.type === 'rug' ? '0.1 0.07' : undefined}
                      />
                    )}
                    {item.type !== 'rug' && (
                      <line
                        x1={-def.w / 2 + 0.06}
                        y1={def.d / 2 - 0.035}
                        x2={def.w / 2 - 0.06}
                        y2={def.d / 2 - 0.035}
                        stroke={shade(color, -0.24)}
                        strokeWidth={0.018}
                        strokeLinecap="round"
                      />
                    )}
                    <text
                      x={0}
                      y={item.type === 'rug' ? 0 : 0.055}
                      textAnchor="middle"
                      fontSize={item.type === 'rug' ? 0.15 : 0.125}
                      fill={item.type === 'rug' ? '#8b7969' : '#4d4a42'}
                      fontWeight={500}
                      pointerEvents="none"
                    >
                      {def.name}
                    </text>
                  </g>

                  {isSelected && tool === 'select' && (
                    <>
                      <rect
                        x={-def.w / 2 - 0.07}
                        y={-def.d / 2 - 0.07}
                        width={def.w + 0.14}
                        height={def.d + 0.14}
                        rx={0.06}
                        fill="none"
                        stroke="#b2653f"
                        strokeWidth={0.025}
                        strokeDasharray="0.12 0.08"
                        pointerEvents="none"
                      />
                      <line
                        x1={0}
                        y1={-def.d / 2 - 0.07}
                        x2={0}
                        y2={-def.d / 2 - 0.3}
                        stroke="#b2653f"
                        strokeWidth={0.018}
                        pointerEvents="none"
                      />
                      <circle
                        cx={0}
                        cy={-def.d / 2 - 0.4}
                        r={0.13}
                        fill="transparent"
                        style={{ cursor: 'grab' }}
                        onPointerDown={(e) => handleRotatePointerDown(e, item)}
                      />
                      <circle
                        cx={0}
                        cy={-def.d / 2 - 0.4}
                        r={0.065}
                        fill="#fffaf4"
                        stroke="#b2653f"
                        strokeWidth={0.022}
                        pointerEvents="none"
                      />
                    </>
                  )}
                </g>
              );
            })}
          </g>

          <g className="room-labels">
            {project.rooms.map((room) => (
              <RoomLabel
                key={room.id}
                room={room}
                selected={selectedRoom?.id === room.id}
                zoom={view.scale}
              />
            ))}
          </g>

          {selectedRoom && (
            <g className="room-dims" pointerEvents="none">
              <DimLine
                x1={selectedRoom.x}
                z1={selectedRoom.z - 0.42}
                x2={selectedRoom.x + selectedRoom.w}
                z2={selectedRoom.z - 0.42}
                label={`${fmt(selectedRoom.w)} m`}
                vertical={false}
              />
              <DimLine
                x1={selectedRoom.x - 0.42}
                z1={selectedRoom.z}
                x2={selectedRoom.x - 0.42}
                z2={selectedRoom.z + selectedRoom.d}
                label={`${fmt(selectedRoom.d)} m`}
                vertical
              />
            </g>
          )}

          {guides.v !== undefined && (
            <line
              x1={guides.v}
              y1={bounds.minZ - 2}
              x2={guides.v}
              y2={bounds.maxZ + 2}
              stroke="#b2653f"
              strokeWidth={0.015}
              strokeDasharray="0.15 0.1"
              opacity={0.6}
              pointerEvents="none"
            />
          )}
          {guides.h !== undefined && (
            <line
              x1={bounds.minX - 2}
              y1={guides.h}
              x2={bounds.maxX + 2}
              y2={guides.h}
              stroke="#b2653f"
              strokeWidth={0.015}
              strokeDasharray="0.15 0.1"
              opacity={0.6}
              pointerEvents="none"
            />
          )}

          {ghost && (
            <g pointerEvents="none">
              <line
                x1={ghost.start.x}
                y1={ghost.start.z}
                x2={ghost.end.x}
                y2={ghost.end.z}
                stroke="#b2653f"
                strokeWidth={Math.max(ghost.thickness, 0.1) * 1.3}
                opacity={0.35}
                strokeLinecap="butt"
              />
              <line
                x1={ghost.start.x}
                y1={ghost.start.z}
                x2={ghost.end.x}
                y2={ghost.end.z}
                stroke="#f7f3ec"
                strokeWidth={Math.max(ghost.thickness, 0.1) * 0.35}
                strokeLinecap="butt"
              />
              <circle cx={ghost.center.x} cy={ghost.center.z} r={0.08} fill="#b2653f" opacity={0.85} />
            </g>
          )}

          {selectedRoom && tool === 'select' && (
            <g className="resize-handles">
              {handles.map((h) => (
                <g key={h.key}>
                  <rect
                    x={h.x - 0.15}
                    y={h.z - 0.15}
                    width={0.3}
                    height={0.3}
                    fill="transparent"
                    style={{ cursor: h.cursor }}
                    onPointerDown={(e) => handleResizePointerDown(e, selectedRoom, h.key)}
                  />
                  <rect
                    x={h.x - 0.055}
                    y={h.z - 0.055}
                    width={0.11}
                    height={0.11}
                    rx={0.018}
                    fill="#fffaf4"
                    stroke="#b2653f"
                    strokeWidth={0.018}
                    pointerEvents="none"
                  />
                </g>
              ))}
            </g>
          )}
        </g>
      </svg>

      <div className="canvas-toolbar glass">
        <button
          className={`tool-btn${tool === 'select' ? ' active' : ''}`}
          onClick={() => setTool('select')}
          title="选择 / 移动"
        >
          <CursorIcon />
          <span>选择</span>
        </button>
        <button
          className={`tool-btn${tool === 'door' ? ' active' : ''}`}
          onClick={() => setTool('door')}
          title="添加门"
        >
          <DoorIcon />
          <span>门</span>
        </button>
        <button
          className={`tool-btn${tool === 'window' ? ' active' : ''}`}
          onClick={() => setTool('window')}
          title="添加窗"
        >
          <WindowIcon />
          <span>窗</span>
        </button>
        <div className="toolbar-sep" />
        <button className="tool-btn" onClick={addRoom} title="添加房间">
          <RoomIcon />
          <span>房间</span>
        </button>
      </div>

      {toolHint && <div className="tool-hint glass">{toolHint}</div>}

      <div className="zoom-controls glass">
        <button onClick={() => zoomBy(1.22)} title="放大">
          <PlusIcon size={16} />
        </button>
        <div className="zoom-value">{Math.round((view.scale / 80) * 100)}%</div>
        <button onClick={() => zoomBy(1 / 1.22)} title="缩小">
          <MinusIcon size={16} />
        </button>
        <div className="zoom-sep" />
        <button onClick={fitView} title="适应视图 (F)">
          <FitIcon size={16} />
        </button>
      </div>

      {project.rooms.length === 0 && (
        <div className="empty-state">
          <div className="empty-card">
            <div className="empty-icon">
              <RoomIcon size={26} />
            </div>
            <h2>从一个房间开始</h2>
            <p>添加房间、拖拽边缘调整尺寸；把房间靠在一起，墙体就会自动连通。</p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={addRoom}>
                <PlusIcon size={16} />
                创建房间
              </button>
              <button className="btn" onClick={loadSample}>
                <SparklesIcon size={16} />
                载入示例
              </button>
            </div>
            <div className="empty-tip">也可以从右上角导入已有户型 JSON</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Wall2D({ piece }: { piece: WallPiece }) {
  const spans: Array<[number, number]> = [];
  let cursor = piece.start;
  for (const hole of piece.holes) {
    if (hole.start > cursor + 0.001) spans.push([cursor, hole.start]);
    cursor = Math.max(cursor, hole.end);
  }
  if (piece.end > cursor + 0.001) spans.push([cursor, piece.end]);

  const y = piece.fixed;
  return (
    <g>
      {spans.map(([a, b], idx) => (
        <line
          key={idx}
          x1={piece.axis === 'x' ? a : piece.fixed}
          y1={piece.axis === 'x' ? y : a}
          x2={piece.axis === 'x' ? b : piece.fixed}
          y2={piece.axis === 'x' ? y : b}
          stroke="#454741"
          strokeWidth={Math.max(piece.thickness, 0.1)}
          strokeLinecap="butt"
        />
      ))}
    </g>
  );
}

function Opening2D({
  room,
  opening,
  selected,
  interactive,
  onPointerDown,
}: {
  room: Room;
  opening: Opening;
  selected: boolean;
  interactive: boolean;
  onPointerDown: (e: ReactPointerEvent, o: Opening) => void;
}) {
  const start = wallPoint(room, opening.side, opening.offset - opening.width / 2);
  const end = wallPoint(room, opening.side, opening.offset + opening.width / 2);
  const center = wallPoint(room, opening.side, opening.offset);
  const inward = sideInward(opening.side);
  const dir = sideDir(opening.side);
  const t = Math.max(room.wallThickness, 0.1);
  const cross = dir.dx * inward.nz - dir.dz * inward.nx;
  const sweep = cross > 0 ? 1 : 0;
  const hinge = start;
  const tip = { x: hinge.x + inward.nx * opening.width, z: hinge.z + inward.nz * opening.width };
  const arcEnd = { x: start.x + dir.dx * opening.width, z: start.z + dir.dz * opening.width };

  const labelPoint = {
    x: center.x + inward.nx * (t + 0.17),
    z: center.z + inward.nz * (t + 0.17),
  };

  return (
    <g>
      {selected && (
        <line
          x1={start.x}
          y1={start.z}
          x2={end.x}
          y2={end.z}
          stroke="#b2653f"
          strokeWidth={t * 1.7}
          opacity={0.35}
          strokeLinecap="butt"
          pointerEvents="none"
        />
      )}

      {opening.kind === 'window' && (
        <g pointerEvents="none">
          <line
            x1={start.x}
            y1={start.z}
            x2={end.x}
            y2={end.z}
            stroke="#cfe0e3"
            strokeWidth={t * 0.72}
            strokeLinecap="butt"
          />
          <line
            x1={start.x}
            y1={start.z}
            x2={end.x}
            y2={end.z}
            stroke="#7fa3ad"
            strokeWidth={t * 0.16}
            strokeLinecap="butt"
          />
          <Tick x={start.x} z={start.z} dir={dir} length={t * 1.4} />
          <Tick x={end.x} z={end.z} dir={dir} length={t * 1.4} />
          {opening.width > 1.5 && (
            <Tick x={center.x} z={center.z} dir={dir} length={t * 1.1} />
          )}
        </g>
      )}

      {opening.kind === 'door' && (
        <g pointerEvents="none">
          <Tick x={start.x} z={start.z} dir={dir} length={t * 1.25} />
          <Tick x={end.x} z={end.z} dir={dir} length={t * 1.25} />
          <line
            x1={hinge.x}
            y1={hinge.z}
            x2={tip.x}
            y2={tip.z}
            stroke="#8d6644"
            strokeWidth={0.045}
            strokeLinecap="round"
          />
          <path
            d={`M ${arcEnd.x} ${arcEnd.z} A ${opening.width} ${opening.width} 0 0 ${sweep} ${tip.x} ${tip.z}`}
            fill="none"
            stroke="#b3a794"
            strokeWidth={0.018}
            strokeDasharray="0.08 0.06"
          />
          <circle cx={hinge.x} cy={hinge.z} r={0.035} fill="#8d6644" />
        </g>
      )}

      {opening.kind === 'opening' && (
        <line
          x1={start.x}
          y1={start.z}
          x2={end.x}
          y2={end.z}
          stroke="#b3a794"
          strokeWidth={0.025}
          strokeDasharray="0.09 0.07"
          pointerEvents="none"
        />
      )}

      {selected && (
        <text
          x={labelPoint.x}
          y={labelPoint.z}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={0.14}
          fill="#a35a3b"
          fontWeight={600}
          pointerEvents="none"
        >
          {opening.kind === 'door' ? '门' : opening.kind === 'window' ? '窗' : '洞口'} {fmt(opening.width)} m
        </text>
      )}

      {interactive && (
        <line
          x1={start.x}
          y1={start.z}
          x2={end.x}
          y2={end.z}
          stroke="transparent"
          strokeWidth={0.36}
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => onPointerDown(e, opening)}
        />
      )}
    </g>
  );
}

function Tick({ x, z, dir, length }: { x: number; z: number; dir: { dx: number; dz: number }; length: number }) {
  const nx = -dir.dz;
  const nz = dir.dx;
  return (
    <line
      x1={x - nx * (length / 2)}
      y1={z - nz * (length / 2)}
      x2={x + nx * (length / 2)}
      y2={z + nz * (length / 2)}
      stroke="#a9a091"
      strokeWidth={0.016}
      strokeLinecap="round"
    />
  );
}

function RoomLabel({ room, selected, zoom }: { room: Room; selected: boolean; zoom: number }) {
  if (zoom < 26) return null;
  const areaText = `${fmt(room.w * room.d, 1)} m²`;
  const showMeta = room.w >= 1.55;
  const nameSize = room.name.length > 4 ? 0.12 : 0.15;
  const nameW = room.name.length * nameSize;
  const metaW = showMeta ? areaText.length * 0.066 + 0.1 : 0;
  const pad = 0.15;
  const width = Math.min(
    Math.max(0.62, nameW + metaW + pad * 2 + 0.06),
    Math.max(0.5, room.w - 0.18),
  );
  const height = 0.3;
  const x = room.x + 0.1;
  const y = room.z + 0.1;

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={0.06}
        fill={selected ? 'rgba(250, 239, 230, 0.96)' : 'rgba(251, 248, 242, 0.93)'}
        stroke={selected ? '#e2c2ad' : '#e1d8c9'}
        strokeWidth={0.012}
      />
      <text
        x={x + pad}
        y={y + height / 2 + 0.004}
        dominantBaseline="middle"
        fontSize={nameSize}
        fontWeight={600}
        fill="#4e4a41"
      >
        {room.name}
      </text>
      {showMeta && (
        <text
          x={x + pad + nameW + 0.1}
          y={y + height / 2 + 0.005}
          dominantBaseline="middle"
          fontSize={0.098}
          fill="#958c7e"
        >
          {areaText}
        </text>
      )}
    </g>
  );
}

function DimLine({
  x1,
  z1,
  x2,
  z2,
  label,
  vertical,
}: {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  label: string;
  vertical: boolean;
}) {
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;
  const tick = 0.09;
  return (
    <g>
      <line x1={x1} y1={z1} x2={x2} y2={z2} stroke="#9d9485" strokeWidth={0.014} />
      <line
        x1={x1 - (vertical ? tick : 0)}
        y1={z1 - (vertical ? 0 : tick)}
        x2={x1 + (vertical ? tick : 0)}
        y2={z1 + (vertical ? 0 : tick)}
        stroke="#9d9485"
        strokeWidth={0.014}
      />
      <line
        x1={x2 - (vertical ? tick : 0)}
        y1={z2 - (vertical ? 0 : tick)}
        x2={x2 + (vertical ? tick : 0)}
        y2={z2 + (vertical ? 0 : tick)}
        stroke="#9d9485"
        strokeWidth={0.014}
      />
      <text
        x={midX}
        y={midZ}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={0.14}
        fill="#8a8173"
        transform={vertical ? `rotate(-90 ${midX} ${midZ})` : undefined}
        stroke="#f7f3ec"
        strokeWidth={0.045}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}
