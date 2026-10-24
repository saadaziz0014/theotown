---
name: underground-utilities
description: >-
  Maintain, debug, and expand underground water pipes, electrical wiring grids,
  coverage overlays, and service building distribution in TheoTown.
---

# Underground Utilities & Services Runbook

Use this skill when modifying subterranean water pipes, electrical power lines, coverage calculation algorithms, capacity/demand simulation, or X-ray overlay rendering.

---

## 1. Architecture Overview

- **Source File**: [`src/cityWorld.ts`](file:///d:/Projects/theotown/src/cityWorld.ts) (methods `setPipe`, `setWire`, `removePipe`, `removeWire`, `updateUtilitiesSimulation`, `setOverlayMode`).
- **Interfaces**: [`src/types.ts`](file:///d:/Projects/theotown/src/types.ts) (`UtilityPipe`, `UtilityWire`, `ServiceType`, `ActiveOverlay`).

---

## 2. Grid Storage & Connectivity

1. **Independent Spatial Maps**:
   - `pipes: Map<string, UtilityPipe>`
   - `wires: Map<string, UtilityWire>`
   - Key format: `getKey(x, z) => "${x},${z}"`.

2. **Supply Sources**:
   - **Power Plants**:
     - `power_wind`: Wind Turbine (40 MW, 0 pollution)
     - `power_coal`: Coal Plant (180 MW, smog pollution)
     - `power_solar`: Solar Farm (85 MW, clean photovoltaic arrays)
     - `power_gas`: Gas Plant (160 MW, clean thermal turbine)
     - `power_nuclear`: Nuclear Plant (600 MW, massive atomic baseload)
     - `power_fusion`: Tokamak Fusion Reactor (1,800 MW, futuristic clean plasma)
   - **Water Sources**:
     - `water_tower`: Municipal Water Tower (60 m³)
     - `water_tank`: High-capacity Reservoir Tank (120 m³)

3. **Breadth-First Search (BFS) Connectivity**:
   - BFS traverses through adjacent pipes (`hasNorth`, `hasSouth`, `hasEast`, `hasWest`).
   - Pipes connected back to a valid operational water source set `connectedToSource = true`.
   - Power wires traverse in the same manner from power plants.
   - Buildings within range of a connected pipe/wire receive `hasWater = true` / `hasPower = true`.

---

## 3. X-Ray & Subterranean Visualization

1. **Overlay Modes**:
   - `'power'`, `'water'`, `'services'`, `'pollution'`, `'happiness'`, `'none'`.
2. **Material Transparency**:
   - When `'power'` or `'water'` is active, surface meshes and roads become semi-transparent (opacity ~0.3) so the underground pipe and wire networks are clearly visible.
   - Coverage radii are rendered as circular or area boundary highlights around active sources.

---

## 4. Verification Steps

1. Run `npm run build`.
2. Open the Water or Power overlay in the HUD.
3. Place a water tank and lay underground pipes: verify connected pipes turn blue and neighboring buildings receive water service.

