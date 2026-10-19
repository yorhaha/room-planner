import { Grid, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { buildWalls, projectBounds } from '../geometry';
import { usePlanner } from '../store';
import type { Project, Room, WallMode } from '../types';
import Furniture3D from './Furniture3D';
import Openings3D from './Openings3D';
import Walls3D from './Walls3D';
import { CubeIcon, FitIcon, PlanIcon } from './icons';

type Vec3 = [number, number, number];

function computeView(project: Project): {
  position: Vec3;
  target: Vec3;
  center: Vec3;
  extent: number;
} {
  const b = projectBounds(project);
  const extent = Math.max(b.w, b.d, 6.4);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  return {
    position: [cx + extent * 0.6, extent * 0.95 + 2.4, cz + extent * 0.82],
    target: [cx, 0.45, cz],
    center: [cx, 0, cz],
    extent,
  };
}

function CameraRig({
  getView,
  resetSignal,
  controls,
}: {
  getView: () => ReturnType<typeof computeView>;
  resetSignal: number;
  controls: MutableRefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const view = getView();
    camera.position.set(...view.position);
    camera.lookAt(view.target[0], view.target[1], view.target[2]);
    camera.updateProjectionMatrix();
    const c = controls.current;
    if (c) {
      c.target.set(...view.target);
      c.update();
    }
  }, [camera, controls, getView, resetSignal]);

  return null;
}

function Sun({ center, extent }: { center: Vec3; extent: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    target.position.set(center[0], 0, center[2]);
    target.updateMatrixWorld();
    if (lightRef.current) {
      lightRef.current.target = target;
      lightRef.current.target.updateMatrixWorld();
    }
  }, [center, target]);

  const s = extent * 1.25 + 2;

  return (
    <group>
      <primitive object={target} />
      <directionalLight
        ref={lightRef}
        target={target}
        position={[center[0] + extent * 0.7, extent * 1.15 + 4.5, center[2] + extent * 0.8]}
        intensity={1.5}
        color="#fff6e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-s}
        shadow-camera-right={s}
        shadow-camera-top={s}
        shadow-camera-bottom={-s}
        shadow-camera-near={0.5}
        shadow-camera-far={extent * 5 + 20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={[center[0] - extent * 1.2, extent * 0.7 + 2, center[2] - extent * 0.6]}
        intensity={0.25}
        color="#dfe8ee"
      />
    </group>
  );
}

function SelectedOutline({ room }: { room: Room }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const y = 0.014;
    const points = [
      room.x,
      y,
      room.z,
      room.x + room.w,
      y,
      room.z,
      room.x + room.w,
      y,
      room.z + room.d,
      room.x,
      y,
      room.z + room.d,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [room.x, room.z, room.w, room.d]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="#b2653f" transparent opacity={0.9} />
    </lineLoop>
  );
}

function Scene({ project }: { project: Project }) {
  const wallMode = usePlanner((s) => s.wallMode);
  const selection = usePlanner((s) => s.selection);
  const walls = useMemo(() => buildWalls(project), [project]);
  const view = useMemo(() => computeView(project), [project]);

  const selectedRoom =
    selection?.kind === 'room' ? project.rooms.find((r) => r.id === selection.id) ?? null : null;

  return (
    <>
      <color attach="background" args={['#e8e2d7']} />
      <fog attach="fog" args={['#e8e2d7', view.extent * 3.2, view.extent * 8 + 30]} />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#fffaf0', '#7d7464', 0.38]} />
      <Sun center={view.center} extent={view.extent} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[view.center[0], -0.095, view.center[2]]}
        receiveShadow
      >
        <planeGeometry args={[view.extent * 10 + 40, view.extent * 10 + 40]} />
        <meshStandardMaterial color="#e6dfd2" roughness={1} />
      </mesh>

      <Grid
        position={[view.center[0], -0.075, view.center[2]]}
        args={[view.extent * 8, view.extent * 8]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor="#cfc6b6"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#bcb19d"
        fadeDistance={view.extent * 4.5 + 25}
        fadeStrength={1.2}
        infiniteGrid
      />

      {project.rooms.map((room) => (
        <mesh
          key={room.id}
          position={[room.x + room.w / 2, -0.045, room.z + room.d / 2]}
          receiveShadow
        >
          <boxGeometry args={[room.w, 0.09, room.d]} />
          <meshStandardMaterial color={room.floorColor} roughness={0.9} />
        </mesh>
      ))}

      {selectedRoom && <SelectedOutline room={selectedRoom} />}

      <Walls3D walls={walls} mode={wallMode} />
      <Openings3D project={project} />
      {project.furniture.map((item) => (
        <Furniture3D key={item.id} item={item} />
      ))}
    </>
  );
}

const WALL_MODES: Array<{ value: WallMode; label: string }> = [
  { value: 'ghost', label: '半透明' },
  { value: 'solid', label: '实心' },
  { value: 'hidden', label: '隐藏' },
];

export default function View3D() {
  const project = usePlanner((s) => s.project);
  const wallMode = usePlanner((s) => s.wallMode);
  const setWallMode = usePlanner((s) => s.setWallMode);
  const setView = usePlanner((s) => s.setView);
  const epoch = usePlanner((s) => s.epoch);
  const controlsRef = useRef<any>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const initialView = useMemo(() => computeView(usePlanner.getState().project), []);
  const extent = useMemo(() => computeView(project).extent, [project]);
  const getView = useCallback(() => computeView(usePlanner.getState().project), []);

  return (
    <div className="view3d">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: initialView.position,
          fov: 40,
          near: 0.1,
          far: 200,
        }}
        gl={{ antialias: true }}
        onPointerMissed={() => usePlanner.getState().select(null)}
      >
        <Scene project={project} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={initialView.target}
          minDistance={2}
          maxDistance={Math.max(30, extent * 5)}
          maxPolarAngle={Math.PI / 2 - 0.035}
          minPolarAngle={0.16}
        />
        <CameraRig
          getView={getView}
          resetSignal={resetSignal + epoch}
          controls={controlsRef}
        />
      </Canvas>

      <div className="view3d-top">
        <div className="scene-badge glass">
          <CubeIcon size={16} />
          <span>3D 实时预览</span>
        </div>
        <button
          className="scene-reset glass"
          onClick={() => setResetSignal((n) => n + 1)}
          title="重置视角"
        >
          <FitIcon size={16} />
          <span>重置视角</span>
        </button>
      </div>

      <div className="wall-control glass">
        <span className="wall-control-label">墙体</span>
        <div className="segmented mini">
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
      </div>

      <div className="view3d-hint glass">拖拽旋转 · 滚轮缩放 · 右键平移 · Esc 取消选择</div>

      {project.rooms.length === 0 && (
        <div className="view3d-empty">
          <div className="empty-card glass">
            <div className="empty-icon">
              <CubeIcon size={26} />
            </div>
            <h2>还没有可以预览的房间</h2>
            <p>先在平面视图里创建房间，3D 场景会实时同步。</p>
            <button className="btn btn-primary" onClick={() => setView('2d')}>
              <PlanIcon size={16} />
              前往平面编辑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
