import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_DOOR_COLOR } from '../catalog';
import { openingTransform } from '../geometry';
import { usePlanner } from '../store';
import type { Opening, Project, Room } from '../types';

const FRAME_LIGHT = '#efeae0';
const METAL = '#b6b2a8';

function DoorLeaf({
  width,
  height,
  inwardLocal,
  swing,
  hinge,
  color,
}: {
  width: number;
  height: number;
  inwardLocal: 1 | -1;
  swing: 'in' | 'out';
  hinge: 'start' | 'end';
  color: string;
}) {
  const hingeSign = hinge === 'end' ? -1 : 1;
  const swingSign = swing === 'out' ? -1 : 1;
  const beta = (-inwardLocal * hingeSign * swingSign * 45 * Math.PI) / 180;
  const base = hinge === 'end' ? Math.PI : 0;
  return (
    <group
      position={[hingeSign * (width / 2 - 0.06), 0.008, 0]}
      rotation={[0, base + beta, 0]}
    >
      <RoundedBox
        args={[width - 0.12, height - 0.06, 0.045]}
        radius={0.012}
        smoothness={2}
        position={[(width - 0.12) / 2, (height - 0.06) / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
      </RoundedBox>
      <mesh position={[width - 0.23, height * 0.47, 0.045]} castShadow>
        <sphereGeometry args={[0.025, 16, 12]} />
        <meshStandardMaterial color={METAL} roughness={0.25} metalness={0.75} />
      </mesh>
      <mesh position={[width - 0.23, height * 0.47, -0.045]} castShadow>
        <sphereGeometry args={[0.025, 16, 12]} />
        <meshStandardMaterial color={METAL} roughness={0.25} metalness={0.75} />
      </mesh>
    </group>
  );
}

function SlidingLeaves({
  width,
  height,
  inwardLocal,
  double,
  color,
}: {
  width: number;
  height: number;
  inwardLocal: 1 | -1;
  double: boolean;
  color: string;
}) {
  const panelH = height - 0.06;
  const panelW = double ? width / 2 + 0.06 : width - 0.01;
  const handleInset = Math.min(0.09, Math.max(0.02, panelW / 2 - 0.03));
  const leaves = double
    ? [
        { x: -width / 4 + 0.03, z: inwardLocal * 0.034, handle: 1 },
        { x: width / 4 - 0.03, z: -inwardLocal * 0.034, handle: -1 },
      ]
    : [{ x: 0, z: inwardLocal * 0.034, handle: 1 }];

  return (
    <>
      {leaves.map((leaf, index) => (
        <group key={index} position={[leaf.x, 0, leaf.z]}>
          <RoundedBox
            args={[panelW, panelH, 0.042]}
            radius={0.012}
            smoothness={2}
            position={[0, panelH / 2, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
          </RoundedBox>
          {[-1, 1].map((face) => (
            <mesh
              key={face}
              position={[leaf.handle * (panelW / 2 - handleInset), height * 0.47, face * 0.045]}
              castShadow
            >
              <sphereGeometry args={[0.024, 16, 12]} />
              <meshStandardMaterial color={METAL} roughness={0.25} metalness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function OpeningMesh({ room, opening }: { room: Room; opening: Opening }) {
  const select = usePlanner((s) => s.select);
  const { x, z, rotationY, inwardLocal, thickness } = openingTransform(room, opening);
  const isWindow = opening.kind === 'window';
  const isSliding = opening.kind === 'door' && (opening.doorType ?? 'swing') === 'sliding';
  const depth = thickness + 0.035;
  const frameT = 0.055;
  const height = opening.height;
  const width = opening.width;
  const baseY = isWindow ? opening.sill : 0;
  const doorColor = opening.color ?? DEFAULT_DOOR_COLOR;
  const frameColor = isWindow ? FRAME_LIGHT : doorColor;
  const clearW = Math.max(0.12, width - frameT * 2);

  return (
    <group
      position={[x, baseY, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'opening', id: opening.id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh position={[-width / 2 + frameT / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameT, height, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.68} />
      </mesh>
      <mesh position={[width / 2 - frameT / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameT, height, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.68} />
      </mesh>
      <mesh position={[0, height - frameT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameT, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.68} />
      </mesh>

      {isWindow && (
        <>
          <mesh position={[0, frameT / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, frameT, depth]} />
            <meshStandardMaterial color={frameColor} roughness={0.68} />
          </mesh>
          <mesh position={[0, -0.018, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + 0.08, 0.035, depth + 0.09]} />
            <meshStandardMaterial color="#e4ded2" roughness={0.6} />
          </mesh>
          <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[width - frameT * 2, height - frameT * 2, 0.014]} />
            <meshPhysicalMaterial
              color="#b9d6dc"
              roughness={0.06}
              metalness={0}
              transparent
              opacity={0.34}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {width > 1.25 && (
            <mesh position={[0, height / 2, 0]} castShadow>
              <boxGeometry args={[0.028, height - frameT * 2, 0.035]} />
              <meshStandardMaterial color={frameColor} roughness={0.6} />
            </mesh>
          )}
          <mesh position={[0, height / 2, 0]} castShadow>
            <boxGeometry args={[width - frameT * 2, 0.022, 0.035]} />
            <meshStandardMaterial color={frameColor} roughness={0.6} />
          </mesh>
        </>
      )}

      {opening.kind === 'door' && (
        <>
          {isSliding ? (
            <>
              <mesh position={[0, 0.01, 0]} receiveShadow>
                <boxGeometry args={[clearW + 0.02, 0.02, depth + 0.07]} />
                <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.55} />
              </mesh>
              <mesh position={[0, height - frameT - 0.006, 0]} castShadow>
                <boxGeometry args={[clearW + 0.01, 0.018, depth + 0.03]} />
                <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.55} />
              </mesh>
              <SlidingLeaves
                width={clearW}
                height={height}
                inwardLocal={inwardLocal}
                double={width >= 1.3}
                color={doorColor}
              />
            </>
          ) : (
            <>
              <mesh position={[0, 0.008, 0]} receiveShadow>
                <boxGeometry args={[width, 0.016, depth + 0.02]} />
                <meshStandardMaterial color="#d9cebb" roughness={0.7} />
              </mesh>
              <DoorLeaf
                width={width}
                height={height}
                inwardLocal={inwardLocal}
                swing={opening.swing ?? 'in'}
                hinge={opening.hinge ?? 'start'}
                color={doorColor}
              />
            </>
          )}
        </>
      )}

    </group>
  );
}

export default function Openings3D({ project }: { project: Project }) {
  const roomMap = new Map(project.rooms.map((r) => [r.id, r]));
  return (
    <group>
      {project.openings.map((opening) => {
        const room = roomMap.get(opening.roomId);
        if (!room) return null;
        return <OpeningMesh key={opening.id} room={room} opening={opening} />;
      })}
    </group>
  );
}
