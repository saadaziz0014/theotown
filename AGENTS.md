# TheoTown 3D Voxel City Simulator - Agent Guide & Architecture

This repository contains **TheoTown 3D**, an interactive voxel city-builder inspired by TheoTown and Pocket City, built with **Three.js**, **TypeScript**, and **Vite**.

---

## 1. Core Architecture & File Structure

| File | Primary Responsibility |
| :--- | :--- |
| [`src/cityWorld.ts`](file:///d:/Projects/theotown/src/cityWorld.ts) | Main simulation engine: voxel grid, terrain, zone growth, car & pedestrian physics, utilities simulation, budget, day/night cycles, and rendering loops. |
| [`src/roadBuilder.ts`](file:///d:/Projects/theotown/src/roadBuilder.ts) | Procedural 3D road tile generation: asphalt pavement, curbs, sidewalk tiles, lane divider dashed lines, solid white fog lines, corner intersection curves, crosswalks, and streetlights. |
| [`src/vehicleBuilder.ts`](file:///d:/Projects/theotown/src/vehicleBuilder.ts) | Voxel vehicle models: sedans, sports cars, SUVs, buses, trucks, police cruisers, ambulances, fire trucks. |
| [`src/pedestrianBuilder.ts`](file:///d:/Projects/theotown/src/pedestrianBuilder.ts) | Animated voxel citizens with swinging legs and randomized clothing. |
| [`src/driveMode.ts`](file:///d:/Projects/theotown/src/driveMode.ts) | Pocket City 3D Drive Mode: vehicle physics, chase/bumper/isometric cameras, nitro boost, horn, and speedometer HUD. |
| [`src/driveSound.ts`](file:///d:/Projects/theotown/src/driveSound.ts) | Web Audio API procedural sound engine for engine revving, tire screeches, honking, and turbo boost. |
| [`src/cityPlans.ts`](file:///d:/Projects/theotown/src/cityPlans.ts) | Pre-built city blueprints (e.g., Grid Metropolis, Waterfront Bay, Green Valley). |
| [`src/types.ts`](file:///d:/Projects/theotown/src/types.ts) | Shared TypeScript interfaces (`CarAgent`, `CarTurnState`, `PedestrianAgent`, `UtilityPipe`, `UtilityWire`, `CityStats`, etc.). |
| [`src/ui.ts`](file:///d:/Projects/theotown/src/ui.ts) | HUD, toolbars, utility overlays, budget window, zone selectors, and notifications. |
| [`src/main.ts`](file:///d:/Projects/theotown/src/main.ts) | App entry point: Three.js canvas setup, event handling, camera controls, tool interaction, and main tick. |

---

## 2. Critical Invariants & Rules

### A. Vehicle Traffic Rules
1. **Never Wander Onto Grass**:
   - Vehicles must verify that their current tile and destination tile exist in `this.roads`.
   - If a road tile is deleted or missing, the car must immediately be removed via `this.removeCar(i)`.
2. **Strict Right-Hand Lane Offset (`+0.22`)**:
   - On East-West roads: $Z$ coordinate is locked to `fromTile.z + 0.5 + rz` ($rz = \text{sign}(dx) \times 0.22$).
   - On North-South roads: $X$ coordinate is locked to `fromTile.x + 0.5 + rx` ($rx = -\text{sign}(dz) \times 0.22$).
3. **Parametric Corner Turns**:
   - 90° intersection turns are driven parametrically via quadratic Bézier curves with monotonic progress $t \in [0, 1]$.
   - Turn state is tracked in `car.turn: CarTurnState`.
   - Heading aligns with the Bézier tangent vector; at $t = 1.0$, the vehicle snaps to the exact outgoing lane boundary ($p_{\text{out}}$).
4. **Anti-Collision & Safe Following Buffer**:
   - Vehicles project forward longitudinal ($d_{\parallel}$) and lateral ($d_{\perp}$) coordinates in their local frame.
   - Ahead in travel corridor ($d_{\perp} < 0.38$): bumper-to-bumper stopping buffer is $1.10$ units (guaranteeing $\approx 0.22$ visible gap). If $d_{\parallel} \le 1.10$, immediate emergency braking applies.
5. **Intersection Right-of-Way & Yielding**:
   - When approaching an intersection entry boundary ($< 0.85$ units), vehicles yield to any traffic currently inside or turning through the intersection tile.
   - Emergency vehicles (`police`, `ambulance`, `firetruck`) possess absolute right-of-way.
   - Pedestrian crosswalk yielding: vehicles stop completely for pedestrians crossing the roadway ($d_{\parallel} < 1.25, d_{\perp} < 0.36$).
   - Anti-gridlock resolver: stuck vehicles nudge forward at $210$ ticks and despawn if permanently blocked after $330$ ticks.
6. **Player Vehicle Interaction**:
   - Drive mode registers `world.playerVehicle`. NPC cars yield to the player car, and contact triggers elastic bounce impulses and crash audio.

### B. Pedestrian Rules
1. **Footpaths Only**:
   - Pedestrians only spawn and walk on suburban streets and avenues equipped with raised curbs and sidewalks (`curRoad.type === 'suburban' || curRoad.type === 'avenue'`).
   - Pedestrians are locked to the outer sidewalk ribbon at `±0.44` offset from the road centerline.
2. **Immediate Off-Road Despawn**:
   - If a road is bulldozed or a pedestrian leaves sidewalk boundaries, they must immediately be removed via `this.removePedestrian(i)`.

### C. Underground Utilities & Power Grid
1. **Separation of Layers**:
   - Water pipes and electrical cables live in independent spatial grids (`this.pipes` and `this.wires`).
   - Active utility overlays ('power', 'water') apply semi-transparent X-ray shaders to surface structures so pipes and wires are visible.
2. **Graph Connectivity**:
   - Power plants and water sources broadcast capacity through BFS reachability algorithms. Connected buildings receive utility status.
3. **Power Generation Facilities**:
   - **Wind Turbine** (`power_wind`): $40\text{ MW}$, clean renewable energy, animated rotating blades.
   - **Coal Power Plant** (`power_coal`): $180\text{ MW}$, high capacity, industrial smog.
   - **Solar Farm** (`power_solar`): $85\text{ MW}$, zero emission dual photovoltaic arrays.
   - **Gas Power Plant** (`power_gas`): $160\text{ MW}$, clean burning thermal gas turbine.
   - **Nuclear Power Plant** (`power_nuclear`): $600\text{ MW}$, massive atomic energy with cooling tower steam.
   - **Tokamak Fusion Plant** (`power_fusion`): $1,800\text{ MW}$, magnetic confinement plasma reactor with zero emissions.

### D. Biomes & Procedural Terrain Generation
1. **Biome Types**:
   - **Valley (`valley`)**: Green rolling hills, winding S-curve river with sandy shorelines.
   - **Mountains (`mountains`)**: Dramatic rock cliffs, snow-capped peaks, central pass, and alpine crater lake.
   - **Desert (`desert`)**: Golden sand dunes, terraced red sandstone canyons, and emerald palm oasis.
   - **Coastal (`coastal`)**: Tropical archipelago with sandy beaches and surrounding ocean waters.
   - **Plains (`plains`)**: Expansive fertile flatlands with serene park pond, optimal for megacities.
2. **Terrain Persistence**:
   - Base terrain types (`water`, `sand`, `rock`, `grass`) and heights are tracked in `baseTerrainTypes`.
   - Demolishing structures on sand or water reverts the tile to its original biome terrain, rather than generic grass.
   - Water tiles forbid zoning and service building placement (only bridges can traverse water).

### E. Drive Mode
1. **Camera & Input Isolation**:
   - When Drive Mode is active (`this.driveMode.isActive`), standard voxel camera controls (`controls.enabled = false`) and building placement clicks must be disabled so inputs do not conflict.
   - Exiting via `ESC` restores the top-down isometric view and camera controls.

---

## 3. Maintenance & Build Verification

Before concluding any modification:
```powershell
# 1. Typecheck and bundle build
npm run build

# 2. Check dev server status
# Vite dev server runs on port 3000
```

