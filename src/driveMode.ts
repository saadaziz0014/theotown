import * as THREE from 'three';
import type { CityWorld } from './cityWorld';
import type { VoxelCameraControls } from './controls';
import type { VehicleType } from './types';
import { VoxelVehicleBuilder } from './vehicleBuilder';
import { DriveSoundEngine } from './driveSound';

export type DriveCameraMode = 'chase' | 'isometric' | 'bumper';

export interface DriveVehicleOption {
  id: VehicleType;
  name: string;
  color: number;
  icon: string;
  maxSpeed: number;
  accel: number;
  handling: number;
}

export const DRIVE_VEHICLES: DriveVehicleOption[] = [
  {
    id: 'sports',
    name: 'GT Turbo Sports Car',
    color: 0xef4444, // Cherry red
    icon: '🏎️',
    maxSpeed: 0.165, // ~75 MPH
    accel: 0.0036,
    handling: 0.052
  },
  {
    id: 'police',
    name: 'Interceptor Police Cruiser',
    color: 0x0f172a,
    icon: '🚓',
    maxSpeed: 0.155,
    accel: 0.0034,
    handling: 0.048
  },
  {
    id: 'sedan',
    name: 'Metropolitan Yellow Taxi',
    color: 0xfacc15,
    icon: '🚕',
    maxSpeed: 0.13,
    accel: 0.0026,
    handling: 0.044
  },
  {
    id: 'truck',
    name: 'Heavy Duty Muscle Truck',
    color: 0x3b82f6,
    icon: '🚚',
    maxSpeed: 0.115,
    accel: 0.0022,
    handling: 0.035
  }
];

export class DriveModeController {
  private world: CityWorld;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: VoxelCameraControls;
  private soundEngine = new DriveSoundEngine();

  public isActive: boolean = false;
  public currentVehicleIndex: number = 0;

  // Player Vehicle Physics State
  public x: number = 0;
  public y: number = 0.08;
  public z: number = 0;
  public rotationY: number = 0;
  public speed: number = 0;
  public steerAngle: number = 0;
  public driftFactor: number = 0;

  public nitro: number = 100;
  public isBoosting: boolean = false;
  public isBraking: boolean = false;
  public isReversing: boolean = false;

  // Three.js Objects
  private vehicleGroup: THREE.Group | null = null;
  private wheels: THREE.Mesh[] = [];
  private frontSteerPivots: THREE.Group[] = [];
  private emergencyLights: THREE.Mesh[] = [];
  private boostFlames: THREE.Mesh[] = [];

  // Camera Settings
  public cameraMode: DriveCameraMode = 'chase';
  private targetCamPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private smoothLookAt = new THREE.Vector3();
  private originalCameraPos = new THREE.Vector3();
  private smoothHeading: number = 0;
  private isCamInitialized: boolean = false;

  // Input Keys Tracking
  private keys: Record<string, boolean> = {
    w: false,
    s: false,
    a: false,
    d: false,
    shift: false,
    space: false
  };

  // HUD Elements
  private hudContainer: HTMLElement | null = null;
  private speedEl: HTMLElement | null = null;
  private gearEl: HTMLElement | null = null;
  private boostFillEl: HTMLElement | null = null;
  private vehicleNameEl: HTMLElement | null = null;

  constructor(
    world: CityWorld,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    controls: VoxelCameraControls
  ) {
    this.world = world;
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;

    this.setupKeyListeners();
  }

  private setupKeyListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) {
        if (e.key === 't' || e.key === 'T') {
          this.enterDriveMode();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') this.keys.w = true;
      if (key === 's' || e.key === 'ArrowDown') this.keys.s = true;
      if (key === 'a' || e.key === 'ArrowLeft') this.keys.a = true;
      if (key === 'd' || e.key === 'ArrowRight') this.keys.d = true;
      if (e.key === 'Shift') this.keys.shift = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.keys.space = true;
      }

      if (key === 'h') this.honk();
      if (key === 'c') this.cycleCamera();
      if (key === 'v') this.cycleVehicle();
      if (e.key === 'Escape') this.exitDriveMode();
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;

      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') this.keys.w = false;
      if (key === 's' || e.key === 'ArrowDown') this.keys.s = false;
      if (key === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
      if (key === 'd' || e.key === 'ArrowRight') this.keys.d = false;
      if (e.key === 'Shift') this.keys.shift = false;
      if (e.code === 'Space') this.keys.space = false;
    });
  }

  private normalizeAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  // --- ENTER DRIVE MODE ---
  public enterDriveMode() {
    if (this.isActive) return;
    this.isActive = true;

    // 1. Disable VoxelCameraControls so WASD and mouse do not fight Drive Mode
    if (this.controls) {
      this.controls.enabled = false;
    }

    // Save current camera view to restore later
    this.originalCameraPos.copy(this.camera.position);

    // Find ideal starting spawn on a road or near city center
    let spawnX = 0.5;
    let spawnZ = 0.5;
    let spawnHeading = 0;

    const roads = Array.from(this.world.roads.values());
    if (roads.length > 0) {
      // Pick central road tile
      const road = roads[Math.floor(roads.length / 2)];
      spawnX = road.x + 0.5;
      spawnZ = road.z + 0.5;
      if (road.hasEast || road.hasWest) {
        spawnHeading = Math.PI / 2;
      }
    }

    this.x = spawnX;
    this.z = spawnZ;
    this.y = 0.08;
    this.rotationY = spawnHeading;
    this.smoothHeading = spawnHeading;
    this.speed = 0;
    this.steerAngle = 0;
    this.nitro = 100;
    this.isCamInitialized = false;

    // Reset keys
    this.keys = { w: false, s: false, a: false, d: false, shift: false, space: false };

    // Build vehicle
    this.spawnVehicle();

    // Start engine audio
    this.soundEngine.startEngine();

    // Mount Driving HUD
    this.showDriveHUD();

    // Hide city builder docks and hint box
    this.toggleCityBuilderUI(false);
  }

  // --- EXIT DRIVE MODE ---
  public exitDriveMode() {
    if (!this.isActive) return;
    this.isActive = false;

    // Stop audio
    this.soundEngine.stopEngine();

    // Remove vehicle mesh
    if (this.vehicleGroup) {
      this.scene.remove(this.vehicleGroup);
      this.vehicleGroup.traverse((child: any) => {
        if (child.isMesh) child.geometry?.dispose();
      });
      this.vehicleGroup = null;
    }

    // Hide Driving HUD
    this.hideDriveHUD();

    // Restore FOV
    this.camera.fov = 45;
    this.camera.updateProjectionMatrix();

    // Re-enable camera controls & center orbit on the vehicle position
    if (this.controls) {
      this.controls.enabled = true;
      this.controls.target.set(this.x, 0, this.z);
      this.controls.updateCamera();
    }

    // Clear player vehicle registration in simulation engine
    this.world.playerVehicle = undefined;

    // Restore city builder docks
    this.toggleCityBuilderUI(true);
  }

  private spawnVehicle() {
    if (this.vehicleGroup) {
      this.scene.remove(this.vehicleGroup);
      this.vehicleGroup = null;
    }
    this.wheels = [];
    this.frontSteerPivots = [];
    this.emergencyLights = [];
    this.boostFlames = [];

    const config = DRIVE_VEHICLES[this.currentVehicleIndex];
    const { group, wheels, emergencyLights, frontSteerPivots } = VoxelVehicleBuilder.createVehicle(
      config.id,
      config.color
    );

    this.vehicleGroup = group;
    this.wheels = wheels;
    this.frontSteerPivots = frontSteerPivots || [];
    this.emergencyLights = emergencyLights || [];

    // Add dual high-intensity headlights
    const spotL = new THREE.SpotLight(0xfffbeb, 1.4, 18, Math.PI / 6, 0.45);
    spotL.position.set(-0.16, 0.2, 0.35);
    const targetL = new THREE.Object3D();
    targetL.position.set(-0.16, 0.0, 5.0);
    group.add(targetL);
    spotL.target = targetL;
    group.add(spotL);

    const spotR = new THREE.SpotLight(0xfffbeb, 1.4, 18, Math.PI / 6, 0.45);
    spotR.position.set(0.16, 0.2, 0.35);
    const targetR = new THREE.Object3D();
    targetR.position.set(0.16, 0.0, 5.0);
    group.add(targetR);
    spotR.target = targetR;
    group.add(spotR);

    // Add nitro flame nozzles
    const flameGeo = new THREE.ConeGeometry(0.045, 0.22, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const flame1 = new THREE.Mesh(flameGeo, flameMat);
    flame1.rotation.x = -Math.PI / 2;
    flame1.position.set(-0.11, 0.1, -0.45);
    flame1.visible = false;
    group.add(flame1);
    this.boostFlames.push(flame1);

    const flame2 = new THREE.Mesh(flameGeo, flameMat);
    flame2.rotation.x = -Math.PI / 2;
    flame2.position.set(0.11, 0.1, -0.45);
    flame2.visible = false;
    group.add(flame2);
    this.boostFlames.push(flame2);

    this.vehicleGroup.position.set(this.x, this.y, this.z);
    this.vehicleGroup.rotation.y = this.rotationY;
    this.scene.add(this.vehicleGroup);

    if (this.vehicleNameEl) {
      this.vehicleNameEl.textContent = `${config.icon} ${config.name}`;
    }
  }

  public cycleVehicle() {
    this.currentVehicleIndex = (this.currentVehicleIndex + 1) % DRIVE_VEHICLES.length;
    this.spawnVehicle();
    this.soundEngine.playHorn();
  }

  public cycleCamera() {
    if (this.cameraMode === 'chase') {
      this.cameraMode = 'isometric';
    } else if (this.cameraMode === 'isometric') {
      this.cameraMode = 'bumper';
    } else {
      this.cameraMode = 'chase';
    }

    const camBtn = document.getElementById('btn-drive-cam');
    if (camBtn) {
      const labels: Record<DriveCameraMode, string> = {
        chase: '📷 Chase Cam',
        isometric: '📐 Pocket Cam',
        bumper: '🏎️ Bumper Cam'
      };
      camBtn.innerHTML = `${labels[this.cameraMode]} <kbd>C</kbd>`;
    }
  }

  public honk() {
    this.soundEngine.playHorn();
    // Visual honk shockwave / note
    if (this.vehicleGroup) {
      this.vehicleGroup.position.y += 0.04;
    }
  }

  // --- REAL-TIME TICK LOOP ---
  public update(deltaTime: number) {
    if (!this.isActive || !this.vehicleGroup) return;

    const config = DRIVE_VEHICLES[this.currentVehicleIndex];
    const timeScale = Math.min(deltaTime * 60, 2.0);

    // 1. Acceleration & Braking Physics
    this.isBoosting = this.keys.shift && this.nitro > 5;
    const accelRate = config.accel * (this.isBoosting ? 1.7 : 1.0);
    const currentMaxSpeed = config.maxSpeed * (this.isBoosting ? 1.45 : 1.0);

    if (this.isBoosting) {
      this.nitro = Math.max(0, this.nitro - 0.7 * timeScale);
      for (const flame of this.boostFlames) {
        flame.visible = true;
        flame.scale.set(0.8 + Math.random() * 0.4, 1.0 + Math.random() * 0.5, 0.8 + Math.random() * 0.4);
      }
    } else {
      this.nitro = Math.min(100, this.nitro + 0.25 * timeScale);
      for (const flame of this.boostFlames) {
        flame.visible = false;
      }
    }

    if (this.keys.w) {
      if (this.speed < currentMaxSpeed) {
        this.speed += accelRate * timeScale;
      }
      this.isReversing = false;
      this.isBraking = false;
    } else if (this.keys.s) {
      if (this.speed > 0.005) {
        // Active braking
        this.speed = Math.max(0, this.speed - accelRate * 2.2 * timeScale);
        this.isBraking = true;
        this.isReversing = false;
      } else {
        // Reverse
        this.speed = Math.max(-config.maxSpeed * 0.45, this.speed - accelRate * 0.8 * timeScale);
        this.isReversing = true;
        this.isBraking = false;
      }
    } else {
      // Natural rolling friction / coasting
      this.speed *= Math.pow(0.965, timeScale);
      if (Math.abs(this.speed) < 0.001) this.speed = 0;
      this.isBraking = false;
      this.isReversing = false;
    }

    // 2. Steering & Handbrake Drifting
    const maxSteer = this.keys.space ? 0.65 : 0.45;
    const steerSpeed = 0.12 * timeScale;

    if (this.keys.a) {
      this.steerAngle = Math.min(maxSteer, this.steerAngle + steerSpeed);
    } else if (this.keys.d) {
      this.steerAngle = Math.max(-maxSteer, this.steerAngle - steerSpeed);
    } else {
      this.steerAngle *= Math.pow(0.72, timeScale);
    }

    // Turn front wheels visually
    for (const pivot of this.frontSteerPivots) {
      pivot.rotation.y = this.steerAngle;
    }

    // Handbrake drift rotation
    const isDrifting = this.keys.space && Math.abs(this.speed) > 0.03;
    const steerMultiplier = isDrifting ? 1.85 : 1.0;
    if (Math.abs(this.speed) > 0.002) {
      const turnDir = (this.speed >= 0 ? 1 : -1);
      this.rotationY += this.steerAngle * config.handling * steerMultiplier * (this.speed / config.maxSpeed) * turnDir * timeScale;
    }

    // 3. Position Delta
    const moveStep = this.speed * timeScale;
    this.x += Math.sin(this.rotationY) * moveStep;
    this.z += Math.cos(this.rotationY) * moveStep;

    // Boundary constraints: stay within city map
    const half = (this.world.size / 2) - 1.5;
    if (Math.abs(this.x) > half) {
      this.x = Math.sign(this.x) * half;
      this.speed *= -0.4;
      this.soundEngine.playCrash();
    }
    if (Math.abs(this.z) > half) {
      this.z = Math.sign(this.z) * half;
      this.speed *= -0.4;
      this.soundEngine.playCrash();
    }

    // NPC vehicle collision: bounce away and play crash sound
    for (const npc of this.world.cars) {
      const dist = Math.hypot(npc.x - this.x, npc.z - this.z);
      if (dist < 0.88) {
        const pushAngle = Math.atan2(this.x - npc.x, this.z - npc.z);
        this.x += Math.sin(pushAngle) * 0.18;
        this.z += Math.cos(pushAngle) * 0.18;
        this.speed *= -0.45;
        this.soundEngine.playCrash();
        break;
      }
    }

    // Publish player vehicle state for NPC awareness
    this.world.playerVehicle = {
      x: this.x,
      z: this.z,
      rotationY: this.rotationY,
      speed: this.speed,
      isActive: this.isActive
    };

    // 4. Road & Terrain Elevation Tracking
    const tileX = Math.floor(this.x);
    const tileZ = Math.floor(this.z);
    const road = this.world.roads.get(this.world.getKey(tileX, tileZ));
    const terrainTop = this.world.baseTerrainHeights.get(this.world.getKey(tileX, tileZ)) ?? 0.0;
    const targetY = road ? (road.elevation + 0.04) : Math.max(0.04, terrainTop + 0.04);
    this.y += (targetY - this.y) * 0.2;

    // Tiny suspension bounce
    const bounce = Math.sin(Date.now() * 0.015) * Math.min(0.015, Math.abs(this.speed) * 0.1);

    this.vehicleGroup.position.set(this.x, this.y + bounce, this.z);
    this.vehicleGroup.rotation.y = this.rotationY;

    // Spin wheels
    const wheelSpin = (moveStep / 0.08);
    for (const w of this.wheels) {
      w.rotation.x += wheelSpin;
    }

    // Flash emergency sirens if driving Police Cruiser
    if (config.id === 'police' && this.emergencyLights.length === 2) {
      const flash = Math.floor(Date.now() / 150) % 2;
      this.emergencyLights[0].visible = flash === 0;
      this.emergencyLights[1].visible = flash === 1;
    }

    // 5. Sound Updates
    const speedRatio = Math.abs(this.speed) / config.maxSpeed;
    this.soundEngine.updateEngine(speedRatio, this.keys.w, this.isBoosting);

    // 6. Camera Chase Logic
    this.updateCamera(deltaTime);

    // 7. Update On-Screen HUD
    this.updateHUD(speedRatio);
  }

  private updateCamera(deltaTime: number) {
    if (this.cameraMode === 'isometric') {
      // Signature Pocket City isometric follow view:
      // Fixed 45-degree angle that smoothly tracks the vehicle across streets without rotating
      const isoDist = 8.5;
      const isoHeight = 8.0;
      this.targetCamPos.set(this.x + isoDist, this.y + isoHeight, this.z + isoDist);
      this.targetLookAt.set(this.x, this.y + 0.35, this.z);
    } else if (this.cameraMode === 'bumper') {
      // First-person bumper camera
      const bumperDist = 0.35;
      const bumperHeight = 0.38;
      this.targetCamPos.set(
        this.x + Math.sin(this.rotationY) * bumperDist,
        this.y + bumperHeight,
        this.z + Math.cos(this.rotationY) * bumperDist
      );
      this.targetLookAt.set(
        this.x + Math.sin(this.rotationY) * 6.0,
        this.y + 0.32,
        this.z + Math.cos(this.rotationY) * 6.0
      );
    } else {
      // Default: Smooth 3rd-person Chase View
      // 1. Smooth the heading using shortest-angle difference to eliminate angle snapping & jitter
      const angleDiff = this.normalizeAngle(this.rotationY - this.smoothHeading);
      const headingDamp = Math.min(1.0, 5.5 * deltaTime);
      this.smoothHeading += angleDiff * headingDamp;

      const camDistance = 3.8;
      const camHeight = 1.65;
      const lookAheadDist = 1.2;

      const behindX = this.x - Math.sin(this.smoothHeading) * camDistance;
      const behindZ = this.z - Math.cos(this.smoothHeading) * camDistance;
      const camY = this.y + camHeight;
      this.targetCamPos.set(behindX, camY, behindZ);

      const forwardX = this.x + Math.sin(this.smoothHeading) * lookAheadDist;
      const forwardZ = this.z + Math.cos(this.smoothHeading) * lookAheadDist;
      this.targetLookAt.set(forwardX, this.y + 0.35, forwardZ);
    }

    // Dynamic FOV kick on high speed / nitro boost
    const baseFov = 48;
    const dynamicFov = baseFov + (this.isBoosting ? 8 : 0);
    this.camera.fov += (dynamicFov - this.camera.fov) * Math.min(1.0, 6.0 * deltaTime);
    this.camera.updateProjectionMatrix();

    // On initial spawn, instantly position the camera to avoid flying across the map
    if (!this.isCamInitialized) {
      this.camera.position.copy(this.targetCamPos);
      this.smoothLookAt.copy(this.targetLookAt);
      this.camera.lookAt(this.smoothLookAt);
      this.isCamInitialized = true;
      return;
    }

    // Framerate-independent exponential smoothing for camera position
    const posLerp = 1.0 - Math.exp(-9.0 * deltaTime);
    this.camera.position.lerp(this.targetCamPos, posLerp);

    // Smooth target lookAt so camera orientation NEVER snaps or jerks abruptly
    const lookLerp = 1.0 - Math.exp(-12.0 * deltaTime);
    this.smoothLookAt.lerp(this.targetLookAt, lookLerp);
    this.camera.lookAt(this.smoothLookAt);
  }

  // --- DRIVING HUD & UI ---
  private showDriveHUD() {
    let hud = document.getElementById('drive-mode-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'drive-mode-hud';
      hud.className = 'drive-hud';
      hud.innerHTML = `
        <div class="drive-top-bar">
          <div class="drive-badge">
            <span class="drive-pulse">●</span>
            <span id="drive-vehicle-name">🏎️ GT Turbo Sports Car</span>
          </div>
          <button id="btn-drive-exit" class="drive-exit-btn" title="Exit Drive Mode (ESC)">
            ✕ Exit Drive Mode <kbd>ESC</kbd>
          </button>
        </div>

        <div class="drive-bottom-bar">
          <!-- Speedometer Instrument Cluster -->
          <div class="drive-cluster">
            <div class="speedo-dial">
              <span id="drive-speed-num" class="speed-number">0</span>
              <span class="speed-unit">MPH</span>
            </div>
            <div class="gear-badge" id="drive-gear">P</div>
          </div>

          <!-- Nitro Boost Gauge -->
          <div class="nitro-box">
            <div class="nitro-header">
              <span>⚡ NITRO BOOST</span>
              <span id="nitro-pct">100%</span>
            </div>
            <div class="nitro-track">
              <div id="nitro-fill" class="nitro-fill" style="width: 100%"></div>
            </div>
          </div>

          <!-- Quick Actions Panel -->
          <div class="drive-actions">
            <button id="btn-drive-boost" class="drive-action-btn" title="Nitro Boost (Shift)">
              ⚡ Boost <kbd>Shift</kbd>
            </button>
            <button id="btn-drive-honk" class="drive-action-btn" title="Honk Horn (H)">
              🔊 Honk <kbd>H</kbd>
            </button>
            <button id="btn-drive-cam" class="drive-action-btn" title="Switch Camera (C)">
              📷 Cam <kbd>C</kbd>
            </button>
            <button id="btn-drive-swap" class="drive-action-btn" title="Change Vehicle (V)">
              🔄 Vehicle <kbd>V</kbd>
            </button>
          </div>
        </div>

        <!-- Controls Legend -->
        <div class="drive-legend">
          <span><b>[W/S]</b> Gas & Brake</span>
          <span>•</span>
          <span><b>[A/D]</b> Steer</span>
          <span>•</span>
          <span><b>[Space]</b> Handbrake Drift</span>
          <span>•</span>
          <span><b>[Shift]</b> Boost</span>
          <span>•</span>
          <span><b>[H]</b> Horn</span>
          <span>•</span>
          <span><b>[ESC]</b> Exit</span>
        </div>
      `;
      document.body.appendChild(hud);

      // Bind HUD button clicks
      document.getElementById('btn-drive-exit')?.addEventListener('click', () => this.exitDriveMode());
      document.getElementById('btn-drive-honk')?.addEventListener('click', () => this.honk());
      document.getElementById('btn-drive-cam')?.addEventListener('click', () => this.cycleCamera());
      document.getElementById('btn-drive-swap')?.addEventListener('click', () => this.cycleVehicle());

      const boostBtn = document.getElementById('btn-drive-boost');
      boostBtn?.addEventListener('mousedown', () => { this.keys.shift = true; });
      window.addEventListener('mouseup', () => { this.keys.shift = false; });
    }

    this.hudContainer = hud;
    this.speedEl = document.getElementById('drive-speed-num');
    this.gearEl = document.getElementById('drive-gear');
    this.boostFillEl = document.getElementById('nitro-fill');
    this.vehicleNameEl = document.getElementById('drive-vehicle-name');

    hud.classList.add('visible');
  }

  private hideDriveHUD() {
    if (this.hudContainer) {
      this.hudContainer.classList.remove('visible');
    }
  }

  private updateHUD(speedRatio: number) {
    if (!this.speedEl || !this.gearEl || !this.boostFillEl) return;

    // Convert speed to realistic display MPH (0 to 110 MPH)
    const mph = Math.round(speedRatio * 95 * (this.isBoosting ? 1.25 : 1.0));
    this.speedEl.textContent = mph.toString();

    // Gear indicator
    if (this.isReversing) {
      this.gearEl.textContent = 'R';
      this.gearEl.className = 'gear-badge gear-r';
    } else if (Math.abs(this.speed) < 0.005) {
      this.gearEl.textContent = 'P';
      this.gearEl.className = 'gear-badge gear-p';
    } else {
      this.gearEl.textContent = 'D';
      this.gearEl.className = 'gear-badge gear-d';
    }

    // Nitro gauge
    this.boostFillEl.style.width = `${Math.round(this.nitro)}%`;
    const nitroText = document.getElementById('nitro-pct');
    if (nitroText) {
      nitroText.textContent = `${Math.round(this.nitro)}%`;
    }
  }

  private toggleCityBuilderUI(show: boolean) {
    const header = document.querySelector('header');
    const bottomDock = document.getElementById('bottom-dock');
    const roadSubmenu = document.getElementById('road-submenu');
    const serviceSubmenu = document.getElementById('service-submenu');
    const infoviewDock = document.getElementById('infoview-dock');
    const hintBox = document.getElementById('hint-box');

    if (header) header.style.display = show ? 'flex' : 'none';
    if (bottomDock) bottomDock.style.display = show ? 'flex' : 'none';
    if (roadSubmenu) roadSubmenu.style.display = show ? 'flex' : 'none';
    if (serviceSubmenu) serviceSubmenu.style.display = show ? 'flex' : 'none';
    if (infoviewDock) infoviewDock.style.display = show ? 'flex' : 'none';
    if (hintBox) hintBox.style.display = show ? 'block' : 'none';
  }
}
