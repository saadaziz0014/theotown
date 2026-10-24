---
name: drive-mode
description: >-
  Maintain, debug, and expand the Pocket City 3D Drive Mode exploration feature,
  vehicle steering physics, camera controllers, HUD gauges, and sound effects.
---

# Drive Mode Runbook

Use this skill when modifying free-roaming vehicle driving, camera follow algorithms (chase, isometric, bumper), keyboard controls, vehicle swapping, speedometer HUD, or procedural engine audio.

---

## 1. Architecture Overview

- **Source File**: [`src/driveMode.ts`](file:///d:/Projects/theotown/src/driveMode.ts).
- **Sound Engine**: [`src/driveSound.ts`](file:///d:/Projects/theotown/src/driveSound.ts).
- **Vehicles Catalog**: `DRIVE_VEHICLES` in `driveMode.ts` (sports car, SUV, police cruiser, bus, fire truck).

---

## 2. Key Systems & Lifecycle

1. **Entering Drive Mode (`enterDriveMode`)**:
   - Spawns player vehicle on the nearest road tile or map center.
   - Disables standard orbit/pan camera controls (`controls.enabled = false`).
   - Injects the Drive Mode HUD (`drive-mode-hud`) with speedometer, gear indicator, camera cycle button, and vehicle switch button.
   - Activates procedural audio engine.

2. **Vehicle Physics, Steering & Collisions**:
   - `throttle`: Accelerates forward up to vehicle `topSpeed`.
   - `steering`: Turning rate scales inversely with speed for high-speed stability.
   - `boost`: Nitro boost multiplier (`1.8x`) with screen vibration and turbo exhaust sound.
   - Collision detection against building bounding boxes and map boundaries.
   - **NPC Collision Physics**: Contact with NPC vehicles triggers an elastic rebound impulse ($0.18$ units), reverses velocity, and plays `playCrash()` audio.
   - **World Registration**: Updates `world.playerVehicle` continuously so NPC traffic detects and stops for the player.

3. **Camera Modes**:
   - **Chase (`'chase'`)**: Smooth third-person camera following behind vehicle with damping.
   - **Isometric (`'isometric'`)**: Fixed-angle high vantage point centered on car.
   - **Bumper (`'bumper'`)**: First-person low hood camera for fast arcade immersion.

4. **Exiting Drive Mode (`exitDriveMode`)**:
   - Removes player vehicle mesh from the scene.
   - Clears `world.playerVehicle`.
   - Restores main camera position and re-enables `controls.enabled = true`.
   - Stops audio oscillators and removes HUD.

---

## 3. Verification Steps

1. Run `npm run build`.
2. Press the Drive Mode button or shortcut in the HUD.
3. Test WASD driving, nitro boost (`Shift`), horn (`H`), camera cycle (`C`), vehicle cycle (`V`), and exiting via `ESC`.

