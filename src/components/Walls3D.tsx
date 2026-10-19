import type { WallMode, WallPiece } from '../types';

interface Solid {
  start: number;
  end: number;
  y0: number;
  y1: number;
}

function wallSolids(piece: WallPiece): Solid[] {
  const solids: Solid[] = [];
  let cursor = piece.start;

  for (const hole of piece.holes) {
    const hs = Math.max(piece.start, hole.start);
    const he = Math.min(piece.end, hole.end);
    if (he - hs <= 0.001) continue;
    if (hs > cursor + 0.001) {
      solids.push({ start: cursor, end: hs, y0: 0, y1: piece.height });
    }
    const bottom = Math.max(0, Math.min(hole.bottom, piece.height));
    const top = Math.max(0, Math.min(hole.top, piece.height));
    if (bottom > 0.002) {
      solids.push({ start: hs, end: he, y0: 0, y1: bottom });
    }
    if (top < piece.height - 0.002) {
      solids.push({ start: hs, end: he, y0: top, y1: piece.height });
    }
    cursor = Math.max(cursor, he);
  }

  if (cursor < piece.end - 0.001) {
    solids.push({ start: cursor, end: piece.end, y0: 0, y1: piece.height });
  }
  return solids;
}

export default function Walls3D({ walls, mode }: { walls: WallPiece[]; mode: WallMode }) {
  if (mode === 'hidden') return null;
  const ghost = mode === 'ghost';

  return (
    <group>
      {walls.map((piece) => {
        const solids = wallSolids(piece);
        return (
          <group key={piece.key}>
            {solids.map((solid, i) => {
              const len = solid.end - solid.start;
              const height = solid.y1 - solid.y0;
              if (len <= 0.002 || height <= 0.002) return null;
              const position: [number, number, number] =
                piece.axis === 'x'
                  ? [(solid.start + solid.end) / 2, solid.y0 + height / 2, piece.fixed]
                  : [piece.fixed, solid.y0 + height / 2, (solid.start + solid.end) / 2];
              const size: [number, number, number] =
                piece.axis === 'x'
                  ? [len, height, piece.thickness]
                  : [piece.thickness, height, len];
              const showCap = ghost && solid.y1 >= piece.height - 0.001;
              const capPosition: [number, number, number] =
                piece.axis === 'x'
                  ? [(solid.start + solid.end) / 2, piece.height + 0.013, piece.fixed]
                  : [piece.fixed, piece.height + 0.013, (solid.start + solid.end) / 2];
              const capSize: [number, number, number] =
                piece.axis === 'x'
                  ? [len + 0.004, 0.026, piece.thickness + 0.014]
                  : [piece.thickness + 0.014, 0.026, len + 0.004];
              return (
                <group key={i}>
                  <mesh
                    position={position}
                    castShadow={!ghost}
                    receiveShadow={!ghost}
                    raycast={() => null}
                  >
                    <boxGeometry args={size} />
                    <meshStandardMaterial
                      color={ghost ? '#f4ece1' : piece.color}
                      roughness={0.92}
                      metalness={0}
                      transparent={ghost}
                      opacity={ghost ? 0.28 : 1}
                      depthWrite={!ghost}
                    />
                  </mesh>
                  {showCap && (
                    <mesh position={capPosition} raycast={() => null}>
                      <boxGeometry args={capSize} />
                      <meshStandardMaterial
                        color="#8d8170"
                        roughness={0.9}
                        transparent
                        opacity={0.55}
                      />
                    </mesh>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
