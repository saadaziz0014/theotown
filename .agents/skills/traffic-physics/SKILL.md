---
name: traffic-physics
description: >-
  Maintain, debug, and enhance vehicle navigation, pedestrian pathfinding, lane offsets,
  and anti-collision physics in the TheoTown city simulator.
---

# Traffic & Pedestrian Physics Runbook

Use this skill when investigating car movement issues, lane alignment, turning behavior, pedestrian walking paths, or traffic jams.

---

## 1. Architecture Overview

- **Source File**: [`src/cityWorld.ts`](file:///d:/Projects/theotown/src/cityWorld.ts) (methods `spawnCar`, `startCarTurn`, `spawnPedestrian`, `updatePhysics`, `removeCar`, `removePedestrian`).
- **Interfaces**: [`src/types.ts`](file:///d:/Projects/theotown/src/types.ts) (`CarAgent`, `CarTurnState`, `PedestrianAgent`).

---

## 2. Vehicle Navigation Invariants

1. **Right-Hand Lane Offset**:
   - `LANE_OFFSET = 0.22`.
   - Normal vector perpendicular to travel direction `(dx, dz)`:
     ```ts
     const rx = -dz * LANE_OFFSET;
     const rz = dx * LANE_OFFSET;
     ```
   - On East-West movement: `car.z` is locked to `fromTile.z + 0.5 + rz`.
   - On North-South movement: `car.x` is locked to `fromTile.x + 0.5 + rx`.

2. **Corner Turning via Quadratic Bézier**:
   - Monotonic parametric progress: `turn.progress += moveStep / turn.arcLength`.
   - Curve points:
     - `pIn`: entry boundary of `toTile` on incoming right lane.
     - `pOut`: exit boundary of `toTile` on outgoing right lane.
     - `p1`: ray intersection of incoming and outgoing lanes.
   - Heading aligns with curve tangent:
     ```ts
     const tanX = 2 * invT * (turn.p1.x - turn.pIn.x) + 2 * t * (turn.pOut.x - turn.p1.x);
     const tanZ = 2 * invT * (turn.p1.z - turn.pIn.z) + 2 * t * (turn.pOut.z - turn.p1.z);
     car.rotationY = Math.atan2(tanX, tanZ);
     ```

3. **Anti-Collision & Safe Following System**:
   - **Local Coordinate Projection**:
     ```ts
     const forwardX = Math.sin(car.rotationY);
     const forwardZ = Math.cos(car.rotationY);
     const rightX = Math.cos(car.rotationY);
     const rightZ = -Math.sin(car.rotationY);

     const dForward = (other.x - car.x) * forwardX + (other.z - car.z) * forwardZ;
     const dLateral = Math.abs((other.x - car.x) * rightX + (other.z - car.z) * rightZ);
     ```
   - **Corridor Filtering**: Only obstacles within lateral corridor $d_{\perp} < 0.38$ trigger reactions (ignores opposing traffic on the other side of two-way roads).
   - **Bumper Spacing**:
     - `MIN_STOP_GAP = 1.10`: Full stop threshold guaranteeing $\approx 0.22$ visible gap between bumpers.
     - Deceleration window ($[1.10, 2.0]$): Progressively matches leader speed.
     - Rapid emergency brake: `car.speed = Math.min(car.speed * 0.7, desiredSpeed)`.

4. **Intersection Right-of-Way & Crosswalk Yielding**:
   - Approaching vehicles detect traffic already inside or turning through `toTile`.
   - Emergency vehicles (`police`, `ambulance`, `firetruck`) always receive priority right-of-way.
   - Pedestrian crosswalk yielding: Cars come to a halt if pedestrians are crossing ahead ($d_{\parallel} \in [0.1, 1.25], d_{\perp} < 0.36$).
   - Anti-deadlock resolver: If stuck waiting at an intersection for $> 45$ ticks, priority tie-breaker activates; at $> 210$ ticks, vehicle creeps forward; at $> 330$ ticks, despawns safely.

5. **Safety Despawn Guards**:
   - Current tile check:
     ```ts
     const curRoad = this.roads.get(this.getKey(Math.floor(car.x), Math.floor(car.z)));
     if (!currentRoad) { this.removeCar(i); continue; }
     ```

---

## 3. Pedestrian Walking Invariants

1. **Sidewalk Offset**:
   - `SIDEWALK_OFFSET = 0.44`.
   - Pedestrians only walk on `suburban` and `avenue` roads.
   - Lateral coordinate locked to sidewalk ribbon.
2. **Safety Despawn Guards**:
   - If tile under pedestrian is missing or not a sidewalk road, call `this.removePedestrian(i)`.

---

## 4. Verification Steps

1. Run `npm run build` to confirm zero TypeScript compile errors.
2. Observe dev server traffic: cars must not drift into grass or drive in the center of the road.

