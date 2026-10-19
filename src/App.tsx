import { lazy, Suspense, useEffect } from 'react';
import Inspector from './components/Inspector';
import LeftPanel from './components/LeftPanel';
import PlanEditor from './components/PlanEditor';
import RoomTypePicker from './components/RoomTypePicker';
import TopBar from './components/TopBar';
import {
  CloseIcon,
  CubeIcon,
  HelpIcon,
  LogoMark,
  PlanIcon,
} from './components/icons';
import { usePlanner } from './store';

const View3D = lazy(() => import('./components/View3D'));

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

function StatusBar() {
  const view = usePlanner((s) => s.view);
  const tool = usePlanner((s) => s.tool);
  const project = usePlanner((s) => s.project);

  return (
    <footer className="statusbar">
      <div className="status-hints">
        {view === '2d' ? (
          tool === 'select' ? (
            <>
              <span><kbd>空格</kbd> + 拖拽 平移</span>
              <span><kbd>滚轮</kbd> 缩放</span>
              <span><kbd>R</kbd> 旋转家具</span>
              <span><kbd>⌘Z</kbd> 撤销</span>
              <span><kbd>1</kbd>/<kbd>2</kbd> 切换视图</span>
            </>
          ) : (
            <span className="status-accent">
              点击墙体放置{tool === 'door' ? '门' : '窗'} · <kbd>Esc</kbd> 退出
            </span>
          )
        ) : (
          <>
            <span>拖拽旋转视角</span>
            <span><kbd>滚轮</kbd> 缩放</span>
            <span>右键拖拽平移</span>
            <span><kbd>1</kbd> 返回平面</span>
          </>
        )}
      </div>
      <div className="status-meta">
        <span>{project.rooms.length} 房间</span>
        <span className="status-dot" />
        <span>{project.furniture.length} 家具</span>
        <span className="status-dot" />
        <span>{project.openings.length} 门窗</span>
        <span className="status-dot" />
        <span className="status-brand">栖居 Roomly 1.0</span>
      </div>
    </footer>
  );
}

function HelpModal() {
  const setHelpOpen = usePlanner((s) => s.setHelpOpen);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setHelpOpen(false);
      }}
    >
      <div className="help-modal" role="dialog" aria-modal="true" aria-label="使用说明">
        <div className="help-head">
          <div className="help-brand">
            <LogoMark size={34} />
            <div>
              <h2>栖居 Roomly</h2>
              <p>轻量、好看、可自动保存的房间规划工具</p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setHelpOpen(false)} title="关闭">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="help-body">
          <section>
            <h3>四步完成规划</h3>
            <div className="help-steps">
              <div>
                <span>01</span>
                <strong>建房间</strong>
                <p>点击「房间」添加，先选择房间类型，拖边缘或角点调整尺寸。</p>
              </div>
              <div>
                <span>02</span>
                <strong>连接空间</strong>
                <p>拖着房间靠近其他房间，边缘会自动吸附，重合的墙合并为一堵。</p>
              </div>
              <div>
                <span>03</span>
                <strong>开门窗、放家具</strong>
                <p>选择「门 / 窗」后点墙体开洞；门可切换内开 / 外开与铰链侧，家具拖角可缩放。</p>
              </div>
              <div>
                <span>04</span>
                <strong>3D 预览</strong>
                <p>右上角切换到 3D，可旋转观察；墙体支持半透明 / 隐藏。</p>
              </div>
            </div>
          </section>

          <section>
            <h3>快捷键</h3>
            <div className="shortcut-grid">
              <div><kbd>V</kbd><span>选择工具</span></div>
              <div><kbd>D</kbd><span>添加门</span></div>
              <div><kbd>W</kbd><span>添加窗</span></div>
              <div><kbd>R</kbd><span>旋转家具 15°</span></div>
              <div><kbd>⇧ + R</kbd><span>反向旋转 15°</span></div>
              <div><kbd>⇧ + 方向键</kbd><span>较大步长移动</span></div>
              <div><kbd>⌫</kbd><span>删除选中对象</span></div>
              <div><kbd>⌘/Ctrl</kbd><span>+ Z 撤销</span></div>
              <div><kbd>⇧⌘Z</kbd><span>重做</span></div>
              <div><kbd>⌘/Ctrl</kbd><span>+ D 复制家具</span></div>
              <div><kbd>1</kbd><span>平面视图</span></div>
              <div><kbd>2</kbd><span>3D 预览</span></div>
              <div><kbd>F</kbd><span>适应平面视图</span></div>
              <div><kbd>空格</kbd><span>按住拖动画布</span></div>
              <div><kbd>Esc</kbd><span>取消选择 / 退出工具</span></div>
            </div>
          </section>

          <section className="help-notes">
            <h3>关于保存</h3>
            <p>
              所有改动会在约半秒内自动保存到浏览器本地（localStorage）。同一浏览器重新打开即可继续编辑；
              换设备或清理浏览器数据前，请使用顶栏「导出」保存 JSON 备份。
            </p>
            <div className="help-feature-row">
              <span><PlanIcon size={15} /> 平面编辑</span>
              <span><CubeIcon size={15} /> 实时 3D</span>
              <span><HelpIcon size={15} /> 尺寸与吸附</span>
            </div>
          </section>
        </div>

        <div className="help-foot">
          <span>提示：所有操作都可以用 ⌘Z 撤销，不用担心试错。</span>
          <button className="btn btn-primary" onClick={() => setHelpOpen(false)}>
            开始规划
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast() {
  const toast = usePlanner((s) => s.toast);
  const dismiss = usePlanner((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismiss(), 3200);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      {toast.message}
    </div>
  );
}

export default function App() {
  const view = usePlanner((s) => s.view);
  const helpOpen = usePlanner((s) => s.helpOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = usePlanner.getState();
      if (e.key === 'Escape' && state.roomPickerOpen) {
        e.preventDefault();
        state.closeRoomPicker();
        return;
      }
      if (isEditableTarget(e.target) || state.roomPickerOpen) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        state.redo();
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        if (state.selection?.kind === 'furniture') {
          state.duplicateFurniture(state.selection.id);
        }
        return;
      }
      if (key === 'escape') {
        if (state.helpOpen) {
          state.setHelpOpen(false);
          return;
        }
        state.setTool('select');
        state.select(null);
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        if (state.selection) {
          e.preventDefault();
          state.deleteSelection();
        }
        return;
      }
      if (!mod && key === '1') {
        state.setView('2d');
        return;
      }
      if (!mod && key === '2') {
        state.setView('3d');
        return;
      }
      if (!mod && key === 'v') {
        state.setTool('select');
        return;
      }
      if (!mod && key === 'd') {
        state.setTool('door');
        return;
      }
      if (!mod && key === 'w') {
        state.setTool('window');
        return;
      }
      if (!mod && key === 'r') {
        if (state.selection?.kind === 'furniture') {
          e.preventDefault();
          state.rotateFurniture(state.selection.id, e.shiftKey ? -15 : 15);
        }
        return;
      }
      if (key.startsWith('arrow') && state.selection) {
        e.preventDefault();
        const step = e.shiftKey ? 0.25 : 0.05;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dz = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        const sel = state.selection;
        if (sel.kind === 'furniture') {
          const item = state.project.furniture.find((f) => f.id === sel.id);
          if (item) {
            state.updateFurniture(sel.id, { x: item.x + dx, z: item.z + dz });
          }
        } else if (sel.kind === 'opening') {
          const op = state.project.openings.find((o) => o.id === sel.id);
          if (op) {
            const room = state.project.rooms.find((r) => r.id === op.roomId);
            const delta = dx !== 0 ? dx : dz;
            if (room) {
              state.updateOpening(
                sel.id,
                { offset: op.offset + delta },
                false,
              );
            }
          }
        } else if (sel.kind === 'room') {
          const room = state.project.rooms.find((r) => r.id === sel.id);
          if (room) {
            state.moveRoom(sel.id, room.x + dx, room.z + dz);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <LeftPanel />
        <main className="canvas-area">
          {view === '2d' ? (
            <PlanEditor />
          ) : (
            <Suspense
              fallback={
                <div className="view3d-loading">
                  <span className="loading-dot" />
                  正在准备 3D 场景…
                </div>
              }
            >
              <View3D />
            </Suspense>
          )}
        </main>
        <Inspector />
      </div>
      <StatusBar />
      <Toast />
      {helpOpen && <HelpModal />}
      <RoomTypePicker />
    </div>
  );
}
