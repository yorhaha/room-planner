import { useState } from 'react';
import { CATEGORIES, FURNITURE, withAlpha } from '../catalog';
import type { Category } from '../catalog';
import { fmt } from '../geometry';
import { usePlanner } from '../store';
import {
  ChevronRightIcon,
  PlusIcon,
  RoomIcon,
} from './icons';

const ALL = '全部' as const;
type Filter = typeof ALL | Category;

const FURNITURE_LIST = Object.values(FURNITURE);

export default function LeftPanel() {
  const project = usePlanner((s) => s.project);
  const selection = usePlanner((s) => s.selection);
  const openRoomPicker = usePlanner((s) => s.openRoomPicker);
  const addFurniture = usePlanner((s) => s.addFurniture);
  const select = usePlanner((s) => s.select);
  const [filter, setFilter] = useState<Filter>(ALL);

  const items = filter === ALL ? FURNITURE_LIST : FURNITURE_LIST.filter((f) => f.category === filter);
  const selectedRoomId = selection?.kind === 'room' ? selection.id : null;

  return (
    <aside className="left-panel">
      <div className="panel-scroll">
        <section className="panel-section">
          <div className="section-head">
            <div className="section-title">
              <h3>户型</h3>
              <span className="section-count">{project.rooms.length}</span>
            </div>
            <button className="mini-icon-btn" onClick={openRoomPicker} title="添加房间">
              <PlusIcon size={15} />
            </button>
          </div>

          <div className="room-list">
            {project.rooms.map((room) => {
              const active = selectedRoomId === room.id;
              const furnitureCount = project.furniture.filter((f) => f.roomId === room.id).length;
              return (
                <button
                  key={room.id}
                  className={`room-row${active ? ' active' : ''}`}
                  onClick={() => select({ kind: 'room', id: room.id })}
                >
                  <span className="room-swatch" style={{ background: room.floorColor }}>
                    <RoomIcon size={12} />
                  </span>
                  <span className="room-info">
                    <span className="room-row-name">{room.name}</span>
                    <span className="room-row-meta">
                      {fmt(room.w)} × {fmt(room.d)} m · {fmt(room.w * room.d, 1)} m²
                      {furnitureCount > 0 ? ` · ${furnitureCount} 件家具` : ''}
                    </span>
                  </span>
                  <ChevronRightIcon size={14} />
                </button>
              );
            })}

            {project.rooms.length === 0 && (
              <button className="room-row-empty" onClick={openRoomPicker}>
                <PlusIcon size={15} />
                <span>添加第一个房间</span>
              </button>
            )}
          </div>
        </section>

        <div className="panel-divider" />

        <section className="panel-section furniture-section">
          <div className="section-head">
            <div className="section-title">
              <h3>家具库</h3>
              <span className="section-count">{items.length}</span>
            </div>
            <span className="section-note">点击添加</span>
          </div>

          <div className="filter-chips">
            {([ALL, ...CATEGORIES] as Filter[]).map((c) => (
              <button
                key={c}
                className={`filter-chip${filter === c ? ' active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="furniture-grid">
            {items.map((def) => (
              <button
                key={def.type}
                className="furniture-card"
                onClick={() => addFurniture(def.type)}
                title={`添加「${def.name}」`}
              >
                <span
                  className="furniture-emoji"
                  style={{ background: withAlpha(def.color, 0.16), color: def.color }}
                >
                  {def.emoji}
                </span>
                <span className="furniture-info">
                  <span className="furniture-name">{def.name}</span>
                  <span className="furniture-dims">
                    {def.w} × {def.d} m
                  </span>
                </span>
                <span className="furniture-add">
                  <PlusIcon size={12} />
                </span>
              </button>
            ))}
          </div>

          <p className="panel-hint">家具会放入当前选中的房间，可拖动、缩放、旋转与换色。</p>
        </section>
      </div>
    </aside>
  );
}
