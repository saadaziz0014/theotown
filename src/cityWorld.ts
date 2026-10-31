import * as THREE from 'three';
import type { 
  TileType, 
  RoadTile, 
  VoxelBuilding, 
  CarAgent, 
  PedestrianAgent, 
  CityStats, 
  VehicleType, 
  RoadType,
  ServiceType,
  PlacedService,
  ActiveOverlay,
  UtilityPipe,
  UtilityWire,
  BiomeType
} from './types';
import { VoxelVehicleBuilder } from './vehicleBuilder';
import { VoxelRoadBuilder, ROAD_CONFIGS } from './roadBuilder';
import { VoxelServiceBuilder, SERVICE_DEFS } from './serviceBuilder';
import { VoxelPedestrianBuilder } from './pedestrianBuilder';
import { VoxelUtilityBuilder } from './utilityBuilder';

export class CityWorld {
  public size: number = 64; // 64x64 tiles
  public groundMesh!: THREE.InstancedMesh;
  public buildingsGroup: THREE.Group = new THREE.Group();
  public servicesGroup: THREE.Group = new THREE.Group();
  public carsGroup: THREE.Group = new THREE.Group();
  public pedestriansGroup: THREE.Group = new THREE.Group();
  public overlayGroup: THREE.Group = new THREE.Group();
  public highlightMesh!: THREE.Mesh;
  public roadPreviewGroup: THREE.Group = new THREE.Group();
  public utilityPreviewGroup: THREE.Group = new THREE.Group();
  public pipesGroup: THREE.Group = new THREE.Group();
  public wiresGroup: THREE.Group = new THREE.Group();
  public coverageGroup: THREE.Group = new THREE.Group();

  public tiles: Map<string, TileType> = new Map();
  public roads: Map<string, RoadTile> = new Map();
  public buildings: Map<string, VoxelBuilding> = new Map();
  public services: Map<string, PlacedService> = new Map();
  public pipes: Map<string, UtilityPipe> = new Map();
  public wires: Map<string, UtilityWire> = new Map();
  public pipeMeshes: Map<string, THREE.Group> = new Map();
  public wireMeshes: Map<string, THREE.Group> = new Map();

  public waterCoveredTiles: Set<string> = new Set();
  public powerCoveredTiles: Set<string> = new Set();
  public isUndergroundMode: boolean = false;
  public cars: CarAgent[] = [];
  public pedestrians: PedestrianAgent[] = [];
  public playerVehicle?: {
    x: number;
    z: number;
    rotationY: number;
    speed: number;
    isActive: boolean;
  };

  public currentBiome: BiomeType = 'valley';
  public baseTerrainTypes: Map<string, TileType> = new Map();
  public baseTerrainHeights: Map<string, number> = new Map();
  public baseTerrainColors: Map<string, number> = new Map();

  public sceneryGroup: THREE.Group = new THREE.Group();
  public sceneryObjects: Map<string, THREE.Object3D> = new Map();

  public activeOverlay: ActiveOverlay = 'none';
  public isRestoringSave: boolean = false;
  private animatedServiceParts: any[] = [];
  public streetLightsList: { mesh: THREE.Mesh; light?: THREE.PointLight }[] = [];
  public windowMeshesList: { mesh: THREE.Mesh; originalColor: number }[] = [];

  // Voxel Palette Colors
  public readonly COLORS = {
    grass: 0x5ea836,
    grassDark: 0x4d8f2b,
    water: 0x3b82f6,
    sand: 0xe0c58b,
    asphalt: 0x27272a,
    roadMarking: 0xfacc15,
    resZone: 0x22c55e,
    comZone: 0x38bdf8,
    indZone: 0xf59e0b,
    resWall: [0xfafaf9, 0xdcfce7, 0xfef08a, 0xffedd5, 0xe0e7ff],
    resRoof: [0xb91c1c, 0x1e3a8a, 0x475569, 0x065f46],
    comWall: [0x38bdf8, 0x0284c7, 0x0369a1, 0x64748b, 0x0f172a],
    indWall: [0xd97706, 0x78716c, 0x57534e, 0xca8a04],
    window: 0xfef08a,
    windowOff: 0x334155
  };

  public stats: CityStats = {
    money: 50000,
    income: 0,
    expenses: 0,
    population: 0,
    jobs: 0,
    happiness: 85,
    powerCapacity: 0,
    powerDemand: 0,
    waterCapacity: 0,
    waterDemand: 0,
    waterCoveredPct: 100,
    powerCoveredPct: 100,
    taxRate: 9,
    day: 1,
    timeOfDay: 12.0,
    timePhase: 'Noon',
    isNight: false,
    demandRes: 60,
    demandCom: 40,
    demandInd: 30,
    gameSpeed: 0.5 // Default Play Mode: Relaxed & smooth pace
  };

  private scene: THREE.Scene;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.coverageGroup);
    this.scene.add(this.pipesGroup);
    this.scene.add(this.wiresGroup);
    this.scene.add(this.buildingsGroup);
    this.scene.add(this.servicesGroup);
    this.scene.add(this.carsGroup);
    this.scene.add(this.pedestriansGroup);
    this.scene.add(this.overlayGroup);
    this.scene.add(this.utilityPreviewGroup);
    this.scene.add(this.sceneryGroup);
    this.initTerrain();
    this.initHighlight();
  }

  public getKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  public setMapSize(newSize: number) {
    if (this.size === newSize && this.groundMesh) return;
    this.size = newSize;

    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh.geometry?.dispose();
      if (Array.isArray(this.groundMesh.material)) {
        this.groundMesh.material.forEach((m: any) => m.dispose());
      } else {
        this.groundMesh.material?.dispose();
      }
    }

    const totalTiles = this.size * this.size;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ vertexColors: false });
    this.groundMesh = new THREE.InstancedMesh(geometry, material, totalTiles);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  private initTerrain() {
    this.setMapSize(this.size || 64);
    this.generateBiome('valley');
  }

  // --- PROCEDURAL BIOME / AREA GENERATION ---
  public generateBiome(biome: BiomeType = 'valley') {
    this.currentBiome = biome;
    this.clearAll();
    this.clearScenery();
    this.baseTerrainTypes.clear();
    this.baseTerrainHeights.clear();
    this.baseTerrainColors.clear();

    const half = this.size / 2;
    const scale = this.size / 64;
    let index = 0;

    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        const key = this.getKey(x, z);
        let tileType: TileType = 'grass';
        let topY = 0.0;
        let colorVal = this.COLORS.grass;

        switch (biome) {
          case 'valley': {
            // Winding scenic river flowing along the southern waterfront with sandy shoreline
            const riverZ = (this.size * 0.12) + Math.sin(x * (0.22 / Math.sqrt(scale))) * (2.2 * Math.sqrt(scale));
            const distToRiver = Math.abs(z - riverZ);
            const riverW = Math.max(1.5, 1.5 * Math.sqrt(scale));
            const sandW = riverW + 1.1 * Math.sqrt(scale);

            if (distToRiver <= riverW) {
              tileType = 'water';
              topY = -0.07;
              colorVal = (Math.sin(x * 0.5) > 0) ? 0x2563eb : 0x3b82f6;
            } else if (distToRiver <= sandW) {
              tileType = 'sand';
              topY = -0.02;
              colorVal = (Math.cos(x * 0.4) > 0) ? 0xd4b878 : 0xe5d08f;
            } else {
              tileType = 'grass';
              topY = (Math.sin(x * 0.3) + Math.cos(z * 0.3)) * 0.02;
              colorVal = ((x + z) % 2 === 0) ? this.COLORS.grass : this.COLORS.grassDark;
            }
            break;
          }

          case 'mountains': {
            // Central & Southwest Alpine Valley
            const distValley = Math.hypot((x + 2 * scale) * 0.85, (z - 4 * scale) * 1.15) / scale;
            // High mountain pass winding north
            const passCenter = (4.0 * scale) + Math.sin(z * (0.3 / Math.sqrt(scale))) * (1.5 * scale);
            const isPass = z <= 0 && Math.abs(x - passCenter) < (2.2 * Math.sqrt(scale));

            // Alpine Glacial Tarn Cirque Lake (Northwest)
            const lakeDist = Math.hypot(x + 8 * scale, z + 9 * scale) / scale;
            // Mountain stream tumbling down from the tarn
            const streamX = Math.round(-7 * scale);
            const isStream = Math.abs(x - streamX) <= Math.max(0, Math.floor(scale * 0.5)) && z >= (-7 * scale) && z <= (-2 * scale);

            if (lakeDist < 2.2) {
              tileType = 'water';
              topY = 0.50; // High mountain glacial tarn nestled in granite cirque
              colorVal = (Math.sin(x * 0.5) > 0) ? 0x0284c7 : 0x0ea5e9;
            } else if (lakeDist < 2.9) {
              tileType = 'sand';
              topY = 0.58; // Pebble/gravel tarn beach
              colorVal = 0x94a3b8;
            } else if (isStream) {
              tileType = 'water';
              topY = (z <= (-5 * scale) ? 0.35 : 0.0) - 0.07;
              colorVal = 0x38bdf8;
            } else {
              // Mountain Massif Envelopes framed along northern & eastern edges
              const normZ = z / half;
              const normX = x / half;
              const massifN = Math.max(0, -normZ - 0.05) ** 0.85 * Math.max(0, 1.0 - normX * 0.7);
              const massifE = Math.max(0, normX - 0.08) ** 0.9 * Math.max(0, 1.0 - normZ * 0.65);
              const massifS = Math.max(0, normZ - 0.32) * Math.max(0, -normX - 0.05) * 0.75;
              const baseEnvelope = Math.max(massifN, massifE, massifS);

              // Multi-octave fractal ridge noise (arêtes and jagged crests)
              const r1 = 1.0 - Math.abs(Math.sin(x * 0.28 + z * 0.20 + 0.8) * Math.cos(z * 0.25 - x * 0.16));
              const r2 = 1.0 - Math.abs(Math.sin(x * 0.55 - z * 0.42 + 1.2) * Math.sin(z * 0.50 + x * 0.32));
              const r3 = Math.sin(x * 0.9 + z * 0.75) * Math.cos(x * 0.75 - z * 0.9) * 0.35;

              let rawH = baseEnvelope * ((r1 ** 1.8) * 1.75 + r2 * 0.85 + r3);

              // Prominent Mountain Horn Summits
              const distHorn = Math.hypot(x + 8 * scale, z + 12 * scale) / scale;
              rawH += Math.max(0, 1.0 - distHorn / 4.8) ** 2 * 1.4;
              const distSpire = Math.hypot(x - 12 * scale, z + 7 * scale) / scale;
              rawH += Math.max(0, 1.0 - distSpire / 4.5) ** 2 * 1.2;

              // Valley basin & pass protection for city construction
              if (distValley < 5.8 || isPass) {
                rawH = Math.min(rawH, isPass ? 0.35 : 0.15);
              }

              // Quantized discrete voxel tiers & geological strata
              if (rawH < 0.28) {
                // Tier 0: Valley floor (lush buildable meadows)
                tileType = 'grass';
                topY = 0.0;
                colorVal = ((x + z) % 2 === 0) ? 0x3e6b27 : 0x2d4f1c;
              } else if (rawH < 0.75) {
                // Tier 1: Alpine foothills & spruce plateaus
                tileType = 'grass';
                topY = 0.40;
                colorVal = ((x + z) % 2 === 0) ? 0x365314 : 0x3f6212;
              } else if (rawH < 1.30) {
                // Tier 2: Granite cliffs & rocky shelves
                tileType = 'rock';
                topY = 0.90;
                colorVal = (Math.sin(x * 0.7 + z * 0.4) > 0) ? 0x64748b : 0x52525b;
              } else if (rawH < 1.85) {
                // Tier 3: High mountain crags & jagged slate
                tileType = 'rock';
                topY = 1.45;
                colorVal = (Math.cos(x * 0.5 - z * 0.6) > 0) ? 0x475569 : 0x334155;
              } else if (rawH < 2.35) {
                // Tier 4: Sub-peak snowline & frosted granite
                tileType = 'rock';
                topY = 2.05;
                colorVal = ((x + z) % 2 === 0) ? 0xe2e8f0 : 0xcfd8dc;
              } else {
                // Tier 5: Majestic summit snow peaks & horns
                tileType = 'rock';
                topY = (rawH > 2.65 ? 2.90 : 2.60);
                colorVal = (rawH > 2.6) ? 0xffffff : 0xf8fafc;
              }
            }
            break;
          }

          case 'desert': {
            // Golden sand dunes, sandstone canyon cliffs and emerald oasis
            const oasisDist = Math.hypot(x - 10 * scale, z + 10 * scale);
            const isCanyonMesa = (x > (11 * scale) && z > (10 * scale)) || (x < (-12 * scale) && z < (-11 * scale));
            const dune = Math.sin(x * 0.35 + z * 0.15) * 0.03 + Math.cos(z * 0.4) * 0.02;
            const oasisR = 2.2 * Math.sqrt(scale);
            const oasisGreeneryR = 3.6 * Math.sqrt(scale);

            if (oasisDist < oasisR) {
              tileType = 'water';
              topY = -0.06;
              colorVal = 0x06b6d4; // Turquoise oasis spring
            } else if (oasisDist < oasisGreeneryR) {
              tileType = 'grass';
              topY = -0.01;
              colorVal = 0x15803d; // Oasis palm greenery
            } else if (isCanyonMesa) {
              tileType = 'rock';
              topY = 0.55;
              colorVal = ((x + z) % 2 === 0) ? 0xb45309 : 0x9a3412; // Terraced red sandstone
            } else {
              tileType = 'sand';
              topY = dune;
              const sandPalette = [0xf59e0b, 0xeab308, 0xd97706, 0xfde047];
              colorVal = sandPalette[Math.abs(x + z * 3) % sandPalette.length];
            }
            break;
          }

          case 'coastal': {
            // Central tropical island surrounded by ocean waters & sandy beaches
            const islandRadius = Math.hypot(x, z) + Math.sin(x * 0.3) * (1.5 * scale) + Math.cos(z * 0.3) * (1.5 * scale);
            const rOcean = half * 0.48;
            const rCoast = half * 0.42;
            const rBeach = half * 0.36;

            if (islandRadius > rOcean) {
              tileType = 'water';
              topY = -0.08;
              colorVal = 0x0284c7; // Deep ocean
            } else if (islandRadius > rCoast) {
              tileType = 'water';
              topY = -0.05;
              colorVal = 0x38bdf8; // Shallow coastal waters
            } else if (islandRadius > rBeach) {
              tileType = 'sand';
              topY = -0.01;
              colorVal = ((x + z) % 2 === 0) ? 0xfef08a : 0xfde047; // Beach
            } else {
              tileType = 'grass';
              topY = 0.0;
              colorVal = ((x + z) % 2 === 0) ? 0x22c55e : 0x16a34a; // Tropical island interior
            }
            break;
          }

          case 'plains':
          default: {
            // Wide open fertile flatlands with corner pond, ideal for sprawling cities
            const pondDist = Math.hypot(x - half * 0.35, z + half * 0.35);
            const pondR = 2.8 * Math.sqrt(scale);
            if (pondDist < pondR) {
              tileType = 'water';
              topY = -0.06;
              colorVal = 0x3b82f6;
            } else if (pondDist < pondR + 1.0) {
              tileType = 'sand';
              topY = -0.02;
              colorVal = 0xd4b878;
            } else {
              tileType = 'grass';
              topY = 0.0;
              colorVal = ((x + z) % 2 === 0) ? 0x65a30d : 0x4d7c0f;
            }
            break;
          }
        }

        this.baseTerrainTypes.set(key, tileType);
        this.baseTerrainHeights.set(key, topY);
        this.baseTerrainColors.set(key, colorVal);
        this.tiles.set(key, tileType);

        // Update ground mesh instance matrix and color with solid anchored bedrock
        this.setGroundTileTransform(x, z, topY, colorVal);
        index++;

        // Add procedural 3D scenery (trees & boulders) for mountain biome
        if (biome === 'mountains' && tileType !== 'water') {
          const hash = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
          if (tileType === 'grass' && topY <= 0.40) {
            // Foothills & valley pine trees
            if (hash < 0.16) {
              const tree = this.buildVoxelPineTree(false);
              tree.position.set(x + 0.5, topY, z + 0.5);
              this.sceneryGroup.add(tree);
              this.sceneryObjects.set(key, tree);
            }
          } else if (tileType === 'rock' && topY >= 0.85 && topY <= 1.05) {
            // Tier 2 granite shelves
            if (hash < 0.14) {
              if (hash < 0.07) {
                const tree = this.buildVoxelPineTree(true); // Snow-dusted pine
                tree.position.set(x + 0.5, topY, z + 0.5);
                this.sceneryGroup.add(tree);
                this.sceneryObjects.set(key, tree);
              } else {
                const rock = this.buildVoxelBoulder(Math.floor(hash * 10));
                rock.position.set(x + 0.5, topY, z + 0.5);
                this.sceneryGroup.add(rock);
                this.sceneryObjects.set(key, rock);
              }
            }
          } else if (tileType === 'rock' && topY >= 1.35 && topY <= 1.65) {
            // Tier 3 high crags
            if (hash < 0.12) {
              const rock = this.buildVoxelBoulder(Math.floor(hash * 10));
              rock.position.set(x + 0.5, topY, z + 0.5);
              this.sceneryGroup.add(rock);
              this.sceneryObjects.set(key, rock);
            }
          }
        }
      }
    }

    if (this.groundMesh.instanceColor) {
      this.groundMesh.instanceColor.needsUpdate = true;
    }
    this.groundMesh.instanceMatrix.needsUpdate = true;
    this.recalculateCityGrids();
  }

  private initHighlight() {
    const geo = new THREE.BoxGeometry(0.98, 0.04, 0.98);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      depthTest: true
    });
    this.highlightMesh = new THREE.Mesh(geo, mat);
    this.highlightMesh.position.set(0, 0.05, 0);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    this.roadPreviewGroup.visible = false;
    this.scene.add(this.roadPreviewGroup);
  }

  public setHighlight(
    x: number, 
    z: number, 
    valid: boolean = true, 
    tool: string = 'road', 
    explicitRoadType?: RoadType
  ) {
    const key = this.getKey(x, z);
    const topY = Math.max(0, this.baseTerrainHeights.get(key) ?? 0.0);

    if (tool === 'road') {
      this.highlightMesh.visible = false;
      this.utilityPreviewGroup.visible = false;

      // Clear previous road preview
      this.roadPreviewGroup.clear();

      // Check adjacent roads to automatically align and match connection width and type
      const north = this.roads.get(this.getKey(x, z - 1));
      const south = this.roads.get(this.getKey(x, z + 1));
      const east = this.roads.get(this.getKey(x + 1, z));
      const west = this.roads.get(this.getKey(x - 1, z));

      // Auto-detect matching road type if user hasn't explicitly overridden
      const isWater = this.isWaterTile(x, z);
      let autoType: RoadType = 'suburban';
      if (isWater) {
        autoType = 'bridge';
      } else {
        const nonBridge = [north?.type, south?.type, east?.type, west?.type].find((t): t is RoadType => !!t && t !== 'bridge');
        autoType = nonBridge || 'suburban';
      }

      let effectiveType: RoadType = explicitRoadType || autoType;
      if (!isWater && effectiveType === 'bridge' && !explicitRoadType) {
        effectiveType = 'suburban';
      }

      let hasNorth = !!north;
      let hasSouth = !!south;
      let hasEast = !!east;
      let hasWest = !!west;

      // If isolated tile with no connections yet, align East-West
      if (!hasNorth && !hasSouth && !hasEast && !hasWest) {
        hasEast = true;
        hasWest = true;
      }

      const previewMesh = VoxelRoadBuilder.buildRoadPreviewMesh(
        effectiveType,
        hasNorth,
        hasSouth,
        hasEast,
        hasWest,
        valid
      );

      this.roadPreviewGroup.position.set(x + 0.5, topY, z + 0.5);
      this.roadPreviewGroup.add(previewMesh);
      this.roadPreviewGroup.visible = true;
    } else if (tool === 'pipe' || tool === 'wire') {
      this.roadPreviewGroup.visible = false;
      this.highlightMesh.visible = false;

      this.utilityPreviewGroup.clear();
      const preview = VoxelUtilityBuilder.buildCursorCoveragePreview(tool, 4);
      this.utilityPreviewGroup.add(preview);
      this.utilityPreviewGroup.position.set(x + 0.5, topY, z + 0.5);
      this.utilityPreviewGroup.visible = true;
    } else {
      this.roadPreviewGroup.visible = false;
      this.utilityPreviewGroup.visible = false;
      this.highlightMesh.position.set(x + 0.5, topY + 0.05, z + 0.5);

      let color = valid ? 0xffffff : 0xef4444;
      if (valid) {
        if (tool === 'residential') color = 0x22c55e;
        else if (tool === 'commercial') color = 0x38bdf8;
        else if (tool === 'industrial') color = 0xf59e0b;
        else if (tool === 'service' || tool === 'move') color = 0xa855f7;
        else if (tool === 'demolish') color = 0xef4444;
      }

      (this.highlightMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      this.highlightMesh.visible = true;
    }
  }

  public clearHighlight() {
    this.highlightMesh.visible = false;
    this.roadPreviewGroup.visible = false;
    this.utilityPreviewGroup.visible = false;
  }

  public getTile(x: number, z: number): TileType {
    return this.tiles.get(this.getKey(x, z)) || 'grass';
  }

  public isWaterTile(x: number, z: number): boolean {
    const key = this.getKey(x, z);
    const baseType = this.baseTerrainTypes.get(key);
    const tileType = this.tiles.get(key);
    return baseType === 'water' || tileType === 'water';
  }

  public setGroundTileTransform(x: number, z: number, topY: number, colorVal?: number) {
    const half = this.size / 2;
    if (x < -half || x >= half || z < -half || z >= half) return;
    const index = (x + half) * this.size + (z + half);
    const bedrock = -0.6;
    const height = Math.max(0.08, topY - bedrock);
    const centerY = bedrock + height / 2;

    this.dummy.position.set(x + 0.5, centerY, z + 0.5);
    this.dummy.scale.set(0.98, height, 0.98);
    this.dummy.updateMatrix();
    this.groundMesh.setMatrixAt(index, this.dummy.matrix);
    this.groundMesh.instanceMatrix.needsUpdate = true;

    if (colorVal !== undefined) {
      this.groundMesh.setColorAt(index, new THREE.Color(colorVal));
      if (this.groundMesh.instanceColor) {
        this.groundMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public setGroundTileFoundation(x: number, z: number, topY: number = 0.0) {
    const half = this.size / 2;
    if (x < -half || x >= half || z < -half || z >= half) return;
    this.removeSceneryAt(x, z);
    const effectiveTop = (topY <= 0.001) ? 0.0 : topY;
    this.setGroundTileTransform(x, z, effectiveTop);
  }

  public restoreGroundTile(x: number, z: number) {
    const half = this.size / 2;
    if (x < -half || x >= half || z < -half || z >= half) return;
    const key = this.getKey(x, z);
    const topY = this.baseTerrainHeights.get(key) ?? 0.0;
    const colorVal = this.baseTerrainColors.get(key) ?? this.COLORS.grass;
    this.setGroundTileTransform(x, z, topY, colorVal);
  }

  public ensureLandTile(x: number, z: number) {
    const key = this.getKey(x, z);
    const half = this.size / 2;
    if (x < -half || x >= half || z < -half || z >= half) return;

    this.removeSceneryAt(x, z);
    this.baseTerrainTypes.set(key, 'grass');
    this.baseTerrainHeights.set(key, 0.0);
    const grassColor = ((x + z) % 2 === 0) ? this.COLORS.grass : this.COLORS.grassDark;
    this.baseTerrainColors.set(key, grassColor);
    if (this.tiles.get(key) === 'water' || this.tiles.get(key) === 'sand' || this.tiles.get(key) === 'rock') {
      this.tiles.set(key, 'grass');
    }

    this.setGroundTileTransform(x, z, 0.0, grassColor);
  }

  public removeSceneryAt(x: number, z: number) {
    const key = this.getKey(x, z);
    const obj = this.sceneryObjects.get(key);
    if (obj) {
      this.sceneryGroup.remove(obj);
      obj.traverse((child: any) => {
        if (child.isMesh) {
          child.geometry?.dispose();
        }
      });
      this.sceneryObjects.delete(key);
    }
  }

  public clearScenery() {
    for (const obj of this.sceneryObjects.values()) {
      this.sceneryGroup.remove(obj);
      obj.traverse((child: any) => {
        if (child.isMesh) {
          child.geometry?.dispose();
        }
      });
    }
    this.sceneryObjects.clear();
  }

  private buildVoxelPineTree(snowDusted: boolean = false): THREE.Group {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), trunkMat);
    trunk.position.y = 0.175;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat1 = new THREE.MeshLambertMaterial({ color: 0x14532d });
    const skirt1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), leafMat1);
    skirt1.position.y = 0.28;
    skirt1.castShadow = true;
    group.add(skirt1);

    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x166534 });
    const skirt2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.30), leafMat2);
    skirt2.position.y = 0.44;
    skirt2.castShadow = true;
    group.add(skirt2);

    const leafMat3 = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const skirt3 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), leafMat3);
    skirt3.position.y = 0.58;
    skirt3.castShadow = true;
    group.add(skirt3);

    if (snowDusted) {
      const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const snowCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), snowMat);
      snowCap.position.y = 0.68;
      group.add(snowCap);
    }
    return group;
  }

  private buildVoxelBoulder(type: number = 0): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: (type % 2 === 0) ? 0x64748b : 0x52525b });
    const rock1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.20, 0.24), mat);
    rock1.position.y = 0.10;
    rock1.castShadow = true;
    group.add(rock1);

    const rock2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.16), mat);
    rock2.position.set(0.10, 0.07, -0.08);
    rock2.castShadow = true;
    group.add(rock2);

    group.rotation.y = type * 1.1;
    return group;
  }

  // --- ROAD PLACEMENT ---
  public placeRoad(x: number, z: number, roadType: RoadType = 'suburban', autoMatch: boolean = false): boolean {
    const key = this.getKey(x, z);
    const current = this.tiles.get(key);
    const existingRoad = this.roads.get(key);
    const isWater = this.isWaterTile(x, z);

    let effectiveType = roadType;
    if (autoMatch) {
      const neighbors = [
        this.roads.get(this.getKey(x, z - 1)),
        this.roads.get(this.getKey(x, z + 1)),
        this.roads.get(this.getKey(x - 1, z)),
        this.roads.get(this.getKey(x + 1, z))
      ];
      for (const n of neighbors) {
        if (n && n.type) {
          // If on land, never match a bridge neighbor!
          if (!isWater && n.type === 'bridge') {
            continue;
          }
          effectiveType = n.type;
          break;
        }
      }
    }

    // Water Crossing Rules: Only Bridges can traverse water, and Bridges can ONLY exist over water!
    if (isWater) {
      if (effectiveType !== 'bridge' && autoMatch) {
        effectiveType = 'bridge';
      } else if (effectiveType !== 'bridge') {
        return false;
      }
    } else {
      // Land tiles cannot have water bridges
      if (effectiveType === 'bridge') {
        effectiveType = (roadType !== 'bridge') ? roadType : 'suburban';
      }
    }

    if (current === 'road' && existingRoad && existingRoad.type === effectiveType) {
      return false;
    }

    const cost = ROAD_CONFIGS[effectiveType]?.cost || 20;
    if (!this.isRestoringSave && this.stats.money < cost) return false;
    if (!this.isRestoringSave) this.stats.money -= cost;

    this.demolish(x, z, false);

    const config = ROAD_CONFIGS[effectiveType] || ROAD_CONFIGS.suburban;
    this.tiles.set(key, 'road');
    if (!isWater) {
      this.setGroundTileFoundation(x, z, 0.0);
    }
    this.roads.set(key, {
      x,
      z,
      type: effectiveType,
      hasNorth: false,
      hasSouth: false,
      hasEast: false,
      hasWest: false,
      elevation: config.elevation
    });

    this.updateRoadConnections(x, z);
    this.updateSurroundingRoads(x, z);
    this.createRoadVoxelMesh(x, z);

    return true;
  }

  public sanitizeBridgesOnLand(): number {
    const toFix: { x: number; z: number }[] = [];
    for (const r of this.roads.values()) {
      if (r.type === 'bridge' && !this.isWaterTile(r.x, r.z)) {
        toFix.push({ x: r.x, z: r.z });
      }
    }
    if (toFix.length === 0) return 0;

    const prevRestoring = this.isRestoringSave;
    this.isRestoringSave = true;
    for (const pos of toFix) {
      this.demolish(pos.x, pos.z, false);
      this.placeRoad(pos.x, pos.z, 'suburban', false);
    }
    this.isRestoringSave = prevRestoring;
    return toFix.length;
  }

  private updateRoadConnections(x: number, z: number) {
    const road = this.roads.get(this.getKey(x, z));
    if (!road) return;

    road.hasNorth = this.roads.has(this.getKey(x, z - 1));
    road.hasSouth = this.roads.has(this.getKey(x, z + 1));
    road.hasEast = this.roads.has(this.getKey(x + 1, z));
    road.hasWest = this.roads.has(this.getKey(x - 1, z));
  }

  private updateSurroundingRoads(x: number, z: number) {
    const neighbors = [
      { x: x, z: z - 1 },
      { x: x, z: z + 1 },
      { x: x + 1, z: z },
      { x: x - 1, z: z }
    ];

    for (const n of neighbors) {
      if (this.roads.has(this.getKey(n.x, n.z))) {
        this.updateRoadConnections(n.x, n.z);
        this.createRoadVoxelMesh(n.x, n.z);
      }
    }
  }

  private roadMeshes: Map<string, THREE.Group> = new Map();

  private createRoadVoxelMesh(x: number, z: number) {
    const key = this.getKey(x, z);
    const existing = this.roadMeshes.get(key);
    if (existing) {
      this.scene.remove(existing);
      existing.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
      this.roadMeshes.delete(key);
    }

    const road = this.roads.get(key);
    if (!road) return;

    const group = VoxelRoadBuilder.buildRoadMesh(road, this.streetLightsList);
    this.scene.add(group);
    this.roadMeshes.set(key, group);
  }

  // --- ZONING ---
  public placeZone(x: number, z: number, zoneType: 'residential' | 'commercial' | 'industrial'): boolean {
    const key = this.getKey(x, z);
    const current = this.tiles.get(key);
    if (this.isWaterTile(x, z) || current === 'road' || current?.startsWith('service_')) return false;

    if (!this.isRestoringSave && this.stats.money < 10) return false;
    if (!this.isRestoringSave) this.stats.money -= 10;

    const tileZoneType: TileType = `zone_${zoneType}` as TileType;
    this.tiles.set(key, tileZoneType);
    this.setGroundTileFoundation(x, z, 0.0);

    if (this.buildings.has(key)) {
      this.demolish(x, z, false);
    }

    this.createZoneMarker(x, z, zoneType);
    return true;
  }

  private zoneMarkers: Map<string, THREE.Mesh> = new Map();

  private createZoneMarker(x: number, z: number, zoneType: 'residential' | 'commercial' | 'industrial') {
    const key = this.getKey(x, z);
    const existing = this.zoneMarkers.get(key);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      this.zoneMarkers.delete(key);
    }

    const geo = new THREE.BoxGeometry(0.96, 0.05, 0.96);
    let color = this.COLORS.resZone;
    if (zoneType === 'commercial') color = this.COLORS.comZone;
    if (zoneType === 'industrial') color = this.COLORS.indZone;

    const mat = new THREE.MeshLambertMaterial({
      color: color,
      transparent: true,
      opacity: 0.65
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, 0.02, z + 0.5);
    this.scene.add(mesh);
    this.zoneMarkers.set(key, mesh);
  }

  // --- SERVICE BUILDINGS (Power, Water, Police, Hospital, etc.) ---
  public placeService(x: number, z: number, serviceType: ServiceType): boolean {
    const key = this.getKey(x, z);
    const current = this.tiles.get(key);
    if (this.isWaterTile(x, z) || current === 'road') return false;

    const def = SERVICE_DEFS[serviceType];
    if (!def) return false;

    if (!this.isRestoringSave && this.stats.money < def.cost) return false;
    if (!this.isRestoringSave) this.stats.money -= def.cost;

    this.demolish(x, z, false);

    const tileType: TileType = `service_${serviceType}` as TileType;
    this.tiles.set(key, tileType);
    this.setGroundTileFoundation(x, z, 0.0);

    const service: PlacedService = {
      id: key,
      x,
      z,
      type: serviceType
    };

    const { group, animatedParts } = VoxelServiceBuilder.buildService(service);
    service.meshGroup = group;
    this.servicesGroup.add(group);
    this.services.set(key, service);

    if (animatedParts && animatedParts.length > 0) {
      this.animatedServiceParts.push(...animatedParts);
    }

    this.recalculateCityGrids();
    return true;
  }

  // --- RELOCATE / MOVE SERVICE BUILDING (Cities: Skylines Relocate Tool) ---
  public moveService(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    const fromKey = this.getKey(fromX, fromZ);
    const toKey = this.getKey(toX, toZ);
    const service = this.services.get(fromKey);

    if (!service) return false;
    if (fromKey === toKey) return true;

    const targetTile = this.tiles.get(toKey);
    // Can only move to empty grass or clear area
    if (targetTile === 'road' || targetTile?.startsWith('service_')) return false;

    // Small relocation fee ($20)
    if (this.stats.money < 20) return false;
    this.stats.money -= 20;

    const serviceType = service.type;

    // Clear old location
    this.demolish(fromX, fromZ, false);

    // Place at new location without full cost deduction
    const tileType: TileType = `service_${serviceType}` as TileType;
    this.tiles.set(toKey, tileType);

    const movedService: PlacedService = {
      id: toKey,
      x: toX,
      z: toZ,
      type: serviceType
    };

    const { group, animatedParts } = VoxelServiceBuilder.buildService(movedService);
    movedService.meshGroup = group;
    this.servicesGroup.add(group);
    this.services.set(toKey, movedService);

    if (animatedParts && animatedParts.length > 0) {
      this.animatedServiceParts.push(...animatedParts);
    }

    this.recalculateCityGrids();
    return true;
  }

  // --- UNDERGROUND UTILITIES (Water Pipelines & Underground Wires) ---

  public placePipe(x: number, z: number, cost: number = 5): boolean {
    const half = this.size / 2;
    if (x < -half || x >= half || z < -half || z >= half) return false;
    if (!this.isRestoringSave && this.stats.money < cost) return false;

    const key = this.getKey(x, z);
    if (this.pipes.has(key)) return false;

    if (!this.isRestoringSave) this.stats.money -= cost;

    const pipe: UtilityPipe = {
      x,
      z,
      connectedToSource: false,
      hasNorth: false,
      hasSouth: false,
      hasEast: false,
      hasWest: false
    };
    this.pipes.set(key, pipe);

    this.updateSurroundingPipes(x, z);
    this.recalculateCityGrids();
    return true;
  }

  public placeWire(x: number, z: number, cost: number = 5): boolean {
    const half = this.size / 2;
    if (x < -half || x >= half || z < -half || z >= half) return false;
    if (!this.isRestoringSave && this.stats.money < cost) return false;

    const key = this.getKey(x, z);
    if (this.wires.has(key)) return false;

    if (!this.isRestoringSave) this.stats.money -= cost;

    const wire: UtilityWire = {
      x,
      z,
      connectedToSource: false,
      hasNorth: false,
      hasSouth: false,
      hasEast: false,
      hasWest: false
    };
    this.wires.set(key, wire);

    this.updateSurroundingWires(x, z);
    this.recalculateCityGrids();
    return true;
  }

  public demolishPipe(x: number, z: number): boolean {
    const key = this.getKey(x, z);
    if (!this.pipes.has(key)) return false;

    this.pipes.delete(key);
    const mesh = this.pipeMeshes.get(key);
    if (mesh) {
      this.pipesGroup.remove(mesh);
      mesh.traverse((c: any) => { if (c.isMesh) c.geometry?.dispose(); });
      this.pipeMeshes.delete(key);
    }
    this.updateSurroundingPipes(x, z);
    this.recalculateCityGrids();
    return true;
  }

  public demolishWire(x: number, z: number): boolean {
    const key = this.getKey(x, z);
    if (!this.wires.has(key)) return false;

    this.wires.delete(key);
    const mesh = this.wireMeshes.get(key);
    if (mesh) {
      this.wiresGroup.remove(mesh);
      mesh.traverse((c: any) => { if (c.isMesh) c.geometry?.dispose(); });
      this.wireMeshes.delete(key);
    }
    this.updateSurroundingWires(x, z);
    this.recalculateCityGrids();
    return true;
  }

  public updateSurroundingPipes(x: number, z: number) {
    const coords = [
      { x, z },
      { x: x + 1, z },
      { x: x - 1, z },
      { x, z: z + 1 },
      { x, z: z - 1 }
    ];
    for (const c of coords) {
      const key = this.getKey(c.x, c.z);
      const pipe = this.pipes.get(key);
      if (!pipe) continue;

      pipe.hasNorth = this.pipes.has(this.getKey(c.x, c.z - 1));
      pipe.hasSouth = this.pipes.has(this.getKey(c.x, c.z + 1));
      pipe.hasEast = this.pipes.has(this.getKey(c.x + 1, c.z));
      pipe.hasWest = this.pipes.has(this.getKey(c.x - 1, c.z));

      this.rebuildPipeMesh(c.x, c.z);
    }
  }

  public updateSurroundingWires(x: number, z: number) {
    const coords = [
      { x, z },
      { x: x + 1, z },
      { x: x - 1, z },
      { x, z: z + 1 },
      { x, z: z - 1 }
    ];
    for (const c of coords) {
      const key = this.getKey(c.x, c.z);
      const wire = this.wires.get(key);
      if (!wire) continue;

      wire.hasNorth = this.wires.has(this.getKey(c.x, c.z - 1));
      wire.hasSouth = this.wires.has(this.getKey(c.x, c.z + 1));
      wire.hasEast = this.wires.has(this.getKey(c.x + 1, c.z));
      wire.hasWest = this.wires.has(this.getKey(c.x - 1, c.z));

      this.rebuildWireMesh(c.x, c.z);
    }
  }

  public rebuildPipeMesh(x: number, z: number) {
    const key = this.getKey(x, z);
    const pipe = this.pipes.get(key);
    if (!pipe) return;

    const oldMesh = this.pipeMeshes.get(key);
    if (oldMesh) {
      this.pipesGroup.remove(oldMesh);
      oldMesh.traverse((c: any) => { if (c.isMesh) c.geometry?.dispose(); });
      this.pipeMeshes.delete(key);
    }

    const mesh = VoxelUtilityBuilder.buildPipeMesh(
      pipe.hasNorth,
      pipe.hasSouth,
      pipe.hasEast,
      pipe.hasWest,
      pipe.connectedToSource
    );
    mesh.position.set(x + 0.5, 0, z + 0.5);
    this.pipesGroup.add(mesh);
    this.pipeMeshes.set(key, mesh);
  }

  public rebuildWireMesh(x: number, z: number) {
    const key = this.getKey(x, z);
    const wire = this.wires.get(key);
    if (!wire) return;

    const oldMesh = this.wireMeshes.get(key);
    if (oldMesh) {
      this.wiresGroup.remove(oldMesh);
      oldMesh.traverse((c: any) => { if (c.isMesh) c.geometry?.dispose(); });
      this.wireMeshes.delete(key);
    }

    const mesh = VoxelUtilityBuilder.buildWireMesh(
      wire.hasNorth,
      wire.hasSouth,
      wire.hasEast,
      wire.hasWest,
      wire.connectedToSource
    );
    mesh.position.set(x + 0.5, 0, z + 0.5);
    this.wiresGroup.add(mesh);
    this.wireMeshes.set(key, mesh);
  }

  public recalculateUtilities() {
    // 1. Water Network BFS
    const waterSources: { x: number; z: number }[] = [];
    for (const s of this.services.values()) {
      const def = SERVICE_DEFS[s.type];
      if (def && def.category === 'water') {
        waterSources.push({ x: s.x, z: s.z });
      }
    }

    for (const pipe of this.pipes.values()) {
      pipe.connectedToSource = false;
    }

    const waterQueue: string[] = [];
    const waterVisited = new Set<string>();

    for (const src of waterSources) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const k = this.getKey(src.x + dx, src.z + dz);
          if (this.pipes.has(k) && !waterVisited.has(k)) {
            waterVisited.add(k);
            waterQueue.push(k);
          }
        }
      }
    }

    while (waterQueue.length > 0) {
      const currKey = waterQueue.shift()!;
      const pipe = this.pipes.get(currKey);
      if (!pipe) continue;
      pipe.connectedToSource = true;

      const neighbors = [
        this.getKey(pipe.x + 1, pipe.z),
        this.getKey(pipe.x - 1, pipe.z),
        this.getKey(pipe.x, pipe.z + 1),
        this.getKey(pipe.x, pipe.z - 1)
      ];

      for (const nKey of neighbors) {
        if (this.pipes.has(nKey) && !waterVisited.has(nKey)) {
          waterVisited.add(nKey);
          waterQueue.push(nKey);
        }
      }
    }

    for (const pipe of this.pipes.values()) {
      this.rebuildPipeMesh(pipe.x, pipe.z);
    }

    this.waterCoveredTiles.clear();
    const waterCenters: { x: number; z: number }[] = [...waterSources];
    for (const pipe of this.pipes.values()) {
      if (pipe.connectedToSource) {
        waterCenters.push({ x: pipe.x, z: pipe.z });
      }
    }

    const waterRadius = 4;
    for (const c of waterCenters) {
      for (let dx = -waterRadius; dx <= waterRadius; dx++) {
        for (let dz = -waterRadius; dz <= waterRadius; dz++) {
          if (Math.hypot(dx, dz) <= waterRadius + 0.25) {
            this.waterCoveredTiles.add(this.getKey(c.x + dx, c.z + dz));
          }
        }
      }
    }

    // 2. Power Network BFS
    const powerSources: { x: number; z: number }[] = [];
    for (const s of this.services.values()) {
      const def = SERVICE_DEFS[s.type];
      if (def && def.category === 'power') {
        powerSources.push({ x: s.x, z: s.z });
      }
    }

    for (const wire of this.wires.values()) {
      wire.connectedToSource = false;
    }

    const powerQueue: string[] = [];
    const powerVisited = new Set<string>();

    for (const src of powerSources) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const k = this.getKey(src.x + dx, src.z + dz);
          if (this.wires.has(k) && !powerVisited.has(k)) {
            powerVisited.add(k);
            powerQueue.push(k);
          }
        }
      }
    }

    while (powerQueue.length > 0) {
      const currKey = powerQueue.shift()!;
      const wire = this.wires.get(currKey);
      if (!wire) continue;
      wire.connectedToSource = true;

      const neighbors = [
        this.getKey(wire.x + 1, wire.z),
        this.getKey(wire.x - 1, wire.z),
        this.getKey(wire.x, wire.z + 1),
        this.getKey(wire.x, wire.z - 1)
      ];

      for (const nKey of neighbors) {
        if (this.wires.has(nKey) && !powerVisited.has(nKey)) {
          powerVisited.add(nKey);
          powerQueue.push(nKey);
        }
      }
    }

    for (const wire of this.wires.values()) {
      this.rebuildWireMesh(wire.x, wire.z);
    }

    this.powerCoveredTiles.clear();
    const powerCenters: { x: number; z: number }[] = [...powerSources];
    for (const wire of this.wires.values()) {
      if (wire.connectedToSource) {
        powerCenters.push({ x: wire.x, z: wire.z });
      }
    }

    const powerRadius = 4;
    for (const c of powerCenters) {
      for (let dx = -powerRadius; dx <= powerRadius; dx++) {
        for (let dz = -powerRadius; dz <= powerRadius; dz++) {
          if (Math.hypot(dx, dz) <= powerRadius + 0.25) {
            this.powerCoveredTiles.add(this.getKey(c.x + dx, c.z + dz));
          }
        }
      }
    }

    this.rebuildCoverageMeshes();
  }

  public rebuildCoverageMeshes() {
    this.coverageGroup.clear();

    const showWater = this.isUndergroundMode || this.activeOverlay === 'water';
    const showPower = this.isUndergroundMode || this.activeOverlay === 'power';

    if (!showWater && !showPower) return;

    const tileGeo = new THREE.PlaneGeometry(0.96, 0.96);

    if (showWater && this.waterCoveredTiles.size > 0) {
      const waterMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const waterInstanced = new THREE.InstancedMesh(tileGeo, waterMat, this.waterCoveredTiles.size);
      let idx = 0;
      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      const scale = new THREE.Vector3(1, 1, 1);

      for (const key of this.waterCoveredTiles) {
        const [xStr, zStr] = key.split(',');
        const x = parseInt(xStr);
        const z = parseInt(zStr);
        pos.set(x + 0.5, 0.025, z + 0.5);
        m.compose(pos, rot, scale);
        waterInstanced.setMatrixAt(idx++, m);
      }
      waterInstanced.instanceMatrix.needsUpdate = true;
      this.coverageGroup.add(waterInstanced);
    }

    if (showPower && this.powerCoveredTiles.size > 0) {
      const powerMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const powerInstanced = new THREE.InstancedMesh(tileGeo, powerMat, this.powerCoveredTiles.size);
      let idx = 0;
      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      const scale = new THREE.Vector3(1, 1, 1);

      for (const key of this.powerCoveredTiles) {
        const [xStr, zStr] = key.split(',');
        const x = parseInt(xStr);
        const z = parseInt(zStr);
        pos.set(x + 0.5, 0.035, z + 0.5);
        m.compose(pos, rot, scale);
        powerInstanced.setMatrixAt(idx++, m);
      }
      powerInstanced.instanceMatrix.needsUpdate = true;
      this.coverageGroup.add(powerInstanced);
    }
  }

  public setUndergroundMode(enabled: boolean) {
    this.isUndergroundMode = enabled;

    if (this.groundMesh && this.groundMesh.material) {
      const mat = this.groundMesh.material as THREE.MeshLambertMaterial;
      mat.transparent = enabled;
      mat.opacity = enabled ? 0.35 : 1.0;
      mat.needsUpdate = true;
    }

    for (const mesh of this.roadMeshes.values()) {
      mesh.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material.transparent = enabled;
          child.material.opacity = enabled ? 0.25 : 1.0;
          child.material.needsUpdate = true;
        }
      });
    }

    for (const b of this.buildings.values()) {
      if (b.meshGroup) {
        b.meshGroup.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.transparent = enabled;
            child.material.opacity = enabled ? 0.25 : 1.0;
            child.material.needsUpdate = true;
          }
        });
      }
    }

    for (const s of this.services.values()) {
      if (s.meshGroup) {
        const isUtilitySource = s.type.startsWith('power_') || s.type.startsWith('water_');
        s.meshGroup.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.transparent = enabled;
            child.material.opacity = enabled ? (isUtilitySource ? 0.95 : 0.25) : 1.0;
            child.material.needsUpdate = true;
          }
        });
      }
    }

    this.pipesGroup.visible = enabled || this.activeOverlay === 'water';
    this.wiresGroup.visible = enabled || this.activeOverlay === 'power';
    this.coverageGroup.visible = enabled || this.activeOverlay === 'water' || this.activeOverlay === 'power';

    this.rebuildCoverageMeshes();
  }

  // --- CLEAR ALL (For City Plan Loading) ---
  public clearAll() {
    // Clear buildings
    for (const b of this.buildings.values()) {
      if (b.meshGroup) {
        this.buildingsGroup.remove(b.meshGroup);
        b.meshGroup.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); });
      }
    }
    this.buildings.clear();

    // Clear services
    for (const s of this.services.values()) {
      if (s.meshGroup) {
        this.servicesGroup.remove(s.meshGroup);
        s.meshGroup.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); });
      }
    }
    this.services.clear();
    this.animatedServiceParts = [];

    // Clear roads
    for (const r of this.roadMeshes.values()) {
      this.scene.remove(r);
      r.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); });
    }
    this.roadMeshes.clear();
    this.roads.clear();

    // Clear zone markers
    for (const m of this.zoneMarkers.values()) {
      this.scene.remove(m);
      m.geometry.dispose();
    }
    this.zoneMarkers.clear();

    // Clear vehicles & pedestrians
    for (const car of this.cars) {
      if (car.mesh) {
        this.carsGroup.remove(car.mesh);
        car.mesh.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); });
      }
    }
    this.cars = [];

    for (const ped of this.pedestrians) {
      if (ped.mesh) {
        this.pedestriansGroup.remove(ped.mesh);
      }
    }
    this.pedestrians = [];

    // Clear underground pipes
    for (const p of this.pipeMeshes.values()) {
      this.pipesGroup.remove(p);
      p.traverse((c: any) => { if (c.isMesh) c.geometry?.dispose(); });
    }
    this.pipeMeshes.clear();
    this.pipes.clear();

    // Clear underground wires
    for (const w of this.wireMeshes.values()) {
      this.wiresGroup.remove(w);
      w.traverse((c: any) => { if (c.isMesh) c.geometry?.dispose(); });
    }
    this.wireMeshes.clear();
    this.wires.clear();

    this.waterCoveredTiles.clear();
    this.powerCoveredTiles.clear();
    this.coverageGroup.clear();
    this.clearScenery();

    this.streetLightsList = [];
    this.windowMeshesList = [];
    this.tiles.clear();

    // Reset terrain tile states to base biome terrain
    const half = this.size / 2;
    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        const k = this.getKey(x, z);
        this.tiles.set(k, this.baseTerrainTypes.get(k) || 'grass');
      }
    }

    this.recalculateCityGrids();
  }

  // --- AUTOSAVE & STORAGE SYSTEM ---
  public hasActiveCity(): boolean {
    return this.roads.size > 0 || this.buildings.size > 0 || this.services.size > 0 || this.zoneMarkers.size > 0;
  }

  public saveCityToStorage(): boolean {
    try {
      const roadList: { x: number; z: number; type: RoadType }[] = [];
      for (const r of this.roads.values()) {
        roadList.push({ x: r.x, z: r.z, type: r.type });
      }

      const serviceList: { x: number; z: number; type: ServiceType }[] = [];
      for (const s of this.services.values()) {
        serviceList.push({ x: s.x, z: s.z, type: s.type });
      }

      const zoneList: { x: number; z: number; type: 'residential' | 'commercial' | 'industrial' }[] = [];
      for (const [key] of this.zoneMarkers.entries()) {
        const [xs, zs] = key.split(',');
        const tileType = this.tiles.get(key);
        if (tileType && tileType.startsWith('zone_')) {
          const zType = tileType.replace('zone_', '') as 'residential' | 'commercial' | 'industrial';
          zoneList.push({ x: parseInt(xs, 10), z: parseInt(zs, 10), type: zType });
        }
      }

      const buildingList: any[] = [];
      for (const b of this.buildings.values()) {
        buildingList.push({
          x: b.x,
          z: b.z,
          zoneType: b.zoneType,
          height: b.height,
          maxHeight: b.maxHeight,
          level: b.level,
          occupants: b.occupants,
          color: b.color,
          trimColor: b.trimColor
        });
      }

      const pipeList: { x: number; z: number }[] = [];
      for (const p of this.pipes.values()) {
        pipeList.push({ x: p.x, z: p.z });
      }

      const wireList: { x: number; z: number }[] = [];
      for (const w of this.wires.values()) {
        wireList.push({ x: w.x, z: w.z });
      }

      const saveData = {
        version: 1,
        timestamp: Date.now(),
        biome: this.currentBiome,
        size: this.size,
        stats: { ...this.stats },
        roads: roadList,
        services: serviceList,
        zones: zoneList,
        buildings: buildingList,
        pipes: pipeList,
        wires: wireList
      };

      localStorage.setItem('theotown_3d_autosave', JSON.stringify(saveData));
      return true;
    } catch (err) {
      console.warn('[Autosave] Failed to save city state to localStorage:', err);
      return false;
    }
  }

  public loadCityFromStorage(): boolean {
    try {
      const raw = localStorage.getItem('theotown_3d_autosave');
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || !data.biome) return false;

      this.isRestoringSave = true;
      if (data.size && [48, 64, 96, 128].includes(data.size)) {
        this.setMapSize(data.size);
      } else {
        this.setMapSize(64);
      }
      this.generateBiome(data.biome);

      // Restore Roads
      if (Array.isArray(data.roads)) {
        for (const r of data.roads) {
          this.placeRoad(r.x, r.z, r.type, false);
        }
      }
      this.sanitizeBridgesOnLand();

      // Restore Services
      if (Array.isArray(data.services)) {
        for (const s of data.services) {
          this.placeService(s.x, s.z, s.type);
        }
      }

      // Restore Pipes
      if (Array.isArray(data.pipes)) {
        for (const p of data.pipes) {
          this.placePipe(p.x, p.z, 0);
        }
      }

      // Restore Wires
      if (Array.isArray(data.wires)) {
        for (const w of data.wires) {
          this.placeWire(w.x, w.z, 0);
        }
      }

      // Restore Zones
      if (Array.isArray(data.zones)) {
        for (const z of data.zones) {
          this.placeZone(z.x, z.z, z.type);
        }
      }

      // Restore Buildings
      if (Array.isArray(data.buildings)) {
        for (const bData of data.buildings) {
          const key = this.getKey(bData.x, bData.z);
          const b: VoxelBuilding = {
            id: key,
            x: bData.x,
            z: bData.z,
            height: bData.height,
            maxHeight: bData.maxHeight,
            zoneType: bData.zoneType,
            level: bData.level,
            occupants: bData.occupants,
            color: bData.color,
            trimColor: bData.trimColor,
            hasPower: true,
            hasWater: true,
            hasPolice: true,
            hasFire: true,
            hasHealth: true,
            happiness: 80
          };
          this.buildings.set(key, b);
          this.buildVoxelMesh(b);
          const marker = this.zoneMarkers.get(key);
          if (marker) marker.visible = false;
        }
      }

      // Restore Stats
      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }

      this.isRestoringSave = false;
      this.recalculateCityGrids();
      return true;
    } catch (err) {
      this.isRestoringSave = false;
      console.warn('[Autosave] Failed to load city state from localStorage:', err);
      return false;
    }
  }

  public clearAutosave() {
    try {
      localStorage.removeItem('theotown_3d_autosave');
    } catch (e) {
      console.warn('Could not clear autosave:', e);
    }
  }

  // --- DEMOLISH ---
  public demolish(x: number, z: number, refund: boolean = true) {
    const key = this.getKey(x, z);

    // If in underground mode, prioritize removing underground pipe or wire at this tile
    if (this.isUndergroundMode) {
      let removedUtility = false;
      if (this.pipes.has(key)) {
        this.demolishPipe(x, z);
        removedUtility = true;
      }
      if (this.wires.has(key)) {
        this.demolishWire(x, z);
        removedUtility = true;
      }
      if (removedUtility) {
        if (refund) this.stats.money += 2;
        this.recalculateCityGrids();
        return;
      }
    }

    const current = this.tiles.get(key);
    const baseType = this.baseTerrainTypes.get(key) || 'grass';
    if (!current || current === baseType) return;

    if (refund) {
      this.stats.money += 5;
    }

    // Demolish Building
    const b = this.buildings.get(key);
    if (b && b.meshGroup) {
      this.buildingsGroup.remove(b.meshGroup);
      b.meshGroup.traverse((child: any) => {
        if (child.isMesh) child.geometry.dispose();
      });
      this.buildings.delete(key);
    }

    // Demolish Service
    const s = this.services.get(key);
    if (s && s.meshGroup) {
      this.servicesGroup.remove(s.meshGroup);
      s.meshGroup.traverse((child: any) => {
        if (child.isMesh) child.geometry.dispose();
      });
      this.services.delete(key);
    }

    // Demolish Road
    const rMesh = this.roadMeshes.get(key);
    if (rMesh) {
      this.scene.remove(rMesh);
      this.roadMeshes.delete(key);
      this.roads.delete(key);
      this.updateSurroundingRoads(x, z);
    }

    // Demolish Zone
    const zMesh = this.zoneMarkers.get(key);
    if (zMesh) {
      this.scene.remove(zMesh);
      zMesh.geometry.dispose();
      this.zoneMarkers.delete(key);
    }

    this.tiles.set(key, baseType);
    this.recalculateCityGrids();
  }

  public hasAdjacentRoad(x: number, z: number): boolean {
    return (
      this.roads.has(this.getKey(x, z - 1)) ||
      this.roads.has(this.getKey(x, z + 1)) ||
      this.roads.has(this.getKey(x - 1, z)) ||
      this.roads.has(this.getKey(x + 1, z))
    );
  }

  // --- CITIES: SKYLINES 2 SIMULATION TICK ---
  public updateSimulation() {
    if (this.stats.gameSpeed === 0) return;

    // Advance Day & Clock
    this.stats.timeOfDay = (this.stats.timeOfDay + 0.1 * this.stats.gameSpeed) % 24;
    const hour = this.stats.timeOfDay;

    // Six Distinct Day/Night Progression Phases
    if (hour >= 5 && hour < 8) {
      this.stats.timePhase = 'Early Morning';
      this.stats.isNight = false;
    } else if (hour >= 8 && hour < 12) {
      this.stats.timePhase = 'Morning';
      this.stats.isNight = false;
    } else if (hour >= 12 && hour < 14) {
      this.stats.timePhase = 'Noon';
      this.stats.isNight = false;
    } else if (hour >= 14 && hour < 17.5) {
      this.stats.timePhase = 'Afternoon';
      this.stats.isNight = false;
    } else if (hour >= 17.5 && hour < 20.5) {
      this.stats.timePhase = 'Evening';
      this.stats.isNight = true; // Evening lights turn on!
    } else {
      this.stats.timePhase = 'Night';
      this.stats.isNight = true;
    }

    if (this.stats.timeOfDay < 0.1 * this.stats.gameSpeed) {
      this.stats.day += 1;
    }

    // 1. Recalculate utility grids & service coverage
    this.recalculateCityGrids();

    // 2. Building growth and upgrades based on CS2 factors (Power, Water, Happiness)
    for (const [key, type] of this.tiles.entries()) {
      if (type.startsWith('zone_')) {
        const [xStr, zStr] = key.split(',');
        const x = parseInt(xStr);
        const z = parseInt(zStr);

        if (!this.hasAdjacentRoad(x, z)) continue;

        const zone = type.replace('zone_', '') as 'residential' | 'commercial' | 'industrial';
        let demand = 0;
        if (zone === 'residential') demand = this.stats.demandRes;
        if (zone === 'commercial') demand = this.stats.demandCom;
        if (zone === 'industrial') demand = this.stats.demandInd;

        const building = this.buildings.get(key);
        const canGrow = !building || (building.hasPower && building.hasWater && building.happiness > 60);

        if (canGrow && Math.random() * 100 < demand * 0.05 * this.stats.gameSpeed) {
          this.growBuilding(x, z, zone);
        }
      }
    }

    // 3. Citizen & Vehicle Spawning
    const sizeScale = this.size / 64;
    const maxCars = Math.min(Math.floor(this.roads.size * 0.45) + 3, Math.round(30 * sizeScale));
    if (this.roads.size >= 4 && this.cars.length < maxCars) {
      if (Math.random() < 0.35 * this.stats.gameSpeed) {
        this.spawnCar();
      }
    }

    // Spawn walking citizens along sidewalks only when there are citizens (population > 0)
    const allowedPeds = Math.min(Math.floor(this.stats.population / 25) + 2, Math.round(25 * sizeScale));
    if (this.roads.size >= 2 && this.pedestrians.length < allowedPeds) {
      if (Math.random() < 0.35 * this.stats.gameSpeed) {
        this.spawnPedestrian();
      }
    }

    // 4. Financial budget tick
    this.updateEconomy();
  }

  // --- GRID & SERVICE CALCULATOR ---
  private recalculateCityGrids() {
    this.recalculateUtilities();

    let totalPowerCap = 0;
    let totalWaterCap = 0;
    let totalUpkeep = 0;

    for (const service of this.services.values()) {
      const def = SERVICE_DEFS[service.type];
      if (def) {
        totalUpkeep += def.upkeep;
        if (def.powerOutput) totalPowerCap += def.powerOutput;
        if (def.waterOutput) totalWaterCap += def.waterOutput;
      }
    }

    this.stats.powerCapacity = totalPowerCap;
    this.stats.waterCapacity = totalWaterCap;
    this.stats.expenses = totalUpkeep;

    let powerUsed = 0;
    let waterUsed = 0;
    let totalPop = 0;
    let totalJobs = 0;
    let totalHappiness = 0;
    let buildingCount = 0;

    for (const b of this.buildings.values()) {
      buildingCount++;
      const powerNeed = b.height * 2;
      const waterNeed = b.height * 1.5;

      powerUsed += powerNeed;
      waterUsed += waterNeed;

      const isWaterCovered = this.waterCoveredTiles.has(this.getKey(b.x, b.z));
      const isPowerCovered = this.powerCoveredTiles.has(this.getKey(b.x, b.z));

      b.hasPower = isPowerCovered && (this.stats.powerCapacity >= powerUsed);
      b.hasWater = isWaterCovered && (this.stats.waterCapacity >= waterUsed);

      // Check distance to services
      b.hasPolice = this.isCoveredByService(b.x, b.z, 'police_station');
      b.hasFire = this.isCoveredByService(b.x, b.z, 'fire_station');
      b.hasHealth = this.isCoveredByService(b.x, b.z, 'hospital');
      const hasPark = this.isCoveredByService(b.x, b.z, 'park');

      // Calculate CS2 Happiness Index (0-100)
      let score = 50;
      if (b.hasPower) score += 15; else score -= 25;
      if (b.hasWater) score += 15; else score -= 25;
      if (b.hasPolice) score += 8;
      if (b.hasFire) score += 6;
      if (b.hasHealth) score += 8;
      if (hasPark) score += 12;

      // Tax rate satisfaction penalty
      if (this.stats.taxRate > 12) score -= (this.stats.taxRate - 12) * 4;
      if (this.stats.taxRate < 8) score += (8 - this.stats.taxRate) * 2;

      b.happiness = Math.max(0, Math.min(100, score));
      totalHappiness += b.happiness;

      if (b.zoneType === 'residential') {
        totalPop += b.occupants;
      } else {
        totalJobs += b.occupants * 2;
      }
    }

    let totalZoned = 0;
    let waterCoveredZoned = 0;
    let powerCoveredZoned = 0;

    for (const [key, type] of this.tiles.entries()) {
      if (type.startsWith('zone_') || this.buildings.has(key)) {
        totalZoned++;
        if (this.waterCoveredTiles.has(key)) waterCoveredZoned++;
        if (this.powerCoveredTiles.has(key)) powerCoveredZoned++;
      }
    }

    this.stats.waterCoveredPct = totalZoned > 0 ? Math.round((waterCoveredZoned / totalZoned) * 100) : 100;
    this.stats.powerCoveredPct = totalZoned > 0 ? Math.round((powerCoveredZoned / totalZoned) * 100) : 100;

    this.stats.powerDemand = powerUsed;
    this.stats.waterDemand = waterUsed;
    this.stats.population = totalPop;
    this.stats.jobs = totalJobs;
    this.stats.happiness = buildingCount > 0 ? Math.round(totalHappiness / buildingCount) : 85;

    // Calculate dynamic RCI Demand
    this.updateRCIDemand();
  }

  private isCoveredByService(x: number, z: number, type: ServiceType): boolean {
    const def = SERVICE_DEFS[type];
    if (!def) return false;
    for (const s of this.services.values()) {
      if (s.type === type) {
        const dist = Math.hypot(s.x - x, s.z - z);
        if (dist <= def.range) return true;
      }
    }
    return false;
  }

  private updateRCIDemand() {
    // Cities: Skylines 2 RCI formula:
    // High jobs relative to pop -> high Residential demand
    // High pop relative to commercial -> high Commercial demand
    // Unemployment / low production -> high Industrial demand
    const pop = Math.max(1, this.stats.population);
    const jobs = this.stats.jobs;

    const jobRatio = jobs / pop;
    if (jobRatio > 0.8) {
      this.stats.demandRes = Math.min(100, this.stats.demandRes + 3);
    } else {
      this.stats.demandRes = Math.max(15, this.stats.demandRes - 2);
    }

    if (pop > jobs) {
      this.stats.demandCom = Math.min(90, this.stats.demandCom + 2);
      this.stats.demandInd = Math.min(85, this.stats.demandInd + 2);
    } else {
      this.stats.demandCom = Math.max(10, this.stats.demandCom - 2);
      this.stats.demandInd = Math.max(10, this.stats.demandInd - 2);
    }
  }

  private updateEconomy() {
    // Tax Income based on population, commercial jobs and tax rate
    const taxFactor = (this.stats.taxRate / 100);
    this.stats.income = Math.floor((this.stats.population * 2.5 + this.stats.jobs * 3.5) * taxFactor);

    const netFlow = this.stats.income - this.stats.expenses;
    if (Math.random() < 0.1 * this.stats.gameSpeed) {
      this.stats.money += netFlow;
    }
  }

  // --- BUILDING GENERATION & UPGRADE ---
  private growBuilding(x: number, z: number, zoneType: 'residential' | 'commercial' | 'industrial') {
    const key = this.getKey(x, z);
    let building = this.buildings.get(key);

    if (!building) {
      const initialMaxH = zoneType === 'residential' ? 2 + Math.floor(Math.random() * 3) :
                          zoneType === 'commercial' ? 3 + Math.floor(Math.random() * 4) :
                          1 + Math.floor(Math.random() * 2);

      const wallColors = zoneType === 'residential' ? this.COLORS.resWall :
                         zoneType === 'commercial' ? this.COLORS.comWall :
                         this.COLORS.indWall;
      const wallColor = wallColors[Math.floor(Math.random() * wallColors.length)];
      const initialOccupants = zoneType === 'residential' ? 14 : zoneType === 'commercial' ? 20 : 25;

      building = {
        id: key,
        x,
        z,
        height: 1,
        maxHeight: initialMaxH,
        zoneType,
        level: 1,
        occupants: initialOccupants,
        color: wallColor,
        trimColor: this.COLORS.resRoof[Math.floor(Math.random() * this.COLORS.resRoof.length)],
        hasPower: true,
        hasWater: true,
        hasPolice: true,
        hasFire: true,
        hasHealth: true,
        happiness: 80
      };

      this.buildings.set(key, building);
      this.buildVoxelMesh(building);

      const marker = this.zoneMarkers.get(key);
      if (marker) marker.visible = false;
    } else {
      // Skyscraper level-up upgrades when well-serviced by utilities and public safety
      const isServiced = building.hasPower && building.hasWater && building.happiness >= 65;
      if (isServiced && building.height >= building.maxHeight) {
        if (building.zoneType === 'residential' && building.maxHeight < 14) {
          building.maxHeight += 2;
        } else if (building.zoneType === 'commercial' && building.maxHeight < 16) {
          building.maxHeight += 2;
        } else if (building.zoneType === 'industrial' && building.maxHeight < 6) {
          building.maxHeight += 1;
        }
      }

      if (building.height < building.maxHeight) {
        building.height++;
        building.level = Math.ceil(building.height / 2);

        // Density scaling: low-rise -> mid-rise -> high-rise -> megacity skyscraper (millions of population)
        if (building.height <= 2) {
          building.occupants = 14 + building.height * 14;
        } else if (building.height <= 4) {
          building.occupants = 65 + (building.height - 2) * 110;
        } else if (building.height <= 7) {
          building.occupants = 450 + (building.height - 4) * 750;
        } else if (building.height <= 10) {
          building.occupants = 3200 + (building.height - 7) * 3500;
        } else {
          building.occupants = 16000 + (building.height - 10) * 9000; // 16,000 to 52,000 per mega tower
        }

        this.buildVoxelMesh(building);
      }
    }
  }

  private buildVoxelMesh(b: VoxelBuilding) {
    if (b.meshGroup) {
      this.buildingsGroup.remove(b.meshGroup);
      b.meshGroup.traverse((child: any) => {
        if (child.isMesh) child.geometry.dispose();
      });
    }

    const group = new THREE.Group();
    group.position.set(b.x + 0.5, 0, b.z + 0.5);

    const floorHeight = 0.6;
    const buildingWidth = 0.85;

    for (let f = 0; f < b.height; f++) {
      const floorY = f * floorHeight + (floorHeight / 2);
      
      const floorGeo = new THREE.BoxGeometry(buildingWidth, floorHeight * 0.98, buildingWidth);
      const floorMat = new THREE.MeshLambertMaterial({ color: b.color });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = floorY;
      floorMesh.castShadow = true;
      floorMesh.receiveShadow = true;
      group.add(floorMesh);

      // Windows (Minecraft/Voxel style glowing cutouts)
      const offsets = [-0.22, 0.22];
      for (const off of offsets) {
        const isLit = Math.random() > 0.25;
        const baseColor = isLit ? this.COLORS.window : this.COLORS.windowOff;
        const winMat = new THREE.MeshBasicMaterial({ color: baseColor });

        const winF = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), winMat);
        winF.position.set(off, floorY, (buildingWidth / 2) + 0.005);
        group.add(winF);
        this.windowMeshesList.push({ mesh: winF, originalColor: baseColor });

        const winB = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), winMat);
        winB.position.set(off, floorY, -(buildingWidth / 2) - 0.005);
        group.add(winB);
        this.windowMeshesList.push({ mesh: winB, originalColor: baseColor });

        const winL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), winMat);
        winL.rotation.y = Math.PI / 2;
        winL.position.set(-(buildingWidth / 2) - 0.005, floorY, off);
        group.add(winL);
        this.windowMeshesList.push({ mesh: winL, originalColor: baseColor });

        const winR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), winMat);
        winR.rotation.y = Math.PI / 2;
        winR.position.set((buildingWidth / 2) + 0.005, floorY, off);
        group.add(winR);
        this.windowMeshesList.push({ mesh: winR, originalColor: baseColor });
      }
    }

    const roofY = b.height * floorHeight;
    if (b.zoneType === 'residential') {
      const roofGeo = new THREE.BoxGeometry(buildingWidth + 0.05, 0.2, buildingWidth + 0.05);
      const roofMat = new THREE.MeshLambertMaterial({ color: b.trimColor });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.y = roofY + 0.1;
      roofMesh.castShadow = true;
      group.add(roofMesh);
    } else {
      const acGeo = new THREE.BoxGeometry(0.25, 0.2, 0.25);
      const acMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const acMesh = new THREE.Mesh(acGeo, acMat);
      acMesh.position.set(0.1, roofY + 0.1, 0.1);
      group.add(acMesh);

      if (b.height >= 4) {
        const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
        const antMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        const antMesh = new THREE.Mesh(antGeo, antMat);
        antMesh.position.set(0, roofY + 0.3, 0);
        group.add(antMesh);
      }
    }

    group.scale.set(0.2, 0.2, 0.2);
    const animatePop = () => {
      if (group.scale.x < 1) {
        group.scale.addScalar(0.15);
        requestAnimationFrame(animatePop);
      } else {
        group.scale.set(1, 1, 1);
      }
    };
    animatePop();

    this.buildingsGroup.add(group);
    b.meshGroup = group;
  }

  // --- INFOGRAPHIC OVERLAYS (Power, Water, Happiness, Services) ---
  public setOverlay(overlay: ActiveOverlay) {
    this.activeOverlay = overlay;
    this.overlayGroup.clear();

    if (overlay === 'none') return;

    for (const b of this.buildings.values()) {
      let color = 0x22c55e;
      if (overlay === 'power') {
        color = b.hasPower ? 0xfacc15 : 0xef4444;
      } else if (overlay === 'water') {
        color = b.hasWater ? 0x0ea5e9 : 0xef4444;
      } else if (overlay === 'happiness') {
        color = b.happiness > 70 ? 0x22c55e : b.happiness > 40 ? 0xf59e0b : 0xef4444;
      } else if (overlay === 'services') {
        const covered = b.hasPolice && b.hasFire && b.hasHealth;
        color = covered ? 0x3b82f6 : 0xf59e0b;
      }

      const ringGeo = new THREE.RingGeometry(0.2, 0.45, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(b.x + 0.5, b.height * 0.6 + 0.15, b.z + 0.5);
      this.overlayGroup.add(ring);
    }
  }

  // --- VEHICLE & PEDESTRIAN TRAFFIC ENGINE ---
  public spawnInitialTraffic() {
    this.spawnCar();
    this.spawnCar();
  }

  private spawnCar() {
    const roadList = Array.from(this.roads.values());
    if (roadList.length < 4) return;

    let start = roadList[Math.floor(Math.random() * roadList.length)];
    let destination = roadList[Math.floor(Math.random() * roadList.length)];
    let attempts = 0;
    while (Math.hypot(start.x - destination.x, start.z - destination.z) < 4 && attempts++ < 15) {
      destination = roadList[Math.floor(Math.random() * roadList.length)];
    }

    if (start === destination) return;

    for (const car of this.cars) {
      if (Math.hypot(car.x - (start.x + 0.5), car.z - (start.z + 0.5)) < 1.4) {
        return;
      }
    }

    const path = this.findRoadPath(start.x, start.z, destination.x, destination.z);
    if (!path || path.length < 3) return;

    const rand = Math.random();
    let type: VehicleType = 'sedan';
    let baseMaxSpeed = 0.045;

    if (rand < 0.35) {
      type = 'sedan';
      baseMaxSpeed = 0.046;
    } else if (rand < 0.55) {
      type = 'suv';
      baseMaxSpeed = 0.042;
    } else if (rand < 0.70) {
      type = 'truck';
      baseMaxSpeed = 0.034;
    } else if (rand < 0.85) {
      type = 'bus';
      baseMaxSpeed = 0.030;
    } else if (rand < 0.92) {
      type = 'police';
      baseMaxSpeed = 0.055;
    } else {
      type = 'ambulance';
      baseMaxSpeed = 0.052;
    }

    const palette = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xf8fafc, 0x334155, 0x0f172a];
    const color = palette[Math.floor(Math.random() * palette.length)];

    const { group, wheels, emergencyLights } = VoxelVehicleBuilder.createVehicle(type, color);

    const startX = start.x + 0.5;
    const startZ = start.z + 0.5;
    const nextTile = path[1];
    const dx = Math.sign(nextTile.x - start.x);
    const dz = Math.sign(nextTile.z - start.z);
    const initialAngle = Math.atan2(dx, dz);

    // Right-hand drive lane offset (+0.22 units strictly to the right of road centerline)
    const LANE_OFFSET = 0.22;
    const rightX = -dz * LANE_OFFSET;
    const rightZ = dx * LANE_OFFSET;

    const roadElevation = start.elevation || 0.04;
    const vehicleY = roadElevation + 0.04;

    group.position.set(startX + rightX, vehicleY, startZ + rightZ);
    group.rotation.y = initialAngle;
    this.carsGroup.add(group);

    const startRoadConfig = ROAD_CONFIGS[start.type] || ROAD_CONFIGS.suburban;
    const initialMaxSpeed = baseMaxSpeed * startRoadConfig.speedLimit;

    const car: CarAgent = {
      id: Math.random().toString(),
      type,
      x: startX + rightX,
      z: startZ + rightZ,
      y: vehicleY,
      speed: initialMaxSpeed,
      baseMaxSpeed,
      maxSpeed: initialMaxSpeed,
      rotationY: initialAngle,
      color,
      path: path.slice(2),
      fromTile: { x: start.x, z: start.z },
      toTile: { x: nextTile.x, z: nextTile.z },
      mesh: group,
      wheels,
      emergencyLights,
      animTick: 0,
      laneOffset: { x: rightX, z: rightZ },
      stuckTicks: 0
    };

    this.cars.push(car);
  }

  // Setup smooth quadratic Bezier arc across an intersection corner tile
  private startCarTurn(
    car: CarAgent,
    inDx: number,
    inDz: number,
    inRx: number,
    inRz: number,
    outDx: number,
    outDz: number
  ) {
    const LANE_OFFSET = 0.22;
    const outRx = -outDz * LANE_OFFSET;
    const outRz = outDx * LANE_OFFSET;
    const cornerX = car.toTile.x + 0.5;
    const cornerZ = car.toTile.z + 0.5;

    const pIn = {
      x: cornerX - (inDx * 0.5) + inRx,
      z: cornerZ - (inDz * 0.5) + inRz
    };
    const pOut = {
      x: cornerX + (outDx * 0.5) + outRx,
      z: cornerZ + (outDz * 0.5) + outRz
    };

    // The control point p1 is the exact intersection of incoming and outgoing right lanes
    let p1X = cornerX;
    let p1Z = cornerZ;
    if (inDx !== 0) {
      p1X = pOut.x;
      p1Z = pIn.z;
    } else {
      p1X = pIn.x;
      p1Z = pOut.z;
    }

    const d01 = Math.hypot(p1X - pIn.x, p1Z - pIn.z);
    const d12 = Math.hypot(pOut.x - p1X, pOut.z - p1Z);
    const d02 = Math.hypot(pOut.x - pIn.x, pOut.z - pIn.z);
    const arcLength = Math.max(0.2, (d02 + d01 + d12) * 0.5);

    car.turn = {
      pIn,
      p1: { x: p1X, z: p1Z },
      pOut,
      outHeading: Math.atan2(outDx, outDz),
      arcLength,
      progress: 0
    };
  }

  private spawnPedestrian() {
    // Only spawn pedestrians on ground streets with sidewalks (Suburban or Avenue), never on highways or empty terrain
    const walkableRoads = Array.from(this.roads.values()).filter(
      r => r.type === 'suburban' || r.type === 'avenue'
    );
    if (walkableRoads.length < 2) return;

    const start = walkableRoads[Math.floor(Math.random() * walkableRoads.length)];
    const destination = walkableRoads[Math.floor(Math.random() * walkableRoads.length)];
    if (start === destination) return;

    const path = this.findRoadPath(start.x, start.z, destination.x, destination.z);
    if (!path || path.length < 2) return;

    const { group, leftLeg, rightLeg } = VoxelPedestrianBuilder.createPedestrian();
    const side = Math.random() > 0.5 ? 1 : -1;

    // Constrain strictly to the paved outer sidewalk ribbon (0.44 units from road centerline)
    const SIDEWALK_OFFSET = 0.44;
    const startX = start.x + 0.5;
    const startZ = start.z + 0.5;
    const nextTile = path[1];
    const dx = Math.sign(nextTile.x - start.x);
    const dz = Math.sign(nextTile.z - start.z);
    const heading = Math.atan2(dx, dz);

    const offX = -dz * (SIDEWALK_OFFSET * side);
    const offZ = dx * (SIDEWALK_OFFSET * side);

    const roadElevation = start.elevation || 0.04;
    const pedY = roadElevation + 0.08; // On top of raised sidewalk curb

    group.position.set(startX + offX, pedY, startZ + offZ);
    group.rotation.y = heading;
    this.pedestriansGroup.add(group);

    const ped: PedestrianAgent = {
      id: Math.random().toString(),
      x: startX + offX,
      z: startZ + offZ,
      speed: 0.016 + Math.random() * 0.005,
      rotationY: heading,
      color: 0xffffff,
      path: path.slice(2),
      fromTile: { x: start.x, z: start.z },
      toTile: { x: nextTile.x, z: nextTile.z },
      mesh: group,
      animTick: 0,
      sidewalkSide: side
    };
    (ped as any).leftLeg = leftLeg;
    (ped as any).rightLeg = rightLeg;
    (ped as any).y = pedY;

    this.pedestrians.push(ped);
  }

  private findRoadPath(startX: number, startZ: number, endX: number, endZ: number): { x: number; z: number }[] | null {
    const queue: { x: number; z: number; path: { x: number; z: number }[] }[] = [];
    const visited = new Set<string>();

    queue.push({ x: startX, z: startZ, path: [{ x: startX, z: startZ }] });
    visited.add(this.getKey(startX, startZ));

    let maxSteps = 160;
    while (queue.length > 0 && maxSteps-- > 0) {
      const current = queue.shift()!;
      if (current.x === endX && current.z === endZ) {
        return current.path;
      }

      const neighbors = [
        { x: current.x, z: current.z - 1 },
        { x: current.x, z: current.z + 1 },
        { x: current.x - 1, z: current.z },
        { x: current.x + 1, z: current.z }
      ];

      for (const n of neighbors) {
        const key = this.getKey(n.x, n.z);
        if (this.roads.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push({
            x: n.x,
            z: n.z,
            path: [...current.path, { x: n.x, z: n.z }]
          });
        }
      }
    }
    return null;
  }

  // --- PHYSICS ENGINE: CARS & PEDESTRIANS & WIND TURBINES ---
  public updatePhysics(deltaTime: number) {
    if (this.stats.gameSpeed === 0) return;
    const speedMult = this.stats.gameSpeed;

    // 1. Animate Wind Turbines, Smokestacks & Fusion Plasma
    for (const part of this.animatedServiceParts) {
      if (part.type === 'spin_z' && part.object) {
        part.object.rotation.z += part.speed * speedMult;
      } else if (part.type === 'spin_y' && part.object) {
        part.object.rotation.y += part.speed * speedMult;
      } else if (part.type === 'pulse_smoke' && part.object) {
        part.object.scale.addScalar(0.01 * speedMult);
        if (part.object.scale.x > 1.8) {
          part.object.scale.set(0.8, 0.8, 0.8);
        }
      }
    }

    // 2. Car Physics
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      car.animTick = (car.animTick || 0) + 1;

      // Safety check 1: Car must be currently on a road tile
      const curTileX = Math.floor(car.x);
      const curTileZ = Math.floor(car.z);
      const currentRoad = this.roads.get(this.getKey(curTileX, curTileZ));
      if (!currentRoad) {
        this.removeCar(i);
        continue;
      }

      // Safety check 2: Car's current and target road tiles must still exist
      if (!this.roads.has(this.getKey(car.fromTile.x, car.fromTile.z)) ||
          !this.roads.has(this.getKey(car.toTile.x, car.toTile.z))) {
        this.removeCar(i);
        continue;
      }

      const roadConfig = ROAD_CONFIGS[currentRoad.type] || ROAD_CONFIGS.suburban;
      car.maxSpeed = car.baseMaxSpeed * roadConfig.speedLimit;
      const targetY = roadConfig.elevation + 0.04;
      car.y += (targetY - car.y) * 0.15;

      // Forward and right normal vectors for car's local coordinate frame
      const forwardX = Math.sin(car.rotationY);
      const forwardZ = Math.cos(car.rotationY);
      const rightX = Math.cos(car.rotationY);
      const rightZ = -Math.sin(car.rotationY);

      let desiredSpeed = car.maxSpeed;
      let emergencyBrake = false;

      // 1. Same-lane Following & Anti-Rear-End Collision
      for (let j = 0; j < this.cars.length; j++) {
        if (i === j) continue;
        const other = this.cars[j];

        const deltaX = other.x - car.x;
        const deltaZ = other.z - car.z;
        const dForward = deltaX * forwardX + deltaZ * forwardZ;
        const dLateral = Math.abs(deltaX * rightX + deltaZ * rightZ);

        // Target vehicle is in front within our travel corridor (width 0.38)
        if (dForward > 0 && dForward < 2.0 && dLateral < 0.38) {
          const MIN_STOP_GAP = 1.10; // Leaves ~0.22 unit visible gap between bumpers
          if (dForward <= MIN_STOP_GAP) {
            desiredSpeed = 0;
            emergencyBrake = true;
          } else {
            // Smoothly decelerate to match lead vehicle speed
            const ratio = (dForward - MIN_STOP_GAP) / (2.0 - MIN_STOP_GAP);
            const followSpeed = Math.max(0, other.speed) * ratio;
            desiredSpeed = Math.min(desiredSpeed, followSpeed);
          }
        }
      }

      // 2. Intersection Right-of-Way & Cross-Traffic Yielding
      if (!car.turn) {
        const dx = Math.sign(car.toTile.x - car.fromTile.x);
        const dz = Math.sign(car.toTile.z - car.fromTile.z);
        const LANE_OFFSET = 0.22;
        const rx = -dz * LANE_OFFSET;
        const rz = dx * LANE_OFFSET;

        const entryBoundaryX = car.toTile.x + 0.5 - (dx * 0.5) + rx;
        const entryBoundaryZ = car.toTile.z + 0.5 - (dz * 0.5) + rz;
        const distToEntry = Math.hypot(entryBoundaryX - car.x, entryBoundaryZ - car.z);

        // Approaching intersection entrance (within 0.85 units)
        if (distToEntry < 0.85) {
          for (let j = 0; j < this.cars.length; j++) {
            if (i === j) continue;
            const other = this.cars[j];

            // Is other car currently physically inside or turning through toTile?
            const otherInToTile = (Math.floor(other.x) === car.toTile.x && Math.floor(other.z) === car.toTile.z) ||
                                  (other.turn && other.toTile.x === car.toTile.x && other.toTile.z === car.toTile.z);

            if (otherInToTile) {
              desiredSpeed = 0;
              emergencyBrake = true;
              break;
            }

            // Is other car also approaching toTile?
            if (!other.turn && other.toTile.x === car.toTile.x && other.toTile.z === car.toTile.z) {
              const otherDistToCenter = Math.hypot((other.toTile.x + 0.5) - other.x, (other.toTile.z + 0.5) - other.z);
              const myDistToCenter = Math.hypot((car.toTile.x + 0.5) - car.x, (car.toTile.z + 0.5) - car.z);

              const isEmergency = (t: string) => t === 'police' || t === 'ambulance' || t === 'firetruck';
              const iAmEmergency = isEmergency(car.type);
              const otherIsEmergency = isEmergency(other.type);

              let shouldYield = false;
              if (otherIsEmergency && !iAmEmergency) {
                shouldYield = true;
              } else if (iAmEmergency && !otherIsEmergency) {
                shouldYield = false;
              } else {
                if (otherDistToCenter < myDistToCenter - 0.05) {
                  shouldYield = true;
                } else if (Math.abs(otherDistToCenter - myDistToCenter) <= 0.05) {
                  shouldYield = car.id > other.id;
                }
              }

              if (shouldYield && (car.stuckTicks || 0) < 45) {
                desiredSpeed = 0;
                emergencyBrake = true;
                break;
              }
            }
          }
        }
      }

      // 3. Yield to Pedestrians Crossing Ahead
      for (let p = 0; p < this.pedestrians.length; p++) {
        const ped = this.pedestrians[p];
        const pDeltaX = ped.x - car.x;
        const pDeltaZ = ped.z - car.z;
        const pForward = pDeltaX * forwardX + pDeltaZ * forwardZ;
        const pLateral = Math.abs(pDeltaX * rightX + pDeltaZ * rightZ);

        if (pForward > 0.1 && pForward < 1.25 && pLateral < 0.36) {
          desiredSpeed = 0;
          emergencyBrake = true;
          break;
        }
      }

      // 4. Yield to Player Vehicle in Drive Mode
      if (this.playerVehicle && this.playerVehicle.isActive) {
        const pvDeltaX = this.playerVehicle.x - car.x;
        const pvDeltaZ = this.playerVehicle.z - car.z;
        const pvForward = pvDeltaX * forwardX + pvDeltaZ * forwardZ;
        const pvLateral = Math.abs(pvDeltaX * rightX + pvDeltaZ * rightZ);

        if (pvForward > 0 && pvForward < 2.0 && pvLateral < 0.45) {
          desiredSpeed = 0;
          emergencyBrake = true;
        }
      }

      // 5. Apply Braking / Acceleration Physics
      if (emergencyBrake) {
        car.speed = Math.min(car.speed * 0.7, desiredSpeed);
        if (car.speed < 0.002) car.speed = 0;
      } else {
        car.speed += (desiredSpeed - car.speed) * 0.2;
      }

      if (car.speed < 0.005) {
        car.stuckTicks = (car.stuckTicks || 0) + 1;
        // Anti-gridlock nudge after ~3.5 seconds
        if (car.stuckTicks > 210) {
          car.speed = car.maxSpeed * 0.35;
        }
        // Despawn if permanently blocked for ~5.5 seconds
        if (car.stuckTicks > 330) {
          this.removeCar(i);
          continue;
        }
      } else {
        car.stuckTicks = 0;
      }

      const moveStep = car.speed * speedMult * (deltaTime * 60);

      // --- PARAMETRIC MOVEMENT: NEVER DRIFTS INTO GRASS ---
      if (car.turn) {
        const turn = car.turn;
        turn.progress += moveStep / turn.arcLength;

        if (turn.progress < 1.0) {
          const t = turn.progress;
          const invT = 1 - t;
          car.x = invT * invT * turn.pIn.x + 2 * invT * t * turn.p1.x + t * t * turn.pOut.x;
          car.z = invT * invT * turn.pIn.z + 2 * invT * t * turn.p1.z + t * t * turn.pOut.z;
          const tanX = 2 * invT * (turn.p1.x - turn.pIn.x) + 2 * t * (turn.pOut.x - turn.p1.x);
          const tanZ = 2 * invT * (turn.p1.z - turn.pIn.z) + 2 * t * (turn.pOut.z - turn.p1.z);
          car.rotationY = Math.atan2(tanX, tanZ);
        } else {
          // Finish turn: snap to outgoing boundary & heading
          car.x = turn.pOut.x;
          car.z = turn.pOut.z;
          car.rotationY = turn.outHeading;
          car.fromTile = { x: car.toTile.x, z: car.toTile.z };
          if (car.path.length > 0) {
            car.toTile = car.path.shift()!;
          } else {
            this.removeCar(i);
            continue;
          }
          delete car.turn;
        }
      } else {
        const dx = Math.sign(car.toTile.x - car.fromTile.x);
        const dz = Math.sign(car.toTile.z - car.fromTile.z);

        if (dx === 0 && dz === 0) {
          this.removeCar(i);
          continue;
        }

        const heading = Math.atan2(dx, dz);
        car.rotationY = heading;

        const LANE_OFFSET = 0.22;
        const rx = -dz * LANE_OFFSET;
        const rz = dx * LANE_OFFSET;

        let willTurnAtToTile = false;
        let nextDx = 0;
        let nextDz = 0;

        if (car.path.length > 0) {
          const nextNext = car.path[0];
          nextDx = Math.sign(nextNext.x - car.toTile.x);
          nextDz = Math.sign(nextNext.z - car.toTile.z);
          if (nextDx !== dx || nextDz !== dz) {
            willTurnAtToTile = true;
          }
        }

        // When to transition: entry boundary of toTile if turning, exit boundary if straight, center if final destination
        let targetBoundaryX: number;
        let targetBoundaryZ: number;

        if (willTurnAtToTile) {
          targetBoundaryX = car.toTile.x + 0.5 - (dx * 0.5) + rx;
          targetBoundaryZ = car.toTile.z + 0.5 - (dz * 0.5) + rz;
        } else if (car.path.length > 0) {
          targetBoundaryX = car.toTile.x + 0.5 + (dx * 0.5) + rx;
          targetBoundaryZ = car.toTile.z + 0.5 + (dz * 0.5) + rz;
        } else {
          targetBoundaryX = car.toTile.x + 0.5 + rx;
          targetBoundaryZ = car.toTile.z + 0.5 + rz;
        }

        if (dx !== 0) {
          // East-West road: lock Z strictly to right lane!
          car.z = car.fromTile.z + 0.5 + rz;
          const remaining = Math.abs(targetBoundaryX - car.x);
          const advance = Math.min(remaining, moveStep);
          car.x += dx * advance;

          if (remaining <= moveStep || Math.abs(targetBoundaryX - car.x) < 0.005) {
            car.x = targetBoundaryX;
            if (willTurnAtToTile) {
              this.startCarTurn(car, dx, dz, rx, rz, nextDx, nextDz);
            } else if (car.path.length > 0) {
              car.fromTile = { x: car.toTile.x, z: car.toTile.z };
              car.toTile = car.path.shift()!;
            } else {
              this.removeCar(i);
              continue;
            }
          }
        } else if (dz !== 0) {
          // North-South road: lock X strictly to right lane!
          car.x = car.fromTile.x + 0.5 + rx;
          const remaining = Math.abs(targetBoundaryZ - car.z);
          const advance = Math.min(remaining, moveStep);
          car.z += dz * advance;

          if (remaining <= moveStep || Math.abs(targetBoundaryZ - car.z) < 0.005) {
            car.z = targetBoundaryZ;
            if (willTurnAtToTile) {
              this.startCarTurn(car, dx, dz, rx, rz, nextDx, nextDz);
            } else if (car.path.length > 0) {
              car.fromTile = { x: car.toTile.x, z: car.toTile.z };
              car.toTile = car.path.shift()!;
            } else {
              this.removeCar(i);
              continue;
            }
          }
        }
      }

      const isDirt = currentRoad?.type === 'dirt';
      const bounceFreq = isDirt ? 0.6 : 0.35;
      const bounceAmp = isDirt ? 0.025 : 0.012;
      const bounce = Math.sin((car.animTick || 0) * bounceFreq) * bounceAmp * (car.speed > 0.01 ? 1 : 0);

      car.mesh.position.set(car.x, car.y + bounce, car.z);
      car.mesh.rotation.y = car.rotationY;

      if (car.wheels && car.wheels.length > 0) {
        const wheelSpin = (moveStep / 0.08);
        for (const w of car.wheels) {
          w.rotation.x += wheelSpin;
        }
      }

      if (car.emergencyLights && car.emergencyLights.length === 2) {
        const flashPhase = Math.floor((car.animTick || 0) / 6) % 2;
        car.emergencyLights[0].visible = flashPhase === 0;
        car.emergencyLights[1].visible = flashPhase === 1;
      }
    }

    // 3. Pedestrian Walking Animation
    const SIDEWALK_OFFSET = 0.44;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const ped = this.pedestrians[i];
      ped.animTick++;

      // Strict road verification: pedestrian must be on a suburban or avenue road
      const curTileX = Math.floor(ped.x);
      const curTileZ = Math.floor(ped.z);
      const curRoad = this.roads.get(this.getKey(curTileX, curTileZ));
      if (!curRoad || (curRoad.type !== 'suburban' && curRoad.type !== 'avenue')) {
        this.removePedestrian(i);
        continue;
      }

      // Check that fromTile and toTile roads still exist
      if (!this.roads.has(this.getKey(ped.fromTile.x, ped.fromTile.z)) ||
          !this.roads.has(this.getKey(ped.toTile.x, ped.toTile.z))) {
        this.removePedestrian(i);
        continue;
      }

      const dx = Math.sign(ped.toTile.x - ped.fromTile.x);
      const dz = Math.sign(ped.toTile.z - ped.fromTile.z);

      if (dx === 0 && dz === 0) {
        this.removePedestrian(i);
        continue;
      }

      const heading = Math.atan2(dx, dz);
      ped.rotationY = heading;

      const offX = -dz * (SIDEWALK_OFFSET * ped.sidewalkSide);
      const offZ = dx * (SIDEWALK_OFFSET * ped.sidewalkSide);

      const step = ped.speed * speedMult * (deltaTime * 60);

      if (dx !== 0) {
        // Pedestrian moving East or West along sidewalk: lock Z to sidewalk ribbon
        ped.z = ped.fromTile.z + 0.5 + offZ;
        const targetX = ped.path.length > 0 
          ? (ped.toTile.x + 0.5 - dx * 0.5) 
          : (ped.toTile.x + 0.5);
        const remaining = Math.abs(targetX - ped.x);
        const advance = Math.min(remaining, step);
        ped.x += dx * advance;

        if (remaining <= step || Math.abs(targetX - ped.x) < 0.005) {
          ped.x = targetX;
          if (ped.path.length > 0) {
            ped.fromTile = { x: ped.toTile.x, z: ped.toTile.z };
            ped.toTile = ped.path.shift()!;
          } else {
            this.removePedestrian(i);
            continue;
          }
        }
      } else if (dz !== 0) {
        // Pedestrian moving North or South along sidewalk: lock X to sidewalk ribbon
        ped.x = ped.fromTile.x + 0.5 + offX;
        const targetZ = ped.path.length > 0 
          ? (ped.toTile.z + 0.5 - dz * 0.5) 
          : (ped.toTile.z + 0.5);
        const remaining = Math.abs(targetZ - ped.z);
        const advance = Math.min(remaining, step);
        ped.z += dz * advance;

        if (remaining <= step || Math.abs(targetZ - ped.z) < 0.005) {
          ped.z = targetZ;
          if (ped.path.length > 0) {
            ped.fromTile = { x: ped.toTile.x, z: ped.toTile.z };
            ped.toTile = ped.path.shift()!;
          } else {
            this.removePedestrian(i);
            continue;
          }
        }
      }

      const roadElev = curRoad.elevation || 0.04;
      const pedY = roadElev + 0.08;
      ped.mesh.position.set(ped.x, pedY, ped.z);
      ped.mesh.rotation.y = ped.rotationY;

      // Leg swing animation
      const swing = Math.sin(ped.animTick * 0.25) * 0.4;
      const leftLeg = (ped as any).leftLeg;
      const rightLeg = (ped as any).rightLeg;
      if (leftLeg && rightLeg) {
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
      }
    }
  }

  private removeCar(index: number) {
    const car = this.cars[index];
    if (!car) return;
    this.carsGroup.remove(car.mesh);
    car.mesh.traverse((c: any) => {
      if (c.isMesh) c.geometry.dispose();
    });
    this.cars.splice(index, 1);
  }

  private removePedestrian(index: number) {
    const ped = this.pedestrians[index];
    if (!ped) return;
    this.pedestriansGroup.remove(ped.mesh);
    ped.mesh.traverse((c: any) => {
      if (c.isMesh) c.geometry.dispose();
    });
    this.pedestrians.splice(index, 1);
  }
}
