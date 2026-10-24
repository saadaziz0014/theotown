export type TileType = 
  | 'grass' 
  | 'water' 
  | 'sand'
  | 'rock'
  | 'road' 
  | 'zone_residential' 
  | 'zone_commercial' 
  | 'zone_industrial'
  | 'service_power_wind'
  | 'service_power_coal'
  | 'service_power_solar'
  | 'service_power_gas'
  | 'service_power_nuclear'
  | 'service_power_fusion'
  | 'service_water_tower'
  | 'service_water_tank'
  | 'service_police_station'
  | 'service_fire_station'
  | 'service_hospital'
  | 'service_park';

export type BiomeType = 'valley' | 'mountains' | 'desert' | 'coastal' | 'plains';

export type RoadType = 'dirt' | 'suburban' | 'avenue' | 'highway' | 'bridge';

export interface RoadConfig {
  id: RoadType;
  name: string;
  cost: number;
  speedLimit: number;
  baseColor: number;
  curbColor: number;
  lineColor: number;
  hasCurbs: boolean;
  hasTrees: boolean;
  hasGuardrails: boolean;
  hasStreetLights: boolean;
  elevation: number;
  description: string;
}

export type ServiceType = 
  | 'power_wind'
  | 'power_coal'
  | 'power_solar'
  | 'power_gas'
  | 'power_nuclear'
  | 'power_fusion'
  | 'water_tower'
  | 'water_tank'
  | 'police_station'
  | 'fire_station'
  | 'hospital'
  | 'park';

export interface ServiceBuildingDef {
  id: ServiceType;
  category: 'power' | 'water' | 'services' | 'park';
  name: string;
  cost: number;
  upkeep: number;
  range: number;
  powerOutput?: number;
  waterOutput?: number;
  pollutionRadius?: number;
  happinessBonus?: number;
  icon: string;
  description: string;
}

export interface PlacedService {
  id: string;
  x: number;
  z: number;
  type: ServiceType;
  meshGroup?: any;
}

export interface VoxelBuilding {
  id: string;
  x: number;
  z: number;
  height: number;
  maxHeight: number;
  zoneType: 'residential' | 'commercial' | 'industrial';
  level: number;
  occupants: number;
  color: number;
  trimColor: number;
  hasPower: boolean;
  hasWater: boolean;
  hasPolice: boolean;
  hasFire: boolean;
  hasHealth: boolean;
  happiness: number;
  meshGroup?: any;
}

export interface RoadTile {
  x: number;
  z: number;
  type: RoadType;
  hasNorth: boolean;
  hasSouth: boolean;
  hasEast: boolean;
  hasWest: boolean;
  elevation: number;
}

export type VehicleType = 'sedan' | 'sports' | 'suv' | 'bus' | 'truck' | 'police' | 'ambulance' | 'firetruck';

export interface CarWaypoint {
  x: number;
  z: number;
  heading: number;
}

export interface CarTurnState {
  pIn: { x: number; z: number };
  p1: { x: number; z: number };
  pOut: { x: number; z: number };
  outHeading: number;
  arcLength: number;
  progress: number;
}

export interface CarAgent {
  id: string;
  type: VehicleType;
  x: number;
  z: number;
  y: number;
  speed: number;
  baseMaxSpeed: number;
  maxSpeed: number;
  rotationY: number;
  color: number;
  path: { x: number; z: number }[];
  fromTile: { x: number; z: number };
  toTile: { x: number; z: number };
  turn?: CarTurnState;
  mesh?: any;
  wheels?: any[];
  emergencyLights?: any[];
  animTick?: number;
  laneOffset?: { x: number; z: number };
  stuckTicks?: number;
}

export interface PedestrianAgent {
  id: string;
  x: number;
  z: number;
  speed: number;
  rotationY: number;
  color: number;
  path: { x: number; z: number }[];
  fromTile: { x: number; z: number };
  toTile: { x: number; z: number };
  mesh?: any;
  animTick: number;
  sidewalkSide: number;
}

export type TimePhase = 'Early Morning' | 'Morning' | 'Noon' | 'Afternoon' | 'Evening' | 'Night';

export interface UtilityPipe {
  x: number;
  z: number;
  connectedToSource: boolean;
  hasNorth: boolean;
  hasSouth: boolean;
  hasEast: boolean;
  hasWest: boolean;
  meshGroup?: any;
}

export interface UtilityWire {
  x: number;
  z: number;
  connectedToSource: boolean;
  hasNorth: boolean;
  hasSouth: boolean;
  hasEast: boolean;
  hasWest: boolean;
  meshGroup?: any;
}

export interface CityStats {
  money: number;
  income: number;
  expenses: number;
  population: number;
  jobs: number;
  happiness: number;
  powerCapacity: number;
  powerDemand: number;
  waterCapacity: number;
  waterDemand: number;
  waterCoveredPct: number;
  powerCoveredPct: number;
  taxRate: number;
  day: number;
  timeOfDay: number;
  timePhase: TimePhase;
  isNight: boolean;
  demandRes: number;
  demandCom: number;
  demandInd: number;
  gameSpeed: number;
}

export type ActiveOverlay = 'none' | 'power' | 'water' | 'services' | 'pollution' | 'happiness';
