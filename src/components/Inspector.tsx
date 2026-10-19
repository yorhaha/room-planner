import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  FLOOR_COLORS,
  FURNITURE_COLORS,
  FURNITURE_SIZE_MAX,
  FURNITURE_SIZE_MIN,
  WALL_COLORS,
  getDef,
  getFurnitureSize,
  withAlpha,
} from '../catalog';
import { clamp, fmt, wallLength } from '../geometry';
import { usePlanner } from '../store';
import type { OpeningKind, Room, WallMode, WallSide } from '../types';
import {
  CopyIcon,
  DoorIcon,
  RoomIcon,
  RotateIcon,
  TrashIcon,
  WindowIcon,
} from './icons';

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="inspector-section">
      <div className="inspector-section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = 'm',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number, transient: boolean) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <label className="number-field">
      <span className="number-label">{label}</span>
      <span className="number-input-wrap">
        <input
          type="number"
          value={focused ? draft : String(Number(value.toFixed(3)))}
          min={min}
          max={max}
          step={step}
          onFocus={(e) => {
            usePlanner.getState().checkpoint();
            setFocused(true);
            setDraft(String(Number(value.toFixed(3))));
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = Number.parseFloat(e.target.value);
            if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max), true);
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = Number.parseFloat(draft);
            if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max), true);
          }}
        />
        <span className="number-unit">{unit}</span>
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="number-field text-field">
      <span className="number-label">{label}</span>
      <span className="number-input-wrap">
        <input
          type="text"
          value={value}
          maxLength={20}
          spellCheck={false}
          onFocus={() => usePlanner.getState().checkpoint()}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}

function SwatchRow({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="swatch-row">
      <span className="swatch-label">{label}</span>
      <div className="swatches">
        {colors.map((c) => (
          <button
            key={c}
            className={`swatch${value.toLowerCase() === c.toLowerCase() ? ' active' : ''}`}
            style={{ background: c }}
            title={c}
            onClick={() => onChange(c)}
          />
        ))}
        <label className="swatch custom" title="自定义颜色">
          <input
            type="color"
            value={value}
            onFocus={() => usePlanner.getState().checkpoint()}
            onChange={(e) => onChange(e.target.value)}
          />
          <span>+</span>
        </label>
      </div>
    </div>
  );
}

const WALL_LABELS: Array<{ value: WallSide; label: string }> = [
  { value: 'n', label: '北墙' },
  { value: 'e', label: '东墙' },
  { value: 's', label: '南墙' },
  { value: 'w', label: '西墙' },
];

const KIND_LABELS: Record<OpeningKind, string> = {
  door: '门',
  window: '窗',
  opening: '垭口',
};

const WALL_MODES: Array<{ value: WallMode; label: string }> = [
  { value: 'ghost', label: '半透明' },
  { value: 'solid', label: '实心' },
  { value: 'hidden', label: '隐藏' },
];

export default function Inspector() {
  const project = usePlanner((s) => s.project);
  const selection = usePlanner((s) => s.selection);

  if (!selection) {
    return <Overview />;
  }

  if (selection.kind === 'room') {
    const room = project.rooms.find((r) => r.id === selection.id);
    if (room) return <RoomInspector room={room} />;
  }
  if (selection.kind === 'opening') {
    const opening = project.openings.find((o) => o.id === selection.id);
    const room = opening ? project.rooms.find((r) => r.id === opening.roomId) : null;
    if (opening && room) return <OpeningInspector opening={opening} room={room} />;
  }
  if (selection.kind === 'furniture') {
    const item = project.furniture.find((f) => f.id === selection.id);
    if (item) return <FurnitureInspector id={item.id} />;
  }

  return <Overview />;
}

function Overview() {
  const project = usePlanner((s) => s.project);
  const wallMode = usePlanner((s) => s.wallMode);
  const setWallMode = usePlanner((s) => s.setWallMode);

  const totalArea = project.rooms.reduce((sum, r) => sum + r.w * r.d, 0);
  const doorCount = project.openings.filter((o) => o.kind === 'door').length;
  const windowCount = project.openings.filter((o) => o.kind === 'window').length;

  return (
    <aside className="right-panel">
      <div className="panel-scroll inspector">
        <div className="inspector-overline">项目概览</div>
        <h2 className="inspector-title">{project.name}</h2>

        <div className="overview-hero">
          <div className="hero-number-row">
            <span className="hero-number">{fmt(totalArea, 1)}</span>
            <span className="hero-unit">m²</span>
          </div>
          <div className="hero-label">总室内面积</div>
          <div className="hero-meta">
            {project.rooms.length} 个房间 · {project.furniture.length} 件家具
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value">{project.rooms.length}</span>
            <span className="stat-label">房间</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{project.furniture.length}</span>
            <span className="stat-label">家具</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {doorCount}
              <span className="stat-divider">/</span>
              {windowCount}
            </span>
            <span className="stat-label">门 / 窗</span>
          </div>
        </div>

        <Section title="3D 墙体">
          <div className="segmented full mini">
            {WALL_MODES.map((m) => (
              <button
                key={m.value}
                className={wallMode === m.value ? 'active' : ''}
                onClick={() => setWallMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="hint">半透明模式便于观察室内家具布置。</p>
        </Section>

        <Section title="快速上手">
          <ol className="tips-list">
            <li>
              <span className="tip-index">1</span>
              添加房间，拖动边缘或角点调整尺寸。
            </li>
            <li>
              <span className="tip-index">2</span>
              把房间拖到相邻位置，松手后墙体自动吸附并合并。
            </li>
            <li>
              <span className="tip-index">3</span>
              点击「门 / 窗」后点墙体开洞，可继续拖动调整位置。
            </li>
            <li>
              <span className="tip-index">4</span>
              从家具库添加家具，拖动摆放，右侧可调尺寸、旋转与换色。
            </li>
          </ol>
        </Section>

        <div className="inspector-footnote">所有修改都会自动保存在浏览器本地，也可以随时导出 JSON 备份。</div>
      </div>
    </aside>
  );
}

function RoomInspector({ room }: { room: Room }) {
  const updateRoom = usePlanner((s) => s.updateRoom);
  const deleteRoom = usePlanner((s) => s.deleteRoom);
  const setTool = usePlanner((s) => s.setTool);
  const notify = usePlanner((s) => s.notify);

  const startTool = (tool: 'door' | 'window') => {
    setTool(tool);
    notify(
      tool === 'door'
        ? '点击墙体放置门 · 拖动门可沿墙移动 · Esc 退出'
        : '点击墙体放置窗 · 拖动窗可沿墙移动 · Esc 退出',
    );
  };

  return (
    <aside className="right-panel">
      <div className="panel-scroll inspector">
        <div className="inspector-head">
          <span
            className="inspector-avatar"
            style={{ background: withAlpha(room.floorColor, 0.65) }}
          >
            <RoomIcon size={20} />
          </span>
          <div className="inspector-head-text">
            <div className="inspector-overline">房间</div>
            <h2 className="inspector-title">{room.name}</h2>
          </div>
        </div>

        <div className="metric-strip">
          <div>
            <span className="metric-value">{fmt(room.w * room.d, 1)}</span>
            <span className="metric-unit"> m²</span>
          </div>
          <span className="metric-caption">地面面积</span>
        </div>

        <Section title="基本信息">
          <TextField label="名称" value={room.name} onChange={(v) => updateRoom(room.id, { name: v }, true)} />
          <div className="field-grid">
            <NumField
              label="宽度"
              value={room.w}
              min={1}
              max={40}
              step={0.1}
              onChange={(v, t) => updateRoom(room.id, { w: v }, t)}
            />
            <NumField
              label="进深"
              value={room.d}
              min={1}
              max={40}
              step={0.1}
              onChange={(v, t) => updateRoom(room.id, { d: v }, t)}
            />
          </div>
          <div className="field-grid">
            <NumField
              label="层高"
              value={room.height}
              min={2}
              max={5}
              step={0.05}
              onChange={(v, t) => updateRoom(room.id, { height: v }, t)}
            />
            <NumField
              label="墙厚"
              value={room.wallThickness}
              min={0.05}
              max={0.4}
              step={0.01}
              onChange={(v, t) => updateRoom(room.id, { wallThickness: v }, t)}
            />
          </div>
        </Section>

        <Section title="配色">
          <SwatchRow
            label="地板"
            colors={FLOOR_COLORS}
            value={room.floorColor}
            onChange={(color) => {
              if (color !== room.floorColor) updateRoom(room.id, { floorColor: color });
            }}
          />
          <SwatchRow
            label="墙面"
            colors={WALL_COLORS}
            value={room.wallColor}
            onChange={(color) => {
              if (color !== room.wallColor) updateRoom(room.id, { wallColor: color });
            }}
          />
        </Section>

        <Section title="门窗">
          <div className="action-row">
            <button className="btn soft" onClick={() => startTool('door')}>
              <DoorIcon size={16} />
              添加门
            </button>
            <button className="btn soft" onClick={() => startTool('window')}>
              <WindowIcon size={16} />
              添加窗
            </button>
          </div>
          <p className="hint">
            点击平面图中的墙体放置。如果这堵墙与相邻房间重合，开洞会同时打通两侧。
          </p>
        </Section>

        <div className="danger-zone">
          <button className="btn danger full" onClick={() => deleteRoom(room.id)}>
            <TrashIcon size={16} />
            删除房间
          </button>
        </div>
      </div>
    </aside>
  );
}

function OpeningInspector({ opening, room }: { opening: import('../types').Opening; room: Room }) {
  const updateOpening = usePlanner((s) => s.updateOpening);
  const deleteOpening = usePlanner((s) => s.deleteOpening);
  const len = wallLength(room, opening.side);
  const minOffset = opening.width / 2 + 0.03;
  const maxOffset = Math.max(minOffset, len - opening.width / 2 - 0.03);
  const maxWidth = Math.max(0.3, len - 0.1);
  const maxHeight = room.height;

  return (
    <aside className="right-panel">
      <div className="panel-scroll inspector">
        <div className="inspector-head">
          <span className="inspector-avatar opening-avatar">
            {opening.kind === 'window' ? <WindowIcon size={20} /> : <DoorIcon size={20} />}
          </span>
          <div className="inspector-head-text">
            <div className="inspector-overline">{KIND_LABELS[opening.kind]}</div>
            <h2 className="inspector-title">
              {opening.kind === 'window' ? '窗户' : opening.kind === 'door' ? '门' : '垭口'}
            </h2>
          </div>
          <span className="kind-chip">{room.name}</span>
        </div>

        <div className="metric-strip">
          <div>
            <span className="metric-value">{fmt(opening.width)}</span>
            <span className="metric-unit"> × {fmt(opening.height)} m</span>
          </div>
          <span className="metric-caption">洞口尺寸</span>
        </div>

        <Section title="所在墙面">
          <div className="segmented full wall-side-segmented">
            {WALL_LABELS.map((w) => (
              <button
                key={w.value}
                className={opening.side === w.value ? 'active' : ''}
                onClick={() => {
                  if (opening.side !== w.value) updateOpening(opening.id, { side: w.value });
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="尺寸">
          <div className="field-grid">
            <NumField
              label="宽度"
              value={opening.width}
              min={0.3}
              max={maxWidth}
              step={0.05}
              onChange={(v, t) => updateOpening(opening.id, { width: v }, t)}
            />
            <NumField
              label="高度"
              value={opening.height}
              min={0.5}
              max={maxHeight}
              step={0.05}
              onChange={(v, t) => updateOpening(opening.id, { height: v }, t)}
            />
          </div>
          {opening.kind === 'window' && (
            <NumField
              label="窗台高度"
              value={opening.sill}
              min={0}
              max={Math.max(0, room.height - opening.height)}
              step={0.05}
              onChange={(v, t) => updateOpening(opening.id, { sill: v }, t)}
            />
          )}

          <div className="range-field">
            <div className="range-head">
              <span>沿墙位置</span>
              <span className="range-value">{fmt(opening.offset)} m</span>
            </div>
            <input
              type="range"
              min={minOffset}
              max={maxOffset}
              step={0.01}
              value={clamp(opening.offset, minOffset, maxOffset)}
              onFocus={() => usePlanner.getState().checkpoint()}
              onPointerDown={() => usePlanner.getState().checkpoint()}
              onChange={(e) =>
                updateOpening(opening.id, { offset: Number.parseFloat(e.target.value) }, true)
              }
            />
          </div>

          <p className="hint">也可以直接在平面图中拖动门 / 窗，沿墙移动更直观。</p>
        </Section>

        <div className="danger-zone">
          <button className="btn danger full" onClick={() => deleteOpening(opening.id)}>
            <TrashIcon size={16} />
            删除{KIND_LABELS[opening.kind]}
          </button>
        </div>
      </div>
    </aside>
  );
}

function FurnitureInspector({ id }: { id: string }) {
  const project = usePlanner((s) => s.project);
  const item = project.furniture.find((f) => f.id === id);
  const updateFurniture = usePlanner((s) => s.updateFurniture);
  const rotateFurniture = usePlanner((s) => s.rotateFurniture);
  const duplicateFurniture = usePlanner((s) => s.duplicateFurniture);
  const deleteFurniture = usePlanner((s) => s.deleteFurniture);

  if (!item) return <Overview />;
  const def = getDef(item.type);
  const size = getFurnitureSize(item);
  const color = item.color ?? def.color;
  const room = item.roomId ? project.rooms.find((r) => r.id === item.roomId) : null;
  const isCustomColor = Boolean(item.color);
  const isResized =
    Boolean(item.size) &&
    (Math.abs(size.w - def.w) > 0.001 ||
      Math.abs(size.d - def.d) > 0.001 ||
      Math.abs(size.h - def.h) > 0.001);
  const setSize = (key: 'w' | 'd' | 'h', value: number, transient: boolean) => {
    updateFurniture(item.id, { size: { ...size, [key]: value } }, transient);
  };

  return (
    <aside className="right-panel">
      <div className="panel-scroll inspector">
        <div className="inspector-head">
          <span
            className="inspector-avatar emoji-avatar"
            style={{ background: withAlpha(color, 0.18) }}
          >
            {def.emoji}
          </span>
          <div className="inspector-head-text">
            <div className="inspector-overline">{def.category}</div>
            <h2 className="inspector-title">{def.name}</h2>
          </div>
          <span className="kind-chip">{room ? room.name : '自由摆放'}</span>
        </div>

        <div className="dim-chips">
          <span>{fmt(size.w)} m 宽</span>
          <span>{fmt(size.d)} m 深</span>
          <span>{fmt(size.h)} m 高</span>
        </div>

        <Section
          title="尺寸"
          aside={
            isResized ? (
              <button
                className="link-btn"
                onClick={() => updateFurniture(item.id, { size: undefined })}
              >
                恢复默认
              </button>
            ) : undefined
          }
        >
          <div className="field-grid">
            <NumField
              label="宽度"
              value={size.w}
              min={FURNITURE_SIZE_MIN.w}
              max={FURNITURE_SIZE_MAX.w}
              step={0.05}
              onChange={(v, t) => setSize('w', v, t)}
            />
            <NumField
              label="深度"
              value={size.d}
              min={FURNITURE_SIZE_MIN.d}
              max={FURNITURE_SIZE_MAX.d}
              step={0.05}
              onChange={(v, t) => setSize('d', v, t)}
            />
          </div>
          <NumField
            label="高度"
            value={size.h}
            min={FURNITURE_SIZE_MIN.h}
            max={FURNITURE_SIZE_MAX.h}
            step={0.05}
            onChange={(v, t) => setSize('h', v, t)}
          />
          <p className="hint">
            也可以在平面图中拖动选中家具四角的方块直接缩放，按住 Shift 保持宽深比例。
          </p>
        </Section>

        <Section title="朝向">
          <div className="rotation-row">
            <div className="rotation-value">
              <RotateIcon size={18} />
              <span>{Math.round(item.rotation)}°</span>
            </div>
            <div className="rotation-actions">
              <button
                className="btn tiny"
                onClick={() => rotateFurniture(item.id, -15)}
                title="逆时针旋转 15°"
              >
                −15°
              </button>
              <button
                className="btn tiny"
                onClick={() => rotateFurniture(item.id, 15)}
                title="顺时针旋转 15°"
              >
                +15°
              </button>
              <button
                className="btn tiny"
                onClick={() => rotateFurniture(item.id, 90)}
                title="顺时针旋转 90°"
              >
                +90°
              </button>
            </div>
          </div>
          <NumField
            label="角度"
            value={item.rotation}
            min={0}
            max={359}
            step={5}
            unit="°"
            onChange={(v, t) => updateFurniture(item.id, { rotation: v }, t)}
          />
          <p className="hint">在平面图拖动家具上方的圆点可以自由旋转，按 R 每次旋转 15°。</p>
        </Section>

        <Section
          title="颜色"
          aside={
            isCustomColor ? (
              <button
                className="link-btn"
                onClick={() => updateFurniture(item.id, { color: undefined })}
              >
                恢复默认
              </button>
            ) : undefined
          }
        >
          <div className="color-grid">
            <button
              className={`color-chip default${!isCustomColor ? ' active' : ''}`}
              onClick={() => updateFurniture(item.id, { color: undefined })}
              title="默认颜色"
            >
              <span style={{ background: def.color }} />
              默认
            </button>
            {FURNITURE_COLORS.filter((c) => c !== def.color).map((c) => (
              <button
                key={c}
                className={`color-chip${item.color === c ? ' active' : ''}`}
                onClick={() => updateFurniture(item.id, { color: c })}
                title={c}
                style={{ background: c }}
              />
            ))}
            <label className="color-chip custom-color" title="自定义颜色">
              <input
                type="color"
                value={color}
                onFocus={() => usePlanner.getState().checkpoint()}
                onChange={(e) => updateFurniture(item.id, { color: e.target.value }, true)}
              />
              <span>+</span>
            </label>
          </div>
        </Section>

        <Section title="操作">
          <div className="action-row">
            <button className="btn soft" onClick={() => duplicateFurniture(item.id)}>
              <CopyIcon size={16} />
              复制
            </button>
            <button className="btn danger" onClick={() => deleteFurniture(item.id)}>
              <TrashIcon size={16} />
              删除
            </button>
          </div>
        </Section>
      </div>
    </aside>
  );
}
