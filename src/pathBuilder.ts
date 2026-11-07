import { ROAD_CONFIGS } from './roadBuilder';
import type { RoadType } from './types';

export type PathBuildMode = 'straight' | 'rounded' | 'rectangle';

export interface TileCoord {
  x: number;
  z: number;
}

/**
 * Generate a list of tile coordinates connecting start and end tiles
 * based on the active path mode (Straight orthogonal row, Rounded L-bend, or Rectangle box).
 */
export function generateBuildPath(
  start: TileCoord,
  end: TileCoord,
  mode: PathBuildMode,
  mapSize: number
): TileCoord[] {
  const half = Math.floor(mapSize / 2);
  const clamp = (v: number) => Math.max(-half, Math.min(half - 1, v));
  const x1 = clamp(start.x);
  const z1 = clamp(start.z);
  const x2 = clamp(end.x);
  const z2 = clamp(end.z);

  const tiles: TileCoord[] = [];
  const visited = new Set<string>();

  const addTile = (x: number, z: number) => {
    const cx = clamp(x);
    const cz = clamp(z);
    const key = `${cx},${cz}`;
    if (!visited.has(key)) {
      visited.add(key);
      tiles.push({ x: cx, z: cz });
    }
  };

  if (x1 === x2 && z1 === z2) {
    addTile(x1, z1);
    return tiles;
  }

  const dx = x2 - x1;
  const dz = z2 - z1;

  if (mode === 'straight') {
    // Constrain to dominant axis (Straight Line / Row)
    if (Math.abs(dx) >= Math.abs(dz)) {
      // Horizontal row along X at constant z1
      const stepX = dx >= 0 ? 1 : -1;
      for (let x = x1; stepX > 0 ? x <= x2 : x >= x2; x += stepX) {
        addTile(x, z1);
      }
    } else {
      // Vertical row along Z at constant x1
      const stepZ = dz >= 0 ? 1 : -1;
      for (let z = z1; stepZ > 0 ? z <= z2 : z >= z2; z += stepZ) {
        addTile(x1, z);
      }
    }
  } else if (mode === 'rounded') {
    // L-Path / Corner Bend
    if (Math.abs(dx) >= Math.abs(dz)) {
      // Dominant X first: along X to x2, then along Z to z2
      const stepX = dx >= 0 ? 1 : -1;
      for (let x = x1; stepX > 0 ? x <= x2 : x >= x2; x += stepX) {
        addTile(x, z1);
      }
      const stepZ = dz >= 0 ? 1 : -1;
      for (let z = z1; stepZ > 0 ? z <= z2 : z >= z2; z += stepZ) {
        addTile(x2, z);
      }
    } else {
      // Dominant Z first: along Z to z2, then along X to x2
      const stepZ = dz >= 0 ? 1 : -1;
      for (let z = z1; stepZ > 0 ? z <= z2 : z >= z2; z += stepZ) {
        addTile(x1, z);
      }
      const stepX = dx >= 0 ? 1 : -1;
      for (let x = x1; stepX > 0 ? x <= x2 : x >= x2; x += stepX) {
        addTile(x, z2);
      }
    }
  } else if (mode === 'rectangle') {
    // 2D Area / Block fill (especially for Residential/Commercial/Industrial zones)
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        addTile(x, z);
      }
    }
  }

  return tiles;
}

/**
 * Calculates per-tile cost and total estimated cost for the current path
 */
export function calculatePathCost(
  tool: string,
  selectedRoadType: RoadType = 'suburban',
  tileCount: number
): { costPerTile: number; totalCost: number; toolLabel: string; icon: string } {
  let costPerTile = 10;
  let toolLabel = 'Tiles';
  let icon = '📦';

  switch (tool) {
    case 'road':
      costPerTile = ROAD_CONFIGS[selectedRoadType]?.cost || 15;
      toolLabel = `${selectedRoadType.charAt(0).toUpperCase() + selectedRoadType.slice(1)} Road`;
      icon = '🛣️';
      break;
    case 'rail':
      costPerTile = 25;
      toolLabel = 'Railway Track';
      icon = '🛤️';
      break;
    case 'pipe':
      costPerTile = 5;
      toolLabel = 'Water Pipeline';
      icon = '💧';
      break;
    case 'wire':
      costPerTile = 5;
      toolLabel = 'Electric Wires';
      icon = '⚡';
      break;
    case 'residential':
      costPerTile = 10;
      toolLabel = 'Residential Zone';
      icon = '🏡';
      break;
    case 'commercial':
      costPerTile = 10;
      toolLabel = 'Commercial Zone';
      icon = '🏬';
      break;
    case 'industrial':
      costPerTile = 10;
      toolLabel = 'Industrial Zone';
      icon = '🏭';
      break;
    case 'demolish':
      costPerTile = 0;
      toolLabel = 'Bulldoze';
      icon = '🚜';
      break;
  }

  return {
    costPerTile,
    totalCost: costPerTile * tileCount,
    toolLabel,
    icon
  };
}
