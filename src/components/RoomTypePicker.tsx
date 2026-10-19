import { useEffect, useState } from 'react';
import { ROOM_TYPES } from '../roomTypes';
import { usePlanner } from '../store';
import { CloseIcon, RoomIcon } from './icons';

export default function RoomTypePicker() {
  const open = usePlanner((s) => s.roomPickerOpen);
  const close = usePlanner((s) => s.closeRoomPicker);
  const addRoom = usePlanner((s) => s.addRoom);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!open) setCustomName('');
  }, [open]);

  if (!open) return null;

  const createCustom = () => {
    const name = customName.trim();
    if (!name) return;
    addRoom({ name });
  };

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="room-type-modal" role="dialog" aria-modal="true" aria-label="选择房间类型">
        <div className="room-type-head">
          <div className="room-type-heading">
            <div className="inspector-overline">添加房间</div>
            <h2>选择房间类型</h2>
            <p>会自动带出常见尺寸；创建后仍可拖动、缩放和重命名。</p>
          </div>
          <button className="icon-btn" onClick={close} title="关闭" aria-label="关闭">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="room-type-grid">
          {ROOM_TYPES.map((type) => (
            <button
              key={type.key}
              className="room-type-card"
              onClick={() => addRoom({ name: type.name, w: type.w, d: type.d })}
              title={`添加${type.name}（${type.w} × ${type.d} m）`}
            >
              <span className="room-type-emoji">{type.emoji}</span>
              <span className="room-type-info">
                <strong>{type.name}</strong>
                <span>{type.hint}</span>
                <em>
                  {type.w} × {type.d} m
                </em>
              </span>
            </button>
          ))}
        </div>

        <div className="room-type-foot">
          <label className="room-type-custom">
            <span>自定义</span>
            <input
              value={customName}
              maxLength={20}
              spellCheck={false}
              placeholder="输入房间名称，例如：茶室、健身房"
              aria-label="自定义房间名称"
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createCustom();
              }}
            />
          </label>
          <button className="btn" onClick={createCustom} disabled={!customName.trim()}>
            <RoomIcon size={16} />
            创建房间
          </button>
        </div>
      </div>
    </div>
  );
}
