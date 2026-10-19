import { create } from 'zustand';
import {
  FURNITURE,
  FURNITURE_SIZE_MAX,
  FURNITURE_SIZE_MIN,
  FLOOR_COLORS,
  WALL_COLORS,
} from './catalog';
import {
  autoRoomName,
  clamp,
  clampOpening,
  pointInRoom,
  roomOfPoint,
  wallLength,
  uid,
} from './geometry';
import { makeBlankProject, makeSampleProject } from './sample';
import type {
  Furniture,
  FurnitureType,
  Opening,
  OpeningKind,
  Project,
  Room,
  Selection,
  ToolMode,
  ViewMode,
  WallMode,
  WallSide,
} from './types';

const STORAGE_KEY = 'roomly.project.v1';
const HISTORY_LIMIT = 80;

type AnyRec = Record<string, any>;

function isRec(v: unknown): v is AnyRec {
  return typeof v === 'object' && v !== null;
}

function asNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function asColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
}

function normalizeProject(input: unknown): Project | null {
  if (!isRec(input)) return null;
  if (!Array.isArray(input.rooms)) return null;

  const rooms: Room[] = [];
  input.rooms.forEach((raw: unknown, index: number) => {
    if (!isRec(raw)) return;
    const x = asNum(raw.x, NaN);
    const z = asNum(raw.z, NaN);
    const w = asNum(raw.w, NaN);
    const d = asNum(raw.d, NaN);
    if (![x, z, w, d].every(Number.isFinite)) return;
    rooms.push({
      id: asStr(raw.id, uid('room')),
      name: asStr(raw.name, `房间 ${index + 1}`),
      x,
      z,
      w: clamp(w, 1, 60),
      d: clamp(d, 1, 60),
      height: clamp(asNum(raw.height, 2.8), 2, 5),
      wallThickness: clamp(asNum(raw.wallThickness, 0.12), 0.05, 0.4),
      floorColor: asColor(raw.floorColor, FLOOR_COLORS[index % FLOOR_COLORS.length]),
      wallColor: asColor(raw.wallColor, WALL_COLORS[index % WALL_COLORS.length]),
    });
  });

  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const openings: Opening[] = [];
  if (Array.isArray(input.openings)) {
    input.openings.forEach((raw: unknown) => {
      if (!isRec(raw)) return;
      const room = roomMap.get(asStr(raw.roomId, ''));
      if (!room) return;
      const side = raw.side as WallSide;
      if (!['n', 'e', 's', 'w'].includes(side)) return;
      const kind: OpeningKind = raw.kind === 'window' ? 'window' : raw.kind === 'opening' ? 'opening' : 'door';
      const width = asNum(raw.width, kind === 'door' ? 0.9 : 1.4);
      const height = asNum(raw.height, kind === 'door' ? 2.05 : 1.4);
      const sill = asNum(raw.sill, kind === 'door' ? 0 : 0.9);
      const opening: Opening = {
        id: asStr(raw.id, uid('op')),
        roomId: room.id,
        side,
        offset: asNum(raw.offset, wallLength(room, side) / 2),
        width,
        height,
        sill,
        kind,
        ...(kind === 'door'
          ? {
              swing: raw.swing === 'out' ? ('out' as const) : ('in' as const),
              hinge: raw.hinge === 'end' ? ('end' as const) : ('start' as const),
            }
          : {}),
      };
      openings.push(clampOpening(room, opening));
    });
  }

  const furniture: Furniture[] = [];
  if (Array.isArray(input.furniture)) {
    input.furniture.forEach((raw: unknown) => {
      if (!isRec(raw)) return;
      const type = raw.type as FurnitureType;
      if (!(type in FURNITURE)) return;
      const x = asNum(raw.x, NaN);
      const z = asNum(raw.z, NaN);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const rid = asStr(raw.roomId, '');
      const def = FURNITURE[type];
      let size: Furniture['size'];
      if (isRec(raw.size)) {
        size = {
          w: Math.round(clamp(asNum(raw.size.w, def.w), FURNITURE_SIZE_MIN.w, FURNITURE_SIZE_MAX.w) * 1000) / 1000,
          d: Math.round(clamp(asNum(raw.size.d, def.d), FURNITURE_SIZE_MIN.d, FURNITURE_SIZE_MAX.d) * 1000) / 1000,
          h: Math.round(clamp(asNum(raw.size.h, def.h), FURNITURE_SIZE_MIN.h, FURNITURE_SIZE_MAX.h) * 1000) / 1000,
        };
      }
      furniture.push({
        id: asStr(raw.id, uid('fur')),
        type,
        roomId: roomMap.has(rid) ? rid : null,
        x,
        z,
        rotation: ((asNum(raw.rotation, 0) % 360) + 360) % 360,
        ...(typeof raw.color === 'string' && /^#/.test(raw.color) ? { color: raw.color } : {}),
        ...(size ? { size } : {}),
      });
    });
  }

  return {
    name: asStr(input.name, '未命名户型').slice(0, 60),
    rooms,
    openings,
    furniture,
  };
}

interface BootData {
  project: Project;
  savedAt: number | null;
}

function readSaved(): BootData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const wrapped = isRec(parsed) && isRec(parsed.project) ? parsed : null;
    const project = normalizeProject(wrapped ? wrapped.project : parsed);
    if (!project) return null;
    return { project, savedAt: wrapped ? asNum(wrapped.savedAt, Date.now()) : Date.now() };
  } catch {
    return null;
  }
}

const boot = readSaved();
const initialProject = boot?.project ?? makeSampleProject();
let initialSavedAt = boot?.savedAt ?? null;

if (!boot) {
  try {
    const now = Date.now();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, project: initialProject, savedAt: now }),
    );
    initialSavedAt = now;
  } catch {
    // localStorage 不可用时仍可正常编辑
  }
}

function cloneProject(p: Project): Project {
  return structuredClone(p);
}

function selectionExists(project: Project, sel: Selection): Selection {
  if (!sel) return null;
  if (sel.kind === 'room') return project.rooms.some((r) => r.id === sel.id) ? sel : null;
  if (sel.kind === 'opening') return project.openings.some((o) => o.id === sel.id) ? sel : null;
  if (sel.kind === 'furniture') return project.furniture.some((f) => f.id === sel.id) ? sel : null;
  return null;
}

/** 选择房间类型后，同名房间自动编号 */
function uniqueRoomName(base: string, rooms: Room[]): string {
  const stem = base.trim().slice(0, 20) || autoRoomName(rooms);
  const used = new Set(rooms.map((r) => r.name));
  if (!used.has(stem)) return stem;
  let i = 2;
  while (used.has(`${stem} ${i}`)) i += 1;
  return `${stem} ${i}`;
}

interface Toast {
  id: number;
  message: string;
}

interface PlannerState {
  project: Project;
  selection: Selection;
  tool: ToolMode;
  view: ViewMode;
  wallMode: WallMode;
  epoch: number;
  past: Project[];
  future: Project[];
  saving: boolean;
  savedAt: number | null;
  toast: Toast | null;
  helpOpen: boolean;

  select: (sel: Selection) => void;
  setTool: (tool: ToolMode) => void;
  setView: (view: ViewMode) => void;
  setWallMode: (mode: WallMode) => void;
  setProjectName: (name: string, transient?: boolean) => void;
  notify: (message: string) => void;
  dismissToast: () => void;
  setHelpOpen: (open: boolean) => void;
  roomPickerOpen: boolean;
  openRoomPicker: () => void;
  closeRoomPicker: () => void;

  checkpoint: () => void;
  undo: () => void;
  redo: () => void;

  addRoom: (opts?: { name?: string; w?: number; d?: number }) => void;
  updateRoom: (id: string, patch: Partial<Room>, transient?: boolean) => void;
  moveRoom: (id: string, x: number, z: number, transient?: boolean) => void;
  deleteRoom: (id: string) => void;

  addOpening: (roomId: string, side: WallSide, offset: number, kind: OpeningKind) => void;
  updateOpening: (id: string, patch: Partial<Opening>, transient?: boolean) => void;
  deleteOpening: (id: string) => void;

  addFurniture: (
    type: FurnitureType,
    opts?: { x?: number; z?: number; roomId?: string | null },
  ) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>, transient?: boolean) => void;
  duplicateFurniture: (id: string) => void;
  deleteFurniture: (id: string) => void;
  rotateFurniture: (id: string, delta: number, transient?: boolean) => void;

  deleteSelection: () => void;
  newProject: () => void;
  loadSample: () => void;
  importProject: (input: unknown) => boolean;
}

let toastSeq = 0;

export const usePlanner = create<PlannerState>((set, get) => {
  const applyProject = (mutate: (p: Project) => void, transient = false) => {
    const state = get();
    const next = cloneProject(state.project);
    mutate(next);
    if (transient) {
      set({ project: next });
    } else {
      set({
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
      });
    }
  };

  const notify = (message: string) => {
    toastSeq += 1;
    set({ toast: { id: toastSeq, message } });
  };

  return {
    project: initialProject,
    selection: null,
    tool: 'select',
    view: '2d',
    wallMode: 'ghost',
    epoch: 0,
    past: [],
    future: [],
    saving: false,
    savedAt: initialSavedAt,
    toast: null,
    helpOpen: false,
    roomPickerOpen: false,

    select: (selection) => set({ selection }),
    setTool: (tool) => set(tool === 'select' ? { tool } : { tool, view: '2d' }),
    setView: (view) => set({ view, tool: 'select' }),
    setWallMode: (wallMode) => set({ wallMode }),
    notify,
    dismissToast: () => set({ toast: null }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),
    openRoomPicker: () => set({ roomPickerOpen: true }),
    closeRoomPicker: () => set({ roomPickerOpen: false }),

    setProjectName: (name, transient = true) => {
      const clean = name.slice(0, 60);
      if (transient) {
        set({ project: { ...get().project, name: clean } });
      } else {
        applyProject((p) => {
          p.name = clean;
        });
      }
    },

    checkpoint: () => {
      const state = get();
      const last = state.past[state.past.length - 1];
      if (last === state.project) return;
      set({
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
      });
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      set({
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
        selection: selectionExists(previous, state.selection),
      });
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const next = state.future[0];
      set({
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selection: selectionExists(next, state.selection),
      });
    },

    addRoom: (opts) => {
      const state = get();
      const rooms = state.project.rooms;
      let x = 0;
      let z = 0;
      let anchor: Room | undefined;
      if (rooms.length > 0) {
        const maxX = Math.max(...rooms.map((r) => r.x + r.w));
        anchor = rooms.find((r) => Math.abs(r.x + r.w - maxX) < 1e-6);
        x = maxX;
        z = anchor ? anchor.z : Math.min(...rooms.map((r) => r.z));
      }
      const room: Room = {
        id: uid('room'),
        name: uniqueRoomName(opts?.name ?? autoRoomName(rooms), rooms),
        x,
        z,
        w: Math.round(clamp(opts?.w ?? 4, 1, 60) * 10) / 10,
        d: Math.round(clamp(opts?.d ?? 3.6, 1, 60) * 10) / 10,
        height: anchor?.height ?? 2.8,
        wallThickness: anchor?.wallThickness ?? 0.12,
        floorColor: FLOOR_COLORS[rooms.length % FLOOR_COLORS.length],
        wallColor: WALL_COLORS[rooms.length % WALL_COLORS.length],
      };
      applyProject((p) => {
        p.rooms.push(room);
      });
      set({
        selection: { kind: 'room', id: room.id },
        tool: 'select',
        view: '2d',
        roomPickerOpen: false,
      });
      notify(`已添加「${room.name}」，拖动房间边缘可自动吸附连接`);
    },

    updateRoom: (id, patch, transient = false) => {
      applyProject((p) => {
        const idx = p.rooms.findIndex((r) => r.id === id);
        if (idx < 0) return;
        const merged = { ...p.rooms[idx], ...patch };
        merged.w = clamp(merged.w, 1, 60);
        merged.d = clamp(merged.d, 1, 60);
        merged.height = clamp(merged.height, 2, 5);
        merged.wallThickness = clamp(merged.wallThickness, 0.05, 0.4);
        merged.x = Math.round(merged.x * 1000) / 1000;
        merged.z = Math.round(merged.z * 1000) / 1000;
        merged.w = Math.round(merged.w * 1000) / 1000;
        merged.d = Math.round(merged.d * 1000) / 1000;
        p.rooms[idx] = merged;
        for (let i = 0; i < p.openings.length; i += 1) {
          if (p.openings[i].roomId === id) {
            p.openings[i] = clampOpening(merged, p.openings[i]);
          }
        }
      }, transient);
    },

    moveRoom: (id, x, z, transient = false) => {
      applyProject((p) => {
        const idx = p.rooms.findIndex((r) => r.id === id);
        if (idx < 0) return;
        const dx = x - p.rooms[idx].x;
        const dz = z - p.rooms[idx].z;
        p.rooms[idx].x = Math.round(x * 1000) / 1000;
        p.rooms[idx].z = Math.round(z * 1000) / 1000;
        for (const f of p.furniture) {
          if (f.roomId === id) {
            f.x = Math.round((f.x + dx) * 1000) / 1000;
            f.z = Math.round((f.z + dz) * 1000) / 1000;
          }
        }
      }, transient);
    },

    deleteRoom: (id) => {
      const state = get();
      const room = state.project.rooms.find((r) => r.id === id);
      if (!room) return;
      applyProject((p) => {
        p.rooms = p.rooms.filter((r) => r.id !== id);
        p.openings = p.openings.filter((o) => o.roomId !== id);
        p.furniture = p.furniture.filter(
          (f) => f.roomId !== id && !pointInRoom(room, f.x, f.z),
        );
      });
      set({ selection: null });
      notify(`已删除「${room.name}」`);
    },

    addOpening: (roomId, side, offset, kind) => {
      const state = get();
      const room = state.project.rooms.find((r) => r.id === roomId);
      if (!room) return;
      const width = kind === 'door' ? 0.9 : kind === 'window' ? 1.4 : 1.2;
      const height = kind === 'door' ? 2.05 : kind === 'window' ? 1.4 : 2.1;
      const sill = kind === 'window' ? 0.9 : 0;
      const base: Opening = {
        id: uid('op'),
        roomId,
        side,
        offset,
        width,
        height,
        sill,
        kind,
        ...(kind === 'door'
          ? { swing: 'in' as const, hinge: 'start' as const }
          : {}),
      };
      const opening = clampOpening(room, base);
      applyProject((p) => {
        p.openings.push(opening);
      });
      set({ selection: { kind: 'opening', id: opening.id } });
    },

    updateOpening: (id, patch, transient = false) => {
      applyProject((p) => {
        const idx = p.openings.findIndex((o) => o.id === id);
        if (idx < 0) return;
        const current = p.openings[idx];
        const room = p.rooms.find((r) => r.id === current.roomId);
        if (!room) return;
        p.openings[idx] = clampOpening(room, { ...current, ...patch });
      }, transient);
    },

    deleteOpening: (id) => {
      applyProject((p) => {
        p.openings = p.openings.filter((o) => o.id !== id);
      });
      set({ selection: null });
    },

    addFurniture: (type, opts) => {
      const state = get();
      let room: Room | null = null;
      let roomId = opts?.roomId ?? null;

      if (!roomId && state.selection) {
        if (state.selection.kind === 'room') roomId = state.selection.id;
        else if (state.selection.kind === 'furniture') {
          roomId = state.project.furniture.find((f) => f.id === state.selection!.id)?.roomId ?? null;
        } else if (state.selection.kind === 'opening') {
          roomId = state.project.openings.find((o) => o.id === state.selection!.id)?.roomId ?? null;
        }
      }

      if (roomId) room = state.project.rooms.find((r) => r.id === roomId) ?? null;
      if (!room && state.project.rooms.length > 0) {
        room = state.project.rooms[0];
        roomId = room.id;
      }
      if (opts?.x !== undefined && opts?.z !== undefined) {
        const under = roomOfPoint(state.project.rooms, opts.x, opts.z);
        if (under) {
          room = under;
          roomId = under.id;
        }
      }

      const count = state.project.furniture.filter((f) => f.roomId === roomId).length;
      const x =
        opts?.x ??
        (room
          ? room.x + room.w / 2 + ((count % 3) - 1) * 0.18
          : ((count % 3) - 1) * 0.3);
      const z =
        opts?.z ??
        (room
          ? room.z + room.d / 2 + ((Math.floor(count / 3) % 3) - 1) * 0.18
          : ((Math.floor(count / 3) % 3) - 1) * 0.3);

      const item: Furniture = {
        id: uid('fur'),
        type,
        roomId,
        x: Math.round(x * 100) / 100,
        z: Math.round(z * 100) / 100,
        rotation: 0,
      };
      applyProject((p) => {
        p.furniture.push(item);
      });
      set({ selection: { kind: 'furniture', id: item.id }, tool: 'select' });
    },

    updateFurniture: (id, patch, transient = false) => {
      applyProject((p) => {
        const idx = p.furniture.findIndex((f) => f.id === id);
        if (idx < 0) return;
        const merged = { ...p.furniture[idx], ...patch };
        merged.x = Math.round(merged.x * 1000) / 1000;
        merged.z = Math.round(merged.z * 1000) / 1000;
        merged.rotation = ((merged.rotation % 360) + 360) % 360;
        if (patch.size) {
          merged.size = {
            w: Math.round(clamp(patch.size.w, FURNITURE_SIZE_MIN.w, FURNITURE_SIZE_MAX.w) * 1000) / 1000,
            d: Math.round(clamp(patch.size.d, FURNITURE_SIZE_MIN.d, FURNITURE_SIZE_MAX.d) * 1000) / 1000,
            h: Math.round(clamp(patch.size.h, FURNITURE_SIZE_MIN.h, FURNITURE_SIZE_MAX.h) * 1000) / 1000,
          };
        }
        if (patch.x !== undefined || patch.z !== undefined) {
          const room = roomOfPoint(p.rooms, merged.x, merged.z);
          merged.roomId = room ? room.id : null;
        }
        p.furniture[idx] = merged;
      }, transient);
    },

    duplicateFurniture: (id) => {
      const state = get();
      const source = state.project.furniture.find((f) => f.id === id);
      if (!source) return;
      const copy: Furniture = {
        ...source,
        id: uid('fur'),
        x: source.x + 0.35,
        z: source.z + 0.35,
      };
      applyProject((p) => {
        p.furniture.push(copy);
      });
      set({ selection: { kind: 'furniture', id: copy.id } });
      notify('已复制家具');
    },

    deleteFurniture: (id) => {
      applyProject((p) => {
        p.furniture = p.furniture.filter((f) => f.id !== id);
      });
      set({ selection: null });
    },

    rotateFurniture: (id, delta, transient = false) => {
      applyProject((p) => {
        const item = p.furniture.find((f) => f.id === id);
        if (!item) return;
        item.rotation = ((item.rotation + delta) % 360 + 360) % 360;
      }, transient);
    },

    deleteSelection: () => {
      const state = get();
      const sel = state.selection;
      if (!sel) return;
      if (sel.kind === 'room') state.deleteRoom(sel.id);
      else if (sel.kind === 'opening') state.deleteOpening(sel.id);
      else if (sel.kind === 'furniture') state.deleteFurniture(sel.id);
    },

    newProject: () => {
      const state = get();
      set({
        project: makeBlankProject(),
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
        selection: null,
        tool: 'select',
        view: '2d',
        epoch: state.epoch + 1,
        roomPickerOpen: false,
      });
      notify('已新建空白户型 · 按 ⌘Z 可撤销');
    },

    loadSample: () => {
      const state = get();
      set({
        project: makeSampleProject(),
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
        selection: null,
        tool: 'select',
        view: '2d',
        epoch: state.epoch + 1,
        roomPickerOpen: false,
      });
      notify('已载入示例户型');
    },

    importProject: (input) => {
      const raw =
        isRec(input) && isRec(input.project) ? input.project : input;
      const normalized = normalizeProject(raw);
      if (!normalized) {
        notify('导入失败：文件格式不正确');
        return false;
      }
      const state = get();
      set({
        project: normalized,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
        selection: null,
        tool: 'select',
        view: '2d',
        epoch: state.epoch + 1,
        roomPickerOpen: false,
      });
      notify('户型导入成功');
      return true;
    },
  };
});

/* ---------- 自动保存 ---------- */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

usePlanner.subscribe((state, prev) => {
  if (state.project === prev.project) return;
  if (saveTimer) clearTimeout(saveTimer);
  usePlanner.setState({ saving: true });
  saveTimer = setTimeout(() => {
    try {
      const project = usePlanner.getState().project;
      const savedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, project, savedAt }));
      usePlanner.setState({ saving: false, savedAt });
    } catch {
      usePlanner.setState({ saving: false });
    }
  }, 420);
});
