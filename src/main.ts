import * as THREE from 'three';
import { CityWorld } from './cityWorld';
import { VoxelCameraControls } from './controls';
import { ROAD_CONFIGS } from './roadBuilder';
import { SERVICE_DEFS } from './serviceBuilder';
import { CITY_PLANS } from './cityPlans';
import { DriveModeController } from './driveMode';
import type { RoadType, ServiceType, ActiveOverlay, BiomeType } from './types';
import './style.css';

class GameApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  public controls: VoxelCameraControls;
  private world: CityWorld;
  public driveMode: DriveModeController;

  private ambientLight!: THREE.AmbientLight;
  private sunLight!: THREE.DirectionalLight;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private currentTool: 'select' | 'road' | 'residential' | 'commercial' | 'industrial' | 'service' | 'move' | 'demolish' | 'pipe' | 'wire' = 'road';
  public selectedRoadType: RoadType = 'suburban';
  private userExplicitRoadType: boolean = false;
  public selectedServiceType: ServiceType = 'power_wind';
  private selectedServiceToMove: { x: number; z: number } | null = null;

  private isMouseDown = false;
  private lastClickedTile = '';
  private lastTime: number = performance.now();

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5c9eb);
    this.scene.fog = new THREE.FogExp2(0xa5c9eb, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.sunLight.position.set(30, 50, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 120;
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.world = new CityWorld(this.scene);
    this.controls = new VoxelCameraControls(this.camera, this.renderer.domElement);
    this.driveMode = new DriveModeController(this.world, this.camera, this.scene, this.controls);

    // Start with a completely virgin, pristine green landscape without pre-built developments
    this.setupUI();
    this.setupInteractions();

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate();

    setInterval(() => {
      this.world.updateSimulation();
      this.updateDayNightCycle();
      this.updateUIStats();
    }, 500);
  }



  private updateDayNightCycle() {
    const t = this.world.stats.timeOfDay; // 0 to 24
    const phase = this.world.stats.timePhase;

    // Sun / Moon continuous angular progression around the city
    const sunAngle = ((t - 6) / 24) * Math.PI * 2;
    this.sunLight.position.x = Math.cos(sunAngle) * 55;
    this.sunLight.position.y = Math.max(-20, Math.sin(sunAngle) * 55);
    this.sunLight.position.z = Math.sin(sunAngle * 0.5) * 30;

    const skyColor = new THREE.Color();
    const sunColor = new THREE.Color();

    let ambientInt = 0.65;
    let sunInt = 1.2;
    let streetLightGlow = false;

    switch (phase) {
      case 'Early Morning': { // 5:00 - 8:00 (Warm golden pink sunrise)
        skyColor.setHex(0xfda4af); // Soft rose sky
        sunColor.setHex(0xfef08a); // Golden yellow low sun
        ambientInt = 0.55;
        sunInt = 0.9;
        streetLightGlow = (t < 6.5); // Streetlights turning off
        break;
      }
      case 'Morning': { // 8:00 - 12:00 (Clear bright fresh daylight)
        skyColor.setHex(0x93c5fd); // Fresh light blue
        sunColor.setHex(0xfffaed); // Bright white sunlight
        ambientInt = 0.75;
        sunInt = 1.25;
        streetLightGlow = false;
        break;
      }
      case 'Noon': { // 12:00 - 14:00 (Vibrant zenith daylight)
        skyColor.setHex(0x60a5fa); // Deep blue noon sky
        sunColor.setHex(0xffffff); // Pure overhead sun
        ambientInt = 0.85;
        sunInt = 1.35;
        streetLightGlow = false;
        break;
      }
      case 'Afternoon': { // 14:00 - 17:30 (Warm honey afternoon glow)
        skyColor.setHex(0x7dd3fc); // Warm clear sky
        sunColor.setHex(0xfde047); // Warm amber sunlight
        ambientInt = 0.72;
        sunInt = 1.15;
        streetLightGlow = false;
        break;
      }
      case 'Evening': { // 17:30 - 20:30 (SimCity-style magical golden sunset!)
        skyColor.setHex(0xf97316); // Dramatic orange-amber twilight
        sunColor.setHex(0xfb923c); // Setting golden sun
        ambientInt = 0.58; // Beautiful visibility, not dark
        sunInt = 0.85;
        streetLightGlow = true; // Streetlights and building windows turn ON!
        break;
      }
      case 'Night': { // 20:30 - 5:00 (SimCity / CS2 deep indigo night with glowing lights)
        skyColor.setHex(0x1e1e38); // Deep indigo night sky (comfortably visible)
        sunColor.setHex(0x93c5fd); // Cool blue moonlight
        ambientInt = 0.48; // Kept bright enough so roads and city are clearly visible
        sunInt = 0.42;
        streetLightGlow = true;
        break;
      }
    }

    this.scene.background = skyColor;
    if (this.scene.fog) {
      this.scene.fog.color = skyColor;
    }

    this.ambientLight.intensity = ambientInt;
    this.sunLight.intensity = sunInt;
    this.sunLight.color = sunColor;

    // Toggle SimCity-style streetlights & illuminated building windows
    for (const lamp of this.world.streetLightsList) {
      if (lamp.mesh && (lamp.mesh.material as any).color) {
        (lamp.mesh.material as any).color.setHex(streetLightGlow ? 0xffea00 : 0x71717a);
      }
      if (lamp.light) {
        lamp.light.visible = streetLightGlow;
      }
    }

    for (const win of this.world.windowMeshesList) {
      if (win.mesh && (win.mesh.material as any).color) {
        (win.mesh.material as any).color.setHex(streetLightGlow ? win.originalColor : 0x475569);
      }
    }
  }

  private setupUI() {
    const toolButtons = document.querySelectorAll<HTMLButtonElement>('.tool-btn');
    const roadSubmenu = document.getElementById('road-submenu');
    const serviceSubmenu = document.getElementById('service-submenu');

    toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool as any;

        // Submenus visibility
        if (roadSubmenu) {
          roadSubmenu.classList.toggle('visible', this.currentTool === 'road');
        }
        if (serviceSubmenu) {
          serviceSubmenu.classList.toggle('visible', this.currentTool === 'service');
        }

        // Automatic TheoTown underground view mode handling
        const hintText = document.getElementById('hint-text');
        if (this.currentTool === 'pipe') {
          this.world.setUndergroundMode(true);
          if (hintText) {
            hintText.innerHTML = `💧 <b>Water Pipeline Tool</b>: Click or drag to lay underground pipes ($5). Connect to Water Towers or Water Tanks to supply fresh water!`;
          }
        } else if (this.currentTool === 'wire') {
          this.world.setUndergroundMode(true);
          if (hintText) {
            hintText.innerHTML = `⚡ <b>Underground Electric Wires</b>: Click or drag to lay power conduits ($5). Connect to Wind Turbines or Coal Plants to electrify buildings!`;
          }
        } else {
          if (!this.world.isUndergroundMode && this.world.activeOverlay === 'none') {
            this.world.setUndergroundMode(false);
          }
        }
      });
    });

    // Dedicated Underground View Mode Toggle button
    const undergroundBtn = document.getElementById('btn-toggle-underground');
    undergroundBtn?.addEventListener('click', () => {
      const newState = !this.world.isUndergroundMode;
      undergroundBtn.classList.toggle('active', newState);
      this.world.setUndergroundMode(newState);
      const hintText = document.getElementById('hint-text');
      if (hintText) {
        hintText.innerHTML = newState
          ? `🕳️ <b>Underground Subterranean View</b>: Showing water pipelines, electric conduits, and coverage zones.`
          : `🌍 <b>Surface View</b> restored.`;
      }
    });

    // Road selection
    const roadTypeButtons = document.querySelectorAll<HTMLButtonElement>('.road-type-btn');
    roadTypeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        roadTypeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRoadType = (btn.dataset.roadType || 'suburban') as RoadType;
        this.userExplicitRoadType = true;
        this.selectTool('road');
      });
    });

    // Service selection
    const serviceTypeButtons = document.querySelectorAll<HTMLButtonElement>('.service-type-btn');
    serviceTypeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        serviceTypeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedServiceType = (btn.dataset.serviceType || 'power_wind') as ServiceType;
        this.selectTool('service');
      });
    });

    // Overlay pills (CS2 Infoviews)
    const overlayButtons = document.querySelectorAll<HTMLButtonElement>('.overlay-btn');
    overlayButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const overlay = (btn.dataset.overlay || 'none') as ActiveOverlay;
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          this.world.setOverlay('none');
        } else {
          overlayButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.world.setOverlay(overlay);
        }
      });
    });

    // Predefined City Plans Loader
    const planButtons = document.querySelectorAll<HTMLButtonElement>('.plan-pill-btn');
    planButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const planId = btn.dataset.planId;
        const plan = CITY_PLANS.find(p => p.id === planId);
        if (plan) {
          planButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          plan.load(this.world);
          this.updateUIStats();
          this.updateDayNightCycle();
        }
      });
    });

    // Biome / Area Terrain Selector
    const biomeButtons = document.querySelectorAll<HTMLButtonElement>('.biome-pill-btn');
    biomeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const biome = (btn.dataset.biome || 'valley') as BiomeType;
        biomeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.world.generateBiome(biome);
        this.updateUIStats();
        this.updateDayNightCycle();
      });
    });

    // Tax slider
    const taxSlider = document.getElementById('tax-slider') as HTMLInputElement;
    const taxVal = document.getElementById('tax-val');
    if (taxSlider && taxVal) {
      taxSlider.addEventListener('input', () => {
        const rate = parseInt(taxSlider.value);
        this.world.stats.taxRate = rate;
        taxVal.textContent = `${rate}%`;
      });
    }

    // Simulation Speed buttons (Calibrated: 1x = 0.5x relaxing real-time pace, 2x = 2x fast, 3x = 4x super fast)
    const speedButtons = document.querySelectorAll<HTMLButtonElement>('.speed-btn');
    const speedMap: Record<string, number> = {
      '0': 0,
      '1': 0.5, // gentle, relaxing, realistic city pace
      '2': 2.0, // fast forward
      '3': 4.0  // super fast forward
    };

    speedButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const speedKey = btn.dataset.speed || '1';
        this.world.stats.gameSpeed = speedMap[speedKey] ?? 0.5;
      });
    });

    // Pocket City Drive Mode Launcher
    const driveBtn = document.getElementById('btn-drive-mode');
    driveBtn?.addEventListener('click', () => {
      this.driveMode.enterDriveMode();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        if (!this.driveMode.isActive) {
          this.driveMode.enterDriveMode();
        } else {
          this.driveMode.exitDriveMode();
        }
        return;
      }

      if (this.driveMode.isActive) return;

      if (e.key === 'r' || e.key === 'R') this.selectTool('road');
      if (e.key === '1') this.selectTool('residential');
      if (e.key === '2') this.selectTool('commercial');
      if (e.key === '3') this.selectTool('industrial');
      if (e.key === 's' || e.key === 'S') this.selectTool('service');
      if (e.key === 'p' || e.key === 'P') this.selectTool('pipe');
      if (e.key === 'o' || e.key === 'O') this.selectTool('wire');
      if (e.key === 'u' || e.key === 'U') {
        const undergroundBtn = document.getElementById('btn-toggle-underground');
        undergroundBtn?.click();
      }
      if (e.key === 'm' || e.key === 'M') this.selectTool('move');
      if (e.key === 'x' || e.key === 'X') this.selectTool('demolish');
      if (e.key === 'v' || e.key === 'V') this.selectTool('select');
    });
  }

  private selectTool(tool: string) {
    const btn = document.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`);
    if (btn) btn.click();
  }

  private updateUIStats() {
    const moneyEl = document.getElementById('stat-money');
    const popEl = document.getElementById('stat-pop');
    const dayEl = document.getElementById('stat-day');
    const clockEl = document.getElementById('stat-clock');
    const happyEl = document.getElementById('stat-happy');
    const powerEl = document.getElementById('stat-power');
    const waterEl = document.getElementById('stat-water');
    const flowEl = document.getElementById('stat-flow');

    if (moneyEl) moneyEl.textContent = `$${this.world.stats.money.toLocaleString()}`;
    if (popEl) popEl.textContent = this.world.stats.population.toLocaleString();
    if (dayEl) dayEl.textContent = `Day ${this.world.stats.day}`;

    // Format 24-hr clock (e.g. 14:30)
    const hours = Math.floor(this.world.stats.timeOfDay);
    const mins = Math.floor((this.world.stats.timeOfDay % 1) * 60);
    if (clockEl) {
      clockEl.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} (${this.world.stats.timePhase})`;
    }

    if (happyEl) happyEl.textContent = `${this.world.stats.happiness}%`;
    if (powerEl) {
      powerEl.textContent = `${this.world.stats.powerDemand}/${this.world.stats.powerCapacity} MW (${this.world.stats.powerCoveredPct}% Grid)`;
    }
    if (waterEl) {
      waterEl.textContent = `${this.world.stats.waterDemand}/${this.world.stats.waterCapacity} m³ (${this.world.stats.waterCoveredPct}% Pipes)`;
    }

    if (flowEl) {
      const net = this.world.stats.income - this.world.stats.expenses;
      flowEl.textContent = `${net >= 0 ? '+' : ''}$${net}/day`;
      flowEl.className = `stat-val ${net >= 0 ? 'flow-pos' : 'flow-neg'}`;
    }
  }

  private setupInteractions() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (this.driveMode.isActive) return;
      // If holding space (Illustrator hand tool), don't build or demolish
      if (this.controls.isSpacePressed) return;

      if (e.button === 0) {
        this.isMouseDown = true;
        this.handleGridAction(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.driveMode.isActive) {
        this.world.clearHighlight();
        return;
      }
      if (this.controls.isSpacePressed) {
        this.world.clearHighlight();
        return;
      }
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersection = new THREE.Vector3();
      const hits = this.raycaster.ray.intersectPlane(this.plane, intersection);

      if (hits) {
        const tileX = Math.floor(intersection.x);
        const tileZ = Math.floor(intersection.z);

        const half = this.world.size / 2;
        if (tileX >= -half && tileX < half && tileZ >= -half && tileZ < half) {
          const isValid = this.isActionValid();
          const explicitType = this.userExplicitRoadType ? this.selectedRoadType : undefined;
          this.world.setHighlight(tileX, tileZ, isValid, this.currentTool, explicitType);

          if (this.isMouseDown) {
            const tileKey = `${tileX},${tileZ}`;
            if (tileKey !== this.lastClickedTile) {
              this.handleGridAction(e.clientX, e.clientY);
            }
          }
        } else {
          this.world.clearHighlight();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      this.lastClickedTile = '';
    });
  }

  private isActionValid(): boolean {
    if (this.currentTool === 'road') {
      const cost = ROAD_CONFIGS[this.selectedRoadType]?.cost || 20;
      return this.world.stats.money >= cost;
    }
    if (this.currentTool === 'service') {
      const cost = SERVICE_DEFS[this.selectedServiceType]?.cost || 100;
      return this.world.stats.money >= cost;
    }
    if (this.currentTool === 'pipe' || this.currentTool === 'wire') {
      return this.world.stats.money >= 5;
    }
    if (this.currentTool === 'residential' || this.currentTool === 'commercial' || this.currentTool === 'industrial') {
      return this.world.stats.money >= 10;
    }
    return true;
  }

  private handleGridAction(clientX: number, clientY: number) {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    const hits = this.raycaster.ray.intersectPlane(this.plane, intersection);

    if (hits) {
      const tileX = Math.floor(intersection.x);
      const tileZ = Math.floor(intersection.z);
      this.lastClickedTile = `${tileX},${tileZ}`;

      switch (this.currentTool) {
        case 'road':
          const autoMatch = !this.userExplicitRoadType;
          this.world.placeRoad(tileX, tileZ, this.selectedRoadType, autoMatch);
          this.updateUIStats();
          break;
        case 'residential':
          this.world.placeZone(tileX, tileZ, 'residential');
          this.updateUIStats();
          break;
        case 'commercial':
          this.world.placeZone(tileX, tileZ, 'commercial');
          this.updateUIStats();
          break;
        case 'industrial':
          this.world.placeZone(tileX, tileZ, 'industrial');
          this.updateUIStats();
          break;
        case 'service':
          this.world.placeService(tileX, tileZ, this.selectedServiceType);
          this.updateUIStats();
          break;
        case 'pipe':
          this.world.placePipe(tileX, tileZ, 5);
          this.updateUIStats();
          break;
        case 'wire':
          this.world.placeWire(tileX, tileZ, 5);
          this.updateUIStats();
          break;
        case 'move':
          this.handleMoveAction(tileX, tileZ);
          break;
        case 'demolish':
          this.world.demolish(tileX, tileZ);
          this.updateUIStats();
          break;
      }
    }
  }

  private handleMoveAction(tileX: number, tileZ: number) {
    const hintText = document.getElementById('hint-text');

    if (!this.selectedServiceToMove) {
      // Step 1: Select service to move
      const service = this.world.services.get(this.world.getKey(tileX, tileZ));
      if (service) {
        this.selectedServiceToMove = { x: tileX, z: tileZ };
        if (hintText) {
          hintText.innerHTML = `📍 Selected <b>${service.type.replace('_', ' ')}</b>. Click a new location to relocate it ($20 fee).`;
        }
      } else {
        if (hintText) {
          hintText.innerHTML = `⚠️ Click on a <b>Service Building</b> (Power, Water, Police, Park, etc.) to pick it up.`;
        }
      }
    } else {
      // Step 2: Place service at target location
      const success = this.world.moveService(
        this.selectedServiceToMove.x,
        this.selectedServiceToMove.z,
        tileX,
        tileZ
      );

      if (success) {
        if (hintText) {
          hintText.innerHTML = `✅ Service relocated successfully! Click another service to move or switch tools.`;
        }
        this.selectedServiceToMove = null;
        this.updateUIStats();
      } else {
        if (hintText) {
          hintText.innerHTML = `❌ Cannot place here. Must be an empty tile away from roads. Click again or pick another tile.`;
        }
      }
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.driveMode.isActive) {
      this.driveMode.update(deltaTime);
    }

    this.world.updatePhysics(deltaTime);
    this.renderer.render(this.scene, this.camera);
  }
}

new GameApp();
