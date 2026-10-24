---
name: road-networks
description: >-
  Maintain, debug, and expand procedural road generation, curb rendering, lane markings,
  streetlights, crosswalks, and road configurations in TheoTown.
---

# Road Networks & Procedural Geometry Runbook

Use this skill when modifying road types, pavement meshes, sidewalk curbs, streetlights, lane divider lines, crosswalk markings, or road connectivity.

---

## 1. Architecture Overview

- **Source File**: [`src/roadBuilder.ts`](file:///d:/Projects/theotown/src/roadBuilder.ts).
- **Configurations**: `ROAD_CONFIGS` (`dirt`, `suburban`, `avenue`, `highway`).
- **Interfaces**: [`src/types.ts`](file:///d:/Projects/theotown/src/types.ts) (`RoadType`, `RoadConfig`, `RoadTile`).

---

## 2. Geometry Dimensions & Markings

1. **Tile Dimensions**:
   - Each road tile is $1.0 \times 1.0$ unit.
   - Asphalt elevation: `elevation = 0.04` (higher for highways: `0.10`).

2. **Sidewalks & Curbs**:
   - Curbs are placed at `±0.44` offset from centerline with width `0.12`.
   - Intersection corner quadrants render curved or quadrant curb patches to round the corners.

3. **Road Markings**:
   - **Center Divider**: Yellow dashed lines along straight roads (`hasNorth && hasSouth` or `hasEast && hasWest`).
   - **Outer White Edge Lines (Fog Lines)**: Solid white stripes along outer road edges at `±0.36` offset.
   - **Zebra Crosswalks**: Intersections connecting suburban or avenue roads render white pedestrian zebra stripes across the road entryways.

4. **Streetlights**:
   - Streetlights are positioned on the outer sidewalk curb (`x = ±0.44`, `z = ±0.44`), never in the middle of the road.
   - Warm point light attached at the lamp head with height `0.55`.

---

## 3. Road Connectivity Graph

- Adjacency checks:
  ```ts
  const hasNorth = this.roads.has(this.getKey(x, z - 1));
  const hasSouth = this.roads.has(this.getKey(x, z + 1));
  const hasEast = this.roads.has(this.getKey(x + 1, z));
  const hasWest = this.roads.has(this.getKey(x - 1, z));
  ```
- When a road is built or demolished, adjacent road tiles must update their geometry via `this.buildRoadMesh(x, z)`.

---

## 4. Verification Steps

1. Run `npm run build`.
2. Inspect intersections in browser: curbs must line the sidewalks, markings must align, and streetlights must stand on footpaths.

