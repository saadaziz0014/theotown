---
name: terrain-biomes
description: >-
  Maintain, debug, and expand procedural terrain generation, biomes (Valley, Mountains,
  Desert, Coastal, Plains), water bodies, sand dunes, and rock heights in TheoTown.
---

# Terrain & Biomes Runbook

Use this skill when modifying procedural map generation, heightmaps, water rules, beach shorelines, mountain peaks, or adding new biomes.

---

## 1. Architecture Overview

- **Source File**: [`src/cityWorld.ts`](file:///d:/Projects/theotown/src/cityWorld.ts) (methods `initTerrain`, `generateBiome`, `demolish`, `clearAll`).
- **Types**: [`src/types.ts`](file:///d:/Projects/theotown/src/types.ts) (`BiomeType`, `TileType`).
- **UI Elements**: `.biome-selector` and `.biome-pill-btn` in [`index.html`](file:///d:/Projects/theotown/index.html) and [`src/main.ts`](file:///d:/Projects/theotown/src/main.ts).

---

## 2. Supported Biomes & Mathematical Models

1. **Valley (`valley`)**:
   - S-curve river: `z = Math.sin(x * 0.18) * 4.2 + Math.cos(x * 0.08) * 1.8`.
   - River width $\le 1.4$ tiles: `'water'` (`0x2563eb`).
   - Shoreline $\le 2.4$ tiles: `'sand'` (`0xd4b878`).
   - Meadows: undulating green grass (`0x5ea836`, `0x4d8f2b`).

2. **Mountains (`mountains`)**:
   - Double-frequency heightmap with central pass (`|z - 0.4x| < 3.8`):
     $$h = \sin(0.22x)\cos(0.22z) \times 0.45 + \sin(0.45x + 0.35z) \times 0.18$$
   - Peaks ($h > 0.36$): Snow caps (`0xf8fafc`).
   - Slopes ($h > 0.14$): Slate & granite cliffs (`0x64748b`).
   - Alpine crater lake in the northwest corner.

3. **Desert (`desert`)**:
   - Sinusoidal sand dune ripple patterns (`0xf59e0b`, `0xeab308`).
   - Terraced red sandstone mesas at the outer boundaries (`0xb45309`, `0x9a3412`).
   - Central oasis: turquoise spring (`0x06b6d4`) surrounded by lush palm greenery (`0x15803d`).

4. **Coastal (`coastal`)**:
   - Radial island radius: $r = \sqrt{x^2 + z^2} + 2.2\sin(0.35x) + 2.2\cos(0.35z)$.
   - Deep ocean ($r > 10.5$): `'water'` (`0x0284c7`).
   - Shallow coastal waters ($r > 8.5$): `'water'` (`0x38bdf8`).
   - Sandy beaches ($r > 7.0$): `'sand'` (`0xfef08a`).
   - Tropical interior: `'grass'` (`0x22c55e`).

5. **Plains (`plains`)**:
   - Expansive, flat green grasslands with minor variance, optimal for megacities.
   - Small circular municipal park pond.

---

## 3. Critical Invariants

1. **Building Constraints on Water**:
   - Zones (`placeZone`) and Service Buildings (`placeService`) return `false` if `current === 'water'`.
   - Roads can cross water tiles to form causeways and bridges.
2. **Terrain Persistence**:
   - `baseTerrainTypes` tracks the natural underlying biome tile type for every coordinate.
   - Demolishing a building or road over sand or water restores the tile to `baseTerrainTypes.get(key)`, preventing sand/water from turning into generic grass.

---

## 4. Verification Steps

1. Run `npm run build` to ensure zero compilation errors.
2. Click through each Biome pill in the top bar:
   - Verify River Valley loads with winding water.
   - Verify Mountains load with rocky ridges and snow peaks.
   - Verify Desert loads with sand dunes and oasis.
   - Verify Coastal loads with island and beaches.
   - Verify Plains load flat with pond.

