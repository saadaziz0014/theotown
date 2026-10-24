import * as THREE from 'three';
import type { ServiceType, ServiceBuildingDef, PlacedService } from './types';

export const SERVICE_DEFS: Record<ServiceType, ServiceBuildingDef> = {
  power_wind: {
    id: 'power_wind',
    category: 'power',
    name: 'Wind Turbine',
    cost: 150,
    upkeep: 5,
    range: 12,
    powerOutput: 40,
    pollutionRadius: 0,
    happinessBonus: 2,
    icon: '💨',
    description: 'Clean renewable electricity generation'
  },
  power_coal: {
    id: 'power_coal',
    category: 'power',
    name: 'Coal Power Plant',
    cost: 500,
    upkeep: 25,
    range: 24,
    powerOutput: 180,
    pollutionRadius: 8,
    happinessBonus: -5,
    icon: '🏭',
    description: 'High capacity electricity, generates industrial smog'
  },
  power_solar: {
    id: 'power_solar',
    category: 'power',
    name: 'Solar Power Farm',
    cost: 320,
    upkeep: 8,
    range: 16,
    powerOutput: 85,
    pollutionRadius: 0,
    happinessBonus: 5,
    icon: '☀️',
    description: 'Zero-emission photovoltaic solar panel arrays'
  },
  power_gas: {
    id: 'power_gas',
    category: 'power',
    name: 'Gas Power Plant',
    cost: 450,
    upkeep: 20,
    range: 22,
    powerOutput: 160,
    pollutionRadius: 4,
    happinessBonus: 0,
    icon: '🔥',
    description: 'Clean-burning thermal gas turbines with low emissions'
  },
  power_nuclear: {
    id: 'power_nuclear',
    category: 'power',
    name: 'Nuclear Power Plant',
    cost: 1400,
    upkeep: 65,
    range: 35,
    powerOutput: 600,
    pollutionRadius: 2,
    happinessBonus: -2,
    icon: '⚛️',
    description: 'Massive baseload atomic energy with cooling tower'
  },
  power_fusion: {
    id: 'power_fusion',
    category: 'power',
    name: 'Tokamak Fusion Plant',
    cost: 3200,
    upkeep: 120,
    range: 50,
    powerOutput: 1800,
    pollutionRadius: 0,
    happinessBonus: 15,
    icon: '🌌',
    description: 'Limitless next-gen magnetic confinement fusion clean energy'
  },
  water_tower: {
    id: 'water_tower',
    category: 'water',
    name: 'Water Tower',
    cost: 120,
    upkeep: 4,
    range: 14,
    waterOutput: 60,
    happinessBonus: 2,
    icon: '💧',
    description: 'Fresh municipal water supply pressure'
  },
  water_tank: {
    id: 'water_tank',
    category: 'water',
    name: 'Water Reservoir Tank',
    cost: 180,
    upkeep: 6,
    range: 16,
    waterOutput: 120,
    happinessBonus: 3,
    icon: '🚰',
    description: 'High-capacity municipal water reservoir for pipeline networks'
  },
  police_station: {
    id: 'police_station',
    category: 'services',
    name: 'Police Precinct',
    cost: 250,
    upkeep: 12,
    range: 15,
    happinessBonus: 8,
    icon: '👮',
    description: 'Suppresses crime and keeps neighborhoods safe'
  },
  fire_station: {
    id: 'fire_station',
    category: 'services',
    name: 'Fire Station',
    cost: 250,
    upkeep: 12,
    range: 15,
    happinessBonus: 8,
    icon: '🚒',
    description: 'Prevents building fires and emergency hazards'
  },
  hospital: {
    id: 'hospital',
    category: 'services',
    name: 'Clinic / Hospital',
    cost: 350,
    upkeep: 18,
    range: 16,
    happinessBonus: 12,
    icon: '🏥',
    description: 'Provides healthcare and increases citizen lifespans'
  },
  park: {
    id: 'park',
    category: 'park',
    name: 'Urban Park',
    cost: 80,
    upkeep: 2,
    range: 10,
    happinessBonus: 15,
    icon: '🌲',
    description: 'Beautiful greenery, benches and fountains for citizen leisure'
  }
};

export class VoxelServiceBuilder {
  public static buildService(service: PlacedService): { group: THREE.Group; animatedParts?: any[] } {
    const group = new THREE.Group();
    group.position.set(service.x + 0.5, 0, service.z + 0.5);
    const animatedParts: any[] = [];

    switch (service.type) {
      case 'power_wind':
        this.buildWindTurbine(group, animatedParts);
        break;
      case 'power_coal':
        this.buildCoalPlant(group, animatedParts);
        break;
      case 'power_solar':
        this.buildSolarFarm(group);
        break;
      case 'power_gas':
        this.buildGasPlant(group, animatedParts);
        break;
      case 'power_nuclear':
        this.buildNuclearPlant(group, animatedParts);
        break;
      case 'power_fusion':
        this.buildFusionPlant(group, animatedParts);
        break;
      case 'water_tower':
        this.buildWaterTower(group);
        break;
      case 'water_tank':
        this.buildWaterTank(group);
        break;
      case 'police_station':
        this.buildPoliceStation(group);
        break;
      case 'fire_station':
        this.buildFireStation(group);
        break;
      case 'hospital':
        this.buildHospital(group);
        break;
      case 'park':
        this.buildPark(group);
        break;
    }

    // Spawn pop animation
    group.scale.set(0.1, 0.1, 0.1);
    const pop = () => {
      if (group.scale.x < 1) {
        group.scale.addScalar(0.18);
        requestAnimationFrame(pop);
      } else {
        group.scale.set(1, 1, 1);
      }
    };
    pop();

    return { group, animatedParts };
  }

  // --- 1. Wind Turbine ---
  private static buildWindTurbine(group: THREE.Group, animatedParts: any[]) {
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const greyMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });

    // Base concrete pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), greyMat);
    pad.position.y = 0.04;
    group.add(pad);

    // Tower mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.8, 8), whiteMat);
    mast.position.y = 0.94;
    mast.castShadow = true;
    group.add(mast);

    // Nacelle (generator pod)
    const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.28), whiteMat);
    nacelle.position.set(0, 1.84, 0.04);
    group.add(nacelle);

    // Rotor Hub
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 1.84, 0.18);

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), greyMat);
    rotorGroup.add(hub);

    // 3 Aerodynamic Blades
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.02), whiteMat);
      blade.position.set(Math.sin(angle) * 0.4, Math.cos(angle) * 0.4, 0);
      blade.rotation.z = -angle;
      rotorGroup.add(blade);
    }

    group.add(rotorGroup);
    animatedParts.push({ type: 'spin_z', object: rotorGroup, speed: 0.04 });
  }

  // --- 2. Coal Power Plant ---
  private static buildCoalPlant(group: THREE.Group, animatedParts: any[]) {
    const brickMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.4 });

    // Main boiler building
    const boiler = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.8, 0.85), brickMat);
    boiler.position.y = 0.4;
    boiler.castShadow = true;
    group.add(boiler);

    // Tall Smokestack
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 8), metalMat);
    stack.position.set(0.25, 1.1, 0.25);
    stack.castShadow = true;
    group.add(stack);

    // Red warning light
    const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLight.position.set(0.25, 1.92, 0.25);
    group.add(redLight);

    // Smokestack smoke puff
    const smokePuff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), smokeMat);
    smokePuff.position.set(0.25, 2.05, 0.25);
    group.add(smokePuff);
    animatedParts.push({ type: 'pulse_smoke', object: smokePuff });
  }

  // --- 2b. Solar Power Farm ---
  private static buildSolarFarm(group: THREE.Group) {
    const gravelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const solarMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const greenLed = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    // Foundation gravel slab
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), gravelMat);
    base.position.y = 0.02;
    group.add(base);

    // Central electrical inverter control unit
    const inverter = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), boxMat);
    inverter.position.set(-0.25, 0.12, 0);
    group.add(inverter);

    const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), greenLed);
    led.position.set(-0.25, 0.22, 0.11);
    group.add(led);

    // 2 Tilted Solar Panel Arrays
    const panelConfigs = [
      { z: -0.22, y: 0.16 },
      { z: 0.22, y: 0.16 }
    ];

    for (const cfg of panelConfigs) {
      // Metallic mounting frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.32), frameMat);
      frame.position.set(0.06, cfg.y, cfg.z);
      frame.rotation.x = -0.32;
      group.add(frame);

      // Deep blue photovoltaic panel
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.02, 0.28), solarMat);
      panel.position.set(0.06, cfg.y + 0.02, cfg.z);
      panel.rotation.x = -0.32;
      group.add(panel);

      // Support pillars
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16), frameMat);
      post1.position.set(-0.28, 0.08, cfg.z);
      group.add(post1);

      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16), frameMat);
      post2.position.set(0.38, 0.08, cfg.z);
      group.add(post2);
    }
  }

  // --- 2c. Gas Power Plant ---
  private static buildGasPlant(group: THREE.Group, animatedParts: any[]) {
    const padMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const hallMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const silverMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const redPipeMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const ventMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const heatMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.3 });

    // Foundation pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), padMat);
    pad.position.y = 0.03;
    group.add(pad);

    // Turbine hall building
    const hall = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.75), hallMat);
    hall.position.set(0.18, 0.25, 0);
    hall.castShadow = true;
    group.add(hall);

    // Twin cylindrical gas storage tanks
    const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 12), silverMat);
    tank1.position.set(-0.24, 0.3, -0.18);
    tank1.castShadow = true;
    group.add(tank1);

    const tank2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 12), silverMat);
    tank2.position.set(-0.24, 0.3, 0.18);
    tank2.castShadow = true;
    group.add(tank2);

    // Red high-pressure gas conduits
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.04), redPipeMat);
    pipe.position.set(-0.06, 0.22, 0);
    group.add(pipe);

    // Twin exhaust stacks
    const stack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.85, 8), ventMat);
    stack1.position.set(0.2, 0.75, -0.2);
    group.add(stack1);

    const stack2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.85, 8), ventMat);
    stack2.position.set(0.2, 0.75, 0.2);
    group.add(stack2);

    // Animated gas exhaust vapor
    const vapor1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), heatMat);
    vapor1.position.set(0.2, 1.2, -0.2);
    group.add(vapor1);
    animatedParts.push({ type: 'pulse_smoke', object: vapor1 });

    const vapor2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), heatMat);
    vapor2.position.set(0.2, 1.2, 0.2);
    group.add(vapor2);
    animatedParts.push({ type: 'pulse_smoke', object: vapor2 });
  }

  // --- 2d. Nuclear Power Plant ---
  private static buildNuclearPlant(group: THREE.Group, animatedParts: any[]) {
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
    const towerMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const yellowHazardMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });

    // Reinforced concrete base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.92), darkMat);
    base.position.y = 0.04;
    group.add(base);

    // Containment Dome (Reactor building)
    const domeCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.22, 16), concreteMat);
    domeCylinder.position.set(-0.2, 0.17, -0.18);
    group.add(domeCylinder);

    const domeCap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), concreteMat);
    domeCap.position.set(-0.2, 0.28, -0.18);
    group.add(domeCap);

    // Iconic Hyperbolic Cooling Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.15, 16), towerMat);
    tower.position.set(0.2, 0.65, 0.16);
    tower.castShadow = true;
    group.add(tower);

    const towerLip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.06, 16), darkMat);
    towerLip.position.set(0.2, 1.23, 0.16);
    group.add(towerLip);

    // Turbine Hall
    const hall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.36), concreteMat);
    hall.position.set(-0.16, 0.22, 0.22);
    group.add(hall);

    // Radiation hazard yellow badge
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), yellowHazardMat);
    badge.position.set(0.06, 0.22, 0.22);
    group.add(badge);

    // White cooling tower steam
    const steamPuff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), steamMat);
    steamPuff.position.set(0.2, 1.38, 0.16);
    group.add(steamPuff);
    animatedParts.push({ type: 'pulse_smoke', object: steamPuff });
  }

  // --- 2e. Tokamak Fusion Reactor ---
  private static buildFusionPlant(group: THREE.Group, animatedParts: any[]) {
    const darkHexMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const torusChamberMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const magnetMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const plasmaCoreMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.38 });

    // Hexagonal foundation pedestal
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.12, 6), darkHexMat);
    hex.position.y = 0.06;
    group.add(hex);

    // Magnetic confinement chamber (Tokamak torus)
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 10, 24), torusChamberMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.32;
    group.add(torus);

    // 6 Poloidal Magnetic Coils around the torus
    for (let c = 0; c < 6; c++) {
      const angle = (c * Math.PI * 2) / 6;
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16), magnetMat);
      coil.position.set(Math.cos(angle) * 0.28, 0.32, Math.sin(angle) * 0.28);
      coil.rotation.y = -angle;
      group.add(coil);
    }

    // Glowing Central Plasma Core
    const plasmaGroup = new THREE.Group();
    plasmaGroup.position.set(0, 0.32, 0);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), plasmaCoreMat);
    plasmaGroup.add(core);

    const aura = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), auraMat);
    plasmaGroup.add(aura);

    group.add(plasmaGroup);
    animatedParts.push({ type: 'spin_y', object: plasmaGroup, speed: 0.05 });
  }

  // --- 3. Water Tower ---
  private static buildWaterTower(group: THREE.Group) {
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const tankMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });

    // 4 Steel Legs
    const legGeo = new THREE.BoxGeometry(0.05, 1.1, 0.05);
    const coords = [-0.25, 0.25];
    for (const x of coords) {
      for (const z of coords) {
        const leg = new THREE.Mesh(legGeo, steelMat);
        leg.position.set(x, 0.55, z);
        group.add(leg);
      }
    }

    // Central supply pipe
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1), steelMat);
    pipe.position.y = 0.55;
    group.add(pipe);

    // Water reservoir sphere/cylinder
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 0.5, 12), tankMat);
    tank.position.y = 1.35;
    tank.castShadow = true;
    group.add(tank);

    // Roof dome
    const dome = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.2, 12), tankMat);
    dome.position.y = 1.7;
    group.add(dome);
  }

  // --- 3B. High-Capacity Municipal Water Reservoir Tank ---
  private static buildWaterTank(group: THREE.Group) {
    const padMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const tankMat1 = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const tankMat2 = new THREE.MeshLambertMaterial({ color: 0x0369a1 });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const pumpMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const valveMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

    // Concrete Pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), padMat);
    pad.position.y = 0.04;
    group.add(pad);

    // Dual Twin Storage Cylinders
    const tankGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.65, 14);
    const roofGeo = new THREE.ConeGeometry(0.21, 0.1, 14);

    const tank1 = new THREE.Mesh(tankGeo, tankMat1);
    tank1.position.set(-0.2, 0.4, -0.1);
    tank1.castShadow = true;
    group.add(tank1);
    const roof1 = new THREE.Mesh(roofGeo, steelMat);
    roof1.position.set(-0.2, 0.77, -0.1);
    group.add(roof1);

    const tank2 = new THREE.Mesh(tankGeo, tankMat2);
    tank2.position.set(0.2, 0.4, -0.1);
    tank2.castShadow = true;
    group.add(tank2);
    const roof2 = new THREE.Mesh(roofGeo, steelMat);
    roof2.position.set(0.2, 0.77, -0.1);
    group.add(roof2);

    // Cross-connecting manifold pipe between tanks
    const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38), steelMat);
    manifold.rotation.z = Math.PI / 2;
    manifold.position.set(0, 0.5, -0.1);
    group.add(manifold);

    // Red pressure control valve wheel
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), valveMat);
    valve.position.set(0, 0.58, -0.1);
    group.add(valve);

    // Front high-pressure pumping station cabin
    const pumpStation = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.28), pumpMat);
    pumpStation.position.set(0, 0.2, 0.25);
    pumpStation.castShadow = true;
    group.add(pumpStation);

    // Subterranean discharge pipeline heading straight underground
    const downPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), steelMat);
    downPipe.position.set(0, 0.05, 0.12);
    group.add(downPipe);
  }

  // --- 4. Police Station ---
  private static buildPoliceStation(group: THREE.Group) {
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const blueStripe = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x93c5fd });

    // Main station block
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.85), stoneMat);
    bldg.position.y = 0.45;
    bldg.castShadow = true;
    group.add(bldg);

    // Blue department stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.1, 0.87), blueStripe);
    stripe.position.y = 0.7;
    group.add(stripe);

    // Rooftop Communications Antenna
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    ant.position.set(0.2, 1.25, 0.2);
    group.add(ant);

    // Front glass door entrance
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.02), glassMat);
    door.position.set(0, 0.15, 0.435);
    group.add(door);
  }

  // --- 5. Fire Station ---
  private static buildFireStation(group: THREE.Group) {
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    const doorMat = new THREE.MeshLambertMaterial({ color: 0xdcfce7 });

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), brickMat);
    bldg.position.y = 0.425;
    bldg.castShadow = true;
    group.add(bldg);

    // 2 Red apparatus bay doors
    const bayGeo = new THREE.BoxGeometry(0.32, 0.38, 0.02);
    const b1 = new THREE.Mesh(bayGeo, doorMat);
    b1.position.set(-0.2, 0.19, 0.435);
    group.add(b1);

    const b2 = new THREE.Mesh(bayGeo, doorMat);
    b2.position.set(0.2, 0.19, 0.435);
    group.add(b2);

    // Siren beacon on roof
    const siren = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    siren.position.set(0, 0.89, 0);
    group.add(siren);
  }

  // --- 6. Hospital ---
  private static buildHospital(group: THREE.Group) {
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

    // Main multi-story hospital wing
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.85), whiteMat);
    wing.position.y = 0.6;
    wing.castShadow = true;
    group.add(wing);

    // Red Cross Emblem on facade
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.02), redMat);
    crossV.position.set(0, 0.85, 0.435);
    group.add(crossV);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.02), redMat);
    crossH.position.set(0, 0.85, 0.435);
    group.add(crossH);

    // Rooftop Helipad
    const helipad = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.65), new THREE.MeshLambertMaterial({ color: 0x475569 }));
    helipad.position.y = 1.22;
    group.add(helipad);

    // "H" marking on helipad
    const hMark = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.3), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    hMark.position.y = 1.25;
    group.add(hMark);
  }

  // --- 7. Urban Park ---
  private static buildPark(group: THREE.Group) {
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x65a30d });
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x0ea5e9 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });

    // Lush grass lawn base
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.04, 0.96), grassMat);
    lawn.position.y = 0.02;
    group.add(lawn);

    // Cobblestone walking paths
    const path = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.01, 0.2), pathMat);
    path.position.y = 0.045;
    group.add(path);

    // Central Fountain Basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8), pathMat);
    basin.position.y = 0.08;
    group.add(basin);

    const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 8), waterMat);
    fountainWater.position.y = 0.1;
    group.add(fountainWater);

    // Park Trees
    const treeCoords = [
      { x: -0.28, z: -0.28 },
      { x: 0.28, z: -0.28 },
      { x: 0.28, z: 0.28 },
      { x: -0.28, z: 0.28 }
    ];

    for (const c of treeCoords) {
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), woodMat);
      trunk.position.set(c.x, 0.12, c.z);
      group.add(trunk);

      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), leafMat);
      crown.position.set(c.x, 0.32, c.z);
      crown.castShadow = true;
      group.add(crown);
    }
  }
}
