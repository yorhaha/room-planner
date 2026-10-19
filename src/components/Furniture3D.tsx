import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { getDef, shade } from '../catalog';
import { usePlanner } from '../store';
import type { Furniture, FurnitureType } from '../types';

type Vec3 = [number, number, number];

const WOOD = '#a87f5a';
const WOOD_DARK = '#7f6044';
const WOOD_LIGHT = '#c19a72';
const WHITE = '#f4f1ea';
const METAL = '#b7bcc0';
const DARK = '#3f4345';

interface BoxProps {
  p: Vec3;
  s: Vec3;
  c: string;
  r?: number;
  rough?: number;
  metal?: number;
  rot?: Vec3;
}

function RB({ p, s, c, r = 0.02, rough = 0.78, metal = 0, rot }: BoxProps) {
  return (
    <RoundedBox
      args={s}
      radius={Math.min(r, Math.min(s[0], s[1], s[2]) / 2.01)}
      smoothness={2}
      position={p}
      rotation={rot}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </RoundedBox>
  );
}

function Box({ p, s, c, rough = 0.8, metal = 0, rot }: BoxProps) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </mesh>
  );
}

function Cyl({
  p,
  rt,
  rb,
  h,
  c,
  seg = 24,
  rot,
  rough = 0.7,
  metal = 0,
  scale,
  emissive,
  emissiveIntensity = 0,
  open = false,
}: {
  p: Vec3;
  rt: number;
  rb: number;
  h: number;
  c: string;
  seg?: number;
  rot?: Vec3;
  rough?: number;
  metal?: number;
  scale?: Vec3;
  emissive?: string;
  emissiveIntensity?: number;
  open?: boolean;
}) {
  return (
    <mesh position={p} rotation={rot} scale={scale} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg, 1, open]} />
      <meshStandardMaterial
        color={c}
        roughness={rough}
        metalness={metal}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        side={open ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

const legPositions = (w: number, d: number, inset = 0.14): Array<[number, number]> => [
  [-w / 2 + inset, -d / 2 + inset],
  [w / 2 - inset, -d / 2 + inset],
  [-w / 2 + inset, d / 2 - inset],
  [w / 2 - inset, d / 2 - inset],
];

function Legs({
  w,
  d,
  inset = 0.14,
  h = 0.12,
  c = WOOD_DARK,
  r = 0.027,
}: {
  w: number;
  d: number;
  inset?: number;
  h?: number;
  c?: string;
  r?: number;
}) {
  return (
    <>
      {legPositions(w, d, inset).map(([x, z], i) => (
        <Cyl key={i} p={[x, h / 2, z]} rt={r} rb={r * 0.82} h={h} c={c} seg={12} />
      ))}
    </>
  );
}

interface ModelProps {
  w: number;
  d: number;
  h: number;
  color: string;
}

function Sofa({ w, d, h, color }: ModelProps) {
  const light = shade(color, 0.16);
  const dark = shade(color, -0.12);
  const arm = 0.16;
  const legH = 0.1;
  return (
    <group>
      <Legs w={w} d={d} inset={0.16} h={legH} c={WOOD_DARK} r={0.03} />
      <RB p={[0, legH + 0.14, 0]} s={[w, 0.28, d]} c={color} r={0.05} />
      <RB
        p={[0, legH + 0.33, 0.06]}
        s={[w - arm * 2 - 0.05, 0.17, d - 0.26]}
        c={light}
        r={0.05}
      />
      <RB p={[-w / 2 + arm / 2, legH + 0.31, 0]} s={[arm, 0.46, d]} c={dark} r={0.06} />
      <RB p={[w / 2 - arm / 2, legH + 0.31, 0]} s={[arm, 0.46, d]} c={dark} r={0.06} />
      <RB p={[0, legH + 0.46, -d / 2 + 0.11]} s={[w, 0.5, 0.2]} c={color} r={0.05} />
      <RB
        p={[-w / 4, legH + 0.45, -d / 2 + 0.28]}
        s={[w / 2 - arm - 0.07, 0.34, 0.16]}
        c={light}
        r={0.045}
      />
      <RB
        p={[w / 4, legH + 0.45, -d / 2 + 0.28]}
        s={[w / 2 - arm - 0.07, 0.34, 0.16]}
        c={light}
        r={0.045}
      />
      <RB
        p={[-w / 2 + 0.46, legH + 0.51, -d / 2 + 0.36]}
        s={[0.3, 0.3, 0.1]}
        c={shade(color, 0.02)}
        r={0.07}
        rot={[0.12, 0.2, 0.24]}
      />
      <RB
        p={[w / 2 - 0.46, legH + 0.51, -d / 2 + 0.36]}
        s={[0.3, 0.3, 0.1]}
        c={shade(color, -0.02)}
        r={0.07}
        rot={[0.1, -0.15, -0.2]}
      />
    </group>
  );
}

function Armchair({ w, d, color }: ModelProps) {
  const light = shade(color, 0.14);
  const dark = shade(color, -0.1);
  return (
    <group>
      <Legs w={w} d={d} inset={0.12} h={0.1} />
      <RB p={[0, 0.24, 0]} s={[w, 0.26, d]} c={color} r={0.055} />
      <RB p={[0, 0.4, 0.04]} s={[w - 0.3, 0.14, d - 0.26]} c={light} r={0.045} />
      <RB p={[-w / 2 + 0.075, 0.42, 0]} s={[0.15, 0.4, d]} c={dark} r={0.055} />
      <RB p={[w / 2 - 0.075, 0.42, 0]} s={[0.15, 0.4, d]} c={dark} r={0.055} />
      <RB p={[0, 0.51, -d / 2 + 0.1]} s={[w, 0.46, 0.18]} c={color} r={0.055} />
      <RB p={[0, 0.5, -d / 2 + 0.24]} s={[w - 0.32, 0.3, 0.13]} c={light} r={0.04} />
    </group>
  );
}

function CoffeeTable({ w, d, color }: ModelProps) {
  const top = 0.42;
  return (
    <group>
      <RB p={[0, top, 0]} s={[w, 0.055, d]} c={color} r={0.025} />
      <RB p={[0, 0.16, 0]} s={[w - 0.18, 0.025, d - 0.16]} c={shade(color, 0.08)} r={0.01} />
      {legPositions(w, d, 0.12).map(([x, z], i) => (
        <Box key={i} p={[x, top / 2 - 0.03, z]} s={[0.045, top - 0.05, 0.045]} c={shade(color, -0.12)} />
      ))}
      <RB p={[0.18, top + 0.055, 0.04]} s={[0.24, 0.035, 0.17]} c="#e8e0d2" r={0.008} />
      <RB p={[0.2, top + 0.086, 0.03]} s={[0.2, 0.025, 0.15]} c="#b4674b" r={0.008} />
      <Cyl p={[-0.18, top + 0.05, 0.02]} rt={0.09} rb={0.06} h={0.09} c="#d9cdb8" seg={24} />
    </group>
  );
}

function TvStand({ w, d, color, h }: ModelProps) {
  const legH = 0.14;
  return (
    <group>
      <Legs w={w} d={d} inset={0.13} h={legH} c={DARK} r={0.018} />
      <RB p={[0, legH + 0.22, 0]} s={[w, 0.44, d]} c={color} r={0.025} />
      <Box p={[-w / 4, legH + 0.22, d / 2 + 0.006]} s={[w / 2 - 0.05, 0.32, 0.015]} c={shade(color, -0.08)} />
      <Box p={[w / 4, legH + 0.22, d / 2 + 0.006]} s={[w / 2 - 0.05, 0.32, 0.015]} c={shade(color, -0.08)} />
      <Cyl
        p={[0, legH + 0.22, d / 2 + 0.035]}
        rt={0.012}
        rb={0.012}
        h={0.1}
        c={METAL}
        rot={[0, 0, Math.PI / 2]}
        seg={10}
      />
      <Box p={[0, legH + 0.48, 0]} s={[0.42, 0.025, 0.2]} c={DARK} />
      <Box p={[0, legH + 0.56, 0]} s={[0.055, 0.15, 0.05]} c={DARK} />
      <Box p={[0, legH + 0.78, 0]} s={[w * 0.76, 0.5, 0.03]} c={DARK} />
      <Box p={[0, legH + 0.78, 0.017]} s={[w * 0.76 - 0.045, 0.455, 0.012]} c="#14181a" rough={0.32} metal={0.15} />
      <Box p={[0, legH + 0.78, 0.024]} s={[w * 0.76 - 0.08, 0.4, 0.002]} c="#24333a" rough={0.25} metal={0.1} />
    </group>
  );
}

function Rug({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.014, 0]} s={[w, 0.022, d]} c={color} r={0.01} rough={0.98} />
      <RB p={[0, 0.028, 0]} s={[w - 0.16, 0.007, d - 0.16]} c={shade(color, 0.1)} r={0.005} rough={0.98} />
    </group>
  );
}

function Plant({ color }: ModelProps) {
  const leaves: Array<[number, number, number, number]> = [
    [-0.16, 0.72, 0.02, 0.2],
    [0.15, 0.76, 0.05, 0.22],
    [-0.06, 0.86, -0.12, 0.25],
    [0.1, 0.92, 0.14, 0.2],
    [-0.15, 0.98, -0.04, 0.18],
    [0.02, 1.04, 0.02, 0.22],
  ];
  return (
    <group>
      <Cyl p={[0, 0.16, 0]} rt={0.17} rb={0.13} h={0.32} c="#b4714f" seg={20} rough={0.9} />
      <Cyl p={[0, 0.315, 0]} rt={0.155} rb={0.155} h={0.015} c="#594434" seg={20} />
      <Cyl p={[0, 0.58, 0]} rt={0.022} rb={0.034} h={0.5} c="#6c543e" seg={8} />
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow scale={[1, 0.82, 1]}>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial
            color={shade(color, i % 2 === 0 ? 0.05 : -0.08)}
            roughness={0.82}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function FloorLamp({ color }: ModelProps) {
  return (
    <group>
      <Cyl p={[0, 0.018, 0]} rt={0.14} rb={0.14} h={0.035} c={DARK} metal={0.3} rough={0.45} seg={24} />
      <Cyl p={[0, 0.68, 0]} rt={0.016} rb={0.016} h={1.3} c={METAL} metal={0.5} rough={0.35} seg={12} />
      <Cyl
        p={[0, 1.44, 0]}
        rt={0.14}
        rb={0.22}
        h={0.26}
        c={color}
        seg={28}
        open
        emissive="#ffd9a2"
        emissiveIntensity={0.32}
        rough={0.85}
      />
      <Cyl p={[0, 1.575, 0]} rt={0.14} rb={0.14} h={0.012} c={shade(color, -0.1)} seg={28} />
    </group>
  );
}

const BOOK_COLORS = ['#8d6a4f', '#b06a4c', '#6d7f6b', '#cfc4ae', '#65757f', '#9c8563'];

function Bookshelf({ w, d, h, color }: ModelProps) {
  const shelves = [0.035, 0.48, 0.92, 1.36, h - 0.025];
  const bookRows = [0, 1, 2, 3];
  return (
    <group>
      <Box p={[-w / 2 + 0.02, h / 2, 0]} s={[0.04, h, d]} c={shade(color, -0.08)} />
      <Box p={[w / 2 - 0.02, h / 2, 0]} s={[0.04, h, d]} c={shade(color, -0.08)} />
      <Box p={[0, h / 2, -d / 2 + 0.012]} s={[w, h, 0.024]} c={shade(color, -0.16)} />
      {shelves.map((y, i) => (
        <Box key={i} p={[0, y, 0]} s={[w - 0.02, 0.035, d]} c={color} />
      ))}
      {bookRows.map((row) =>
        Array.from({ length: 6 + row }).map((_, i) => {
          const bw = 0.035 + ((i * 7 + row * 3) % 3) * 0.012;
          const bh = 0.2 + ((i * 5 + row) % 4) * 0.022;
          const x = -w / 2 + 0.09 + i * (bw + 0.012);
          if (x > w / 2 - 0.09) return null;
          return (
            <Box
              key={`${row}-${i}`}
              p={[x, shelves[row] + 0.02 + bh / 2, 0.02]}
              s={[bw, bh, 0.2]}
              c={BOOK_COLORS[(i + row * 2) % BOOK_COLORS.length]}
              rough={0.9}
            />
          );
        }),
      )}
      <Cyl p={[w / 2 - 0.2, shelves[4] + 0.09, 0]} rt={0.08} rb={0.06} h={0.15} c="#b9a58b" seg={16} />
    </group>
  );
}

function Bed({ w, d, color }: ModelProps) {
  const frameTop = 0.32;
  return (
    <group>
      <Legs w={w} d={d} inset={0.13} h={0.12} c={WOOD_DARK} r={0.04} />
      <RB p={[0, 0.23, 0]} s={[w, 0.24, d]} c={WOOD} r={0.035} />
      <RB p={[0, 0.41, 0]} s={[w - 0.08, 0.18, d - 0.06]} c={WHITE} r={0.06} rough={0.95} />
      <RB p={[0, 0.485, d * 0.16]} s={[w - 0.03, 0.075, d * 0.65]} c={color} r={0.04} rough={0.95} />
      <RB p={[0, 0.5, d * 0.16 - d * 0.325 + 0.04]} s={[w - 0.03, 0.09, 0.09]} c={shade(color, 0.08)} r={0.03} />
      <RB p={[-w * 0.21, 0.535, -d / 2 + 0.33]} s={[w * 0.36, 0.11, 0.34]} c={WHITE} r={0.055} rough={0.95} rot={[-0.06, 0, 0]} />
      <RB p={[w * 0.21, 0.535, -d / 2 + 0.33]} s={[w * 0.36, 0.11, 0.34]} c={WHITE} r={0.055} rough={0.95} rot={[-0.06, 0, 0]} />
      <RB p={[0, 0.47, -d / 2 - 0.035]} s={[w, 0.7, 0.07]} c={WOOD} r={0.04} />
      <RB p={[0, 0.83, -d / 2 - 0.035]} s={[w + 0.02, 0.05, 0.09]} c={shade(WOOD, 0.05)} r={0.02} />
    </group>
  );
}

function Nightstand({ w, d, color, h }: ModelProps) {
  return (
    <group>
      <Legs w={w} d={d} inset={0.08} h={0.1} c={WOOD_DARK} r={0.018} />
      <RB p={[0, 0.1 + (h - 0.16) / 2, 0]} s={[w, h - 0.16, d]} c={color} r={0.018} />
      <Box p={[0, 0.34, d / 2 + 0.004]} s={[w - 0.05, 0.008, 0.008]} c={shade(color, -0.15)} />
      <Cyl p={[0, 0.28, d / 2 + 0.02]} rt={0.012} rb={0.012} h={0.09} c={METAL} rot={[0, 0, Math.PI / 2]} seg={8} />
      <Cyl p={[0.02, h + 0.03, -0.02]} rt={0.05} rb={0.06} h={0.02} c={DARK} seg={16} />
      <Cyl p={[0.02, h + 0.17, -0.02]} rt={0.012} rb={0.012} h={0.28} c={METAL} seg={8} />
      <Cyl p={[0.02, h + 0.36, -0.02]} rt={0.075} rb={0.11} h={0.15} c="#e4d3ac" seg={20} open emissive="#ffdba6" emissiveIntensity={0.3} />
    </group>
  );
}

function Wardrobe({ w, d, h, color }: ModelProps) {
  const bodyH = h - 0.06;
  return (
    <group>
      <Box p={[0, 0.03, 0]} s={[w - 0.04, 0.06, d - 0.02]} c={shade(color, -0.22)} />
      <RB p={[0, 0.06 + bodyH / 2, 0]} s={[w, bodyH, d]} c={color} r={0.015} />
      <Box p={[-w / 4, 0.06 + bodyH / 2, d / 2 + 0.006]} s={[w / 2 - 0.035, bodyH - 0.09, 0.018]} c={shade(color, 0.05)} />
      <Box p={[w / 4, 0.06 + bodyH / 2, d / 2 + 0.006]} s={[w / 2 - 0.035, bodyH - 0.09, 0.018]} c={shade(color, 0.05)} />
      <Cyl p={[-0.035, h * 0.57, d / 2 + 0.03]} rt={0.011} rb={0.011} h={0.38} c={METAL} seg={8} />
      <Cyl p={[0.035, h * 0.57, d / 2 + 0.03]} rt={0.011} rb={0.011} h={0.38} c={METAL} seg={8} />
      <Box p={[0, h - 0.03, 0]} s={[w + 0.02, 0.03, d + 0.02]} c={shade(color, -0.08)} />
    </group>
  );
}

function Desk({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.735, 0]} s={[w, 0.05, d]} c={color} r={0.015} />
      {[-w / 2 + 0.08, w / 2 - 0.08].map((x, i) => (
        <Box key={i} p={[x, 0.36, -d / 2 + 0.08]} s={[0.05, 0.72, 0.05]} c={shade(color, -0.08)} />
      ))}
      <Box p={[0, 0.36, d / 2 - 0.08]} s={[w - 0.16, 0.72, 0.05]} c={shade(color, -0.12)} />
      <RB p={[w / 2 - 0.26, 0.48, 0]} s={[0.44, 0.42, d - 0.1]} c={shade(color, 0.05)} r={0.012} />
      <Cyl p={[w / 2 - 0.26, 0.6, d / 2 - 0.04]} rt={0.01} rb={0.01} h={0.14} c={METAL} rot={[0, 0, Math.PI / 2]} seg={8} />
      <Box p={[-w / 4, 0.772, -0.02]} s={[0.3, 0.018, 0.2]} c={DARK} />
      <Box p={[-w / 4, 0.87, -0.04]} s={[0.05, 0.2, 0.05]} c={DARK} />
      <Box p={[-w / 4, 1.06, -0.07]} s={[0.62, 0.38, 0.028]} c={DARK} />
      <Box p={[-w / 4, 1.06, -0.052]} s={[0.59, 0.345, 0.01]} c="#1a2226" rough={0.28} metal={0.15} />
      <Box p={[-w / 4, 1.06, -0.045]} s={[0.57, 0.32, 0.002]} c="#2c3d45" rough={0.2} />
      <Box p={[-w / 5, 0.772, 0.18]} s={[0.4, 0.018, 0.15]} c="#e9e4da" />
      <RB p={[0.05, 0.775, 0.18]} s={[0.07, 0.025, 0.11]} c="#d8d3c8" r={0.02} />
    </group>
  );
}

function Chair({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.44, 0]} s={[w, 0.05, d]} c={color} r={0.02} />
      <RB p={[0, 0.475, 0.015]} s={[w - 0.05, 0.035, d - 0.08]} c={shade(color, 0.14)} r={0.018} rough={0.95} />
      {legPositions(w, d, 0.055).map(([x, z], i) => (
        <Box key={i} p={[x, 0.21, z]} s={[0.035, 0.42, 0.035]} c={shade(color, -0.08)} />
      ))}
      <Box p={[0, 0.7, -d / 2 + 0.06]} s={[w, 0.24, 0.035]} c={color} rot={[-0.06, 0, 0]} />
      <Box p={[-w / 2 + 0.045, 0.62, -d / 2 + 0.05]} s={[0.03, 0.24, 0.03]} c={shade(color, -0.06)} />
      <Box p={[w / 2 - 0.045, 0.62, -d / 2 + 0.05]} s={[0.03, 0.24, 0.03]} c={shade(color, -0.06)} />
    </group>
  );
}

function DiningTable({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.735, 0]} s={[w, 0.06, d]} c={color} r={0.02} />
      {legPositions(w, d, 0.1).map(([x, z], i) => (
        <Box key={i} p={[x, 0.355, z]} s={[0.075, 0.71, 0.075]} c={shade(color, -0.06)} />
      ))}
      <Box p={[0, 0.66, -d / 2 + 0.1]} s={[w - 0.22, 0.07, 0.04]} c={shade(color, -0.03)} />
      <Box p={[0, 0.66, d / 2 - 0.1]} s={[w - 0.22, 0.07, 0.04]} c={shade(color, -0.03)} />
      <Cyl p={[0, 0.8, 0]} rt={0.11} rb={0.075} h={0.07} c="#d7ccb8" seg={24} />
      <Cyl p={[-0.3, 0.79, 0.12]} rt={0.045} rb={0.045} h={0.08} c="#a8b5a2" seg={16} />
    </group>
  );
}

function Sideboard({ w, d, color, h }: ModelProps) {
  return (
    <group>
      <Legs w={w} d={d} inset={0.1} h={0.16} c={shade(color, -0.15)} r={0.02} />
      <RB p={[0, 0.16 + (h - 0.2) / 2, 0]} s={[w, h - 0.2, d]} c={color} r={0.015} />
      <Box p={[-w / 4, h / 2, d / 2 + 0.005]} s={[w / 2 - 0.03, h - 0.3, 0.015]} c={shade(color, 0.05)} />
      <Box p={[w / 4, h / 2, d / 2 + 0.005]} s={[w / 2 - 0.03, h - 0.3, 0.015]} c={shade(color, 0.05)} />
      <Cyl p={[-0.03, h / 2 + 0.05, d / 2 + 0.025]} rt={0.014} rb={0.014} h={0.06} c={METAL} rot={[Math.PI / 2, 0, 0]} seg={12} />
      <Cyl p={[0.03, h / 2 + 0.05, d / 2 + 0.025]} rt={0.014} rb={0.014} h={0.06} c={METAL} rot={[Math.PI / 2, 0, 0]} seg={12} />
      <Cyl p={[-0.25, h + 0.09, 0]} rt={0.055} rb={0.075} h={0.18} c="#b7a58c" seg={16} />
      <Cyl p={[0.22, h + 0.035, 0.03]} rt={0.09} rb={0.09} h={0.045} c="#cfc4b0" seg={20} />
    </group>
  );
}

function Fridge({ w, d, h, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, h / 2 + 0.04, 0]} s={[w, h - 0.08, d]} c={color} r={0.03} rough={0.42} metal={0.25} />
      <Box p={[0, h * 0.62, d / 2 + 0.002]} s={[w - 0.02, 0.01, 0.006]} c={shade(color, -0.35)} />
      <Cyl p={[w / 2 - 0.075, h * 0.77, d / 2 + 0.025]} rt={0.013} rb={0.013} h={0.36} c={METAL} seg={10} />
      <Cyl p={[w / 2 - 0.075, h * 0.4, d / 2 + 0.025]} rt={0.013} rb={0.013} h={0.28} c={METAL} seg={10} />
      <Box p={[0, 0.02, 0]} s={[w - 0.05, 0.04, d - 0.05]} c={DARK} />
    </group>
  );
}

function Stove({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.44, 0]} s={[w, 0.86, d]} c={color} r={0.025} rough={0.35} metal={0.3} />
      <Box p={[0, 0.875, 0]} s={[w + 0.01, 0.025, d + 0.01]} c="#262829" rough={0.35} />
      {[
        [-0.14, -0.14],
        [0.14, -0.14],
        [-0.14, 0.14],
        [0.14, 0.14],
      ].map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.9, z]} rt={0.075} rb={0.075} h={0.015} c="#141616" seg={20} rough={0.4} metal={0.35} />
      ))}
      <Box p={[0, 0.42, d / 2 + 0.006]} s={[w - 0.06, 0.46, 0.02]} c="#242728" rough={0.28} metal={0.2} />
      <Box p={[0, 0.64, d / 2 + 0.025]} s={[w - 0.16, 0.025, 0.035]} c={METAL} metal={0.6} rough={0.28} />
      {[-0.16, 0, 0.16].map((x, i) => (
        <Cyl
          key={i}
          p={[x, 0.78, d / 2 + 0.02]}
          rt={0.026}
          rb={0.02}
          h={0.03}
          c="#202223"
          rot={[Math.PI / 2, 0, 0]}
          seg={12}
        />
      ))}
      <Box p={[0, 0.15, d / 2 + 0.006]} s={[w - 0.06, 0.04, 0.02]} c="#202223" />
    </group>
  );
}

function Counter({ w, d, color, h }: ModelProps) {
  const sinkX = -w * 0.16;
  return (
    <group>
      <RB p={[0, (h - 0.05) / 2 + 0.02, 0]} s={[w, h - 0.1, d]} c={color} r={0.015} />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          p={[-w / 3 + (i * w) / 3, (h - 0.12) / 2, d / 2 + 0.006]}
          s={[w / 3 - 0.035, h - 0.24, 0.015]}
          c={shade(color, 0.04)}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Cyl
          key={i}
          p={[-w / 3 + (i * w) / 3, h - 0.27, d / 2 + 0.025]}
          rt={0.01}
          rb={0.01}
          h={0.1}
          c={METAL}
          rot={[0, 0, Math.PI / 2]}
          seg={8}
        />
      ))}
      <Box p={[0, h - 0.045, 0]} s={[w + 0.02, 0.05, d + 0.03]} c="#e9e4da" rough={0.42} />
      <Box p={[sinkX, h - 0.012, 0.02]} s={[0.5, 0.02, 0.36]} c="#a9afb0" rough={0.35} metal={0.4} />
      <Box p={[sinkX, h - 0.004, 0.02]} s={[0.43, 0.012, 0.29]} c="#6e7678" rough={0.3} metal={0.5} />
      <Cyl p={[sinkX, h + 0.12, -d / 2 + 0.09]} rt={0.017} rb={0.017} h={0.24} c={METAL} metal={0.65} rough={0.25} seg={10} />
      <Cyl
        p={[sinkX, h + 0.24, -d / 2 + 0.16]}
        rt={0.013}
        rb={0.013}
        h={0.18}
        c={METAL}
        metal={0.65}
        rough={0.25}
        rot={[Math.PI / 2, 0, 0]}
        seg={10}
      />
      <Box p={[w * 0.26, h + 0.006, 0.02]} s={[0.34, 0.018, 0.22]} c="#b89570" r={0.01} />
    </group>
  );
}

function Toilet({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.2, 0.02]} s={[w * 0.7, 0.34, d * 0.62]} c={color} r={0.08} />
      <Cyl p={[0, 0.35, 0.06]} rt={0.19} rb={0.15} h={0.22} c={color} scale={[1, 1, 1.28]} seg={24} />
      <Cyl p={[0, 0.465, 0.06]} rt={0.195} rb={0.195} h={0.035} c="#fbfaf6" scale={[1, 1, 1.28]} seg={24} />
      <Cyl p={[0, 0.485, 0.06]} rt={0.16} rb={0.16} h={0.02} c="#e7e6e0" scale={[1, 1, 1.3]} seg={24} />
      <RB p={[0, 0.57, -d / 2 + 0.11]} s={[w, 0.42, 0.2]} c={color} r={0.045} />
      <RB p={[0, 0.795, -d / 2 + 0.11]} s={[w + 0.02, 0.045, 0.22]} c="#f8f7f2" r={0.02} />
      <Cyl p={[0, 0.825, -d / 2 + 0.11]} rt={0.045} rb={0.045} h={0.012} c={METAL} metal={0.6} seg={16} />
    </group>
  );
}

function Bathtub({ w, d, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, 0.27, 0]} s={[w, 0.52, d]} c={color} r={0.1} rough={0.28} />
      <Box p={[0, 0.515, 0]} s={[w - 0.12, 0.03, d - 0.12]} c="#d3e5e8" rough={0.15} metal={0.05} />
      <Box p={[0, 0.528, d / 2 - 0.045]} s={[w - 0.06, 0.035, 0.06]} c="#f5f3ec" />
      <Box p={[0, 0.528, -d / 2 + 0.045]} s={[w - 0.06, 0.035, 0.06]} c="#f5f3ec" />
      <Box p={[-w / 2 + 0.045, 0.528, 0]} s={[0.06, 0.035, d - 0.12]} c="#f5f3ec" />
      <Box p={[w / 2 - 0.045, 0.528, 0]} s={[0.06, 0.035, d - 0.12]} c="#f5f3ec" />
      <Cyl p={[w / 2 - 0.25, 0.63, 0]} rt={0.018} rb={0.018} h={0.2} c={METAL} metal={0.65} rough={0.25} seg={10} />
      <Cyl p={[w / 2 - 0.32, 0.73, 0]} rt={0.012} rb={0.012} h={0.16} c={METAL} metal={0.65} rough={0.25} rot={[0, 0, Math.PI / 2]} seg={10} />
      <Cyl p={[-w / 2 + 0.35, 0.535, 0.08]} rt={0.045} rb={0.045} h={0.005} c={METAL} metal={0.6} seg={16} />
    </group>
  );
}

function Shower({ w, d, color }: ModelProps) {
  const glass = (
    <meshPhysicalMaterial
      color="#cfe1e5"
      roughness={0.08}
      metalness={0}
      transparent
      opacity={0.22}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
  return (
    <group>
      <RB p={[0, 0.035, 0]} s={[w, 0.07, d]} c={color} r={0.02} rough={0.4} />
      <mesh position={[0, 0.06, 0.02]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.055, 0.075, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1, -d / 2 + 0.02]} castShadow>
        <boxGeometry args={[w, 1.92, 0.02]} />
        {glass}
      </mesh>
      <mesh position={[-w / 2 + 0.02, 1, 0]} castShadow>
        <boxGeometry args={[0.02, 1.92, d]} />
        {glass}
      </mesh>
      {legPositions(w, d, 0.02).map(([x, z], i) => (
        <Cyl key={i} p={[x, 1, z]} rt={0.014} rb={0.014} h={1.95} c={METAL} metal={0.65} rough={0.25} seg={10} />
      ))}
      <Box p={[0, 1.965, -d / 2 + 0.02]} s={[w, 0.025, 0.025]} c={METAL} metal={0.65} rough={0.25} />
      <Cyl p={[w / 2 - 0.075, 1.02, -d / 2 + 0.075]} rt={0.017} rb={0.017} h={1.9} c={METAL} metal={0.65} rough={0.25} seg={10} />
      <Cyl
        p={[w / 2 - 0.075, 1.94, -d / 2 + 0.2]}
        rt={0.014}
        rb={0.014}
        h={0.3}
        c={METAL}
        metal={0.65}
        rough={0.25}
        rot={[Math.PI / 2, 0, 0]}
        seg={10}
      />
      <Cyl p={[w / 2 - 0.075, 1.9, -d / 2 + 0.34]} rt={0.105} rb={0.09} h={0.025} c={METAL} metal={0.55} rough={0.3} seg={24} />
    </group>
  );
}

function Washer({ w, d, h, color }: ModelProps) {
  return (
    <group>
      <RB p={[0, h / 2 + 0.02, 0]} s={[w, h - 0.04, d]} c={color} r={0.04} rough={0.35} metal={0.15} />
      <Box p={[0, h - 0.08, d / 2 + 0.004]} s={[w - 0.02, 0.1, 0.015]} c={shade(color, -0.12)} />
      <Cyl
        p={[0, h * 0.43, d / 2 + 0.012]}
        rt={0.185}
        rb={0.185}
        h={0.02}
        c="#343b3e"
        rot={[Math.PI / 2, 0, 0]}
        seg={32}
        rough={0.2}
        metal={0.35}
      />
      <Cyl
        p={[0, h * 0.43, d / 2 + 0.002]}
        rt={0.22}
        rb={0.22}
        h={0.015}
        c="#c3c8ca"
        rot={[Math.PI / 2, 0, 0]}
        seg={32}
        rough={0.3}
        metal={0.5}
      />
      <Cyl
        p={[-0.18, h - 0.08, d / 2 + 0.02]}
        rt={0.05}
        rb={0.045}
        h={0.025}
        c="#363b3d"
        rot={[Math.PI / 2, 0, 0]}
        seg={20}
      />
      <Box p={[0.13, h - 0.08, d / 2 + 0.018]} s={[0.17, 0.04, 0.01]} c="#2c3437" />
      <Box p={[0, 0.015, 0]} s={[w - 0.05, 0.03, d - 0.05]} c={DARK} />
    </group>
  );
}

const MODELS: Record<FurnitureType, (props: ModelProps) => JSX.Element> = {
  sofa: Sofa,
  armchair: Armchair,
  coffeeTable: CoffeeTable,
  tvStand: TvStand,
  rug: Rug,
  plant: Plant,
  floorLamp: FloorLamp,
  bookshelf: Bookshelf,
  bed: Bed,
  nightstand: Nightstand,
  wardrobe: Wardrobe,
  desk: Desk,
  chair: Chair,
  diningTable: DiningTable,
  sideboard: Sideboard,
  fridge: Fridge,
  stove: Stove,
  counter: Counter,
  toilet: Toilet,
  bathtub: Bathtub,
  shower: Shower,
  washer: Washer,
};

function SelectionMark({ w, d, round }: { w: number; d: number; round?: boolean }) {
  const y = 0.04;
  if (round) {
    const r = Math.max(w, d) / 2;
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} raycast={() => null}>
        <ringGeometry args={[r + 0.06, r + 0.095, 64]} />
        <meshBasicMaterial color="#b2653f" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  const rail = 0.026;
  const ow = w + 0.15;
  const od = d + 0.15;
  const rails: Array<{ p: [number, number, number]; s: [number, number, number] }> = [
    { p: [0, y, od / 2], s: [ow, 0.006, rail] },
    { p: [0, y, -od / 2], s: [ow, 0.006, rail] },
    { p: [ow / 2, y, 0], s: [rail, 0.006, od] },
    { p: [-ow / 2, y, 0], s: [rail, 0.006, od] },
  ];
  return (
    <group raycast={() => null}>
      {rails.map((r, i) => (
        <mesh key={i} position={r.p} raycast={() => null}>
          <boxGeometry args={r.s} />
          <meshBasicMaterial color="#b2653f" transparent opacity={0.78} />
        </mesh>
      ))}
    </group>
  );
}

export default function Furniture3D({ item }: { item: Furniture }) {
  const def = getDef(item.type);
  const color = item.color ?? def.color;
  const selected = usePlanner(
    (s) => s.selection?.kind === 'furniture' && s.selection.id === item.id,
  );
  const select = usePlanner((s) => s.select);
  const Model = MODELS[item.type];

  return (
    <group
      position={[item.x, 0, item.z]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'furniture', id: item.id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <Model w={def.w} d={def.d} h={def.h} color={color} />
      {selected && <SelectionMark w={def.w} d={def.d} round={def.round} />}
    </group>
  );
}
