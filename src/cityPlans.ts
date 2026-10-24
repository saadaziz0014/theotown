import type { CityWorld } from './cityWorld';

export interface PredefinedPlan {
  id: string;
  name: string;
  badge: string;
  description: string;
  load: (world: CityWorld) => void;
}

export const CITY_PLANS: PredefinedPlan[] = [
  {
    id: 'clear',
    name: 'Virgin Green Plain',
    badge: 'BLANK',
    description: 'Empty pristine landscape. Start from absolute zero.',
    load: (world: CityWorld) => {
      world.generateBiome('plains');
      world.clearAll();
      world.stats.money = 50000;
      world.stats.day = 1;
      world.stats.timeOfDay = 12.0;
    }
  },
  {
    id: 'suburban_garden',
    name: 'Suburban Garden City',
    badge: 'GARDEN',
    description: 'Tree-lined neighborhood with sweeping curved crescent loops, central park, and wind energy.',
    load: (world: CityWorld) => {
      world.generateBiome('plains');
      world.clearAll();
      world.stats.money = 65000;

      // Central Avenue (East-West)
      for (let x = -8; x <= 8; x++) {
        world.placeRoad(x, 0, 'avenue');
      }

      // Suburban streets (North & South)
      for (let z = -6; z <= 6; z++) {
        world.placeRoad(-3, z, 'suburban');
        world.placeRoad(3, z, 'suburban');
      }

      // Western Curved Crescent Loop (North-West residential sector)
      // Curves west at z = -5, south at x = -6, and back east into the street at z = -2
      for (let x = -6; x <= -3; x++) {
        world.placeRoad(x, -5, 'suburban');
        world.placeRoad(x, -2, 'suburban');
      }
      for (let z = -5; z <= -2; z++) {
        world.placeRoad(-6, z, 'suburban');
      }

      // Eastern Curved Crescent Loop (South-East residential sector)
      // Curves east at z = 2, south at x = 6, and back west into the street at z = 5
      for (let x = 3; x <= 6; x++) {
        world.placeRoad(x, 2, 'suburban');
        world.placeRoad(x, 5, 'suburban');
      }
      for (let z = 2; z <= 5; z++) {
        world.placeRoad(6, z, 'suburban');
      }

      // Dirt scenic lane with curved turn bend
      for (let x = 4; x <= 7; x++) {
        world.placeRoad(x, -5, 'dirt');
      }
      world.placeRoad(7, -4, 'dirt');
      world.placeRoad(7, -3, 'dirt');

      // Central Urban Park & Municipal Utilities
      world.placeService(0, 2, 'park');
      world.placeService(0, -2, 'water_tower');
      world.placeService(1, -2, 'water_tank');
      world.placeService(7, -6, 'power_wind');
      world.placeService(-1, 3, 'police_station');
      world.placeService(1, 3, 'hospital');

      // Underground Municipal Water Pipelines from Water Facilities
      for (let z = -5; z <= 5; z++) {
        world.placePipe(0, z, 0);
        world.placePipe(-3, z, 0);
      }
      for (let x = -6; x <= 6; x++) {
        world.placePipe(x, 0, 0);
      }

      // Underground Power Grid Cables from Wind Turbine
      for (let x = 0; x <= 7; x++) {
        world.placeWire(x, -6, 0);
      }
      for (let z = -6; z <= 4; z++) {
        world.placeWire(0, z, 0);
        world.placeWire(-3, z, 0);
      }
      for (let x = -6; x <= 6; x++) {
        world.placeWire(x, 0, 0);
      }

      // Residential Green Belts
      for (let x = -5; x <= -4; x++) {
        for (let z = -4; z <= -3; z++) {
          world.placeZone(x, z, 'residential');
        }
      }
      for (let x = 4; x <= 5; x++) {
        for (let z = 3; z <= 4; z++) {
          world.placeZone(x, z, 'residential');
        }
      }
      for (let x = -6; x <= -4; x++) {
        for (let z = 1; z <= 3; z++) {
          world.placeZone(x, z, 'residential');
        }
      }

      // Commercial Street along main avenue
      for (let x = -6; x <= -4; x++) {
        world.placeZone(x, -1, 'commercial');
      }
      for (let x = 4; x <= 6; x++) {
        world.placeZone(x, -1, 'commercial');
      }

      // Distant Industrial Sector
      for (let x = -6; x <= -4; x++) {
        world.placeZone(x, -6, 'industrial');
      }
    }
  },
  {
    id: 'metro_expressway',
    name: 'Metropolis Expressway',
    badge: 'METRO',
    description: 'Elevated highway overpass, 4-lane avenues, coal energy grid, and bustling high-density downtown.',
    load: (world: CityWorld) => {
      world.generateBiome('plains');
      world.clearAll();
      world.stats.money = 85000;

      // High-speed Elevated Highway (East-West across entire city)
      for (let x = -10; x <= 10; x++) {
        world.placeRoad(x, 0, 'highway');
      }

      // Ground 4-Lane Avenues flanking the highway
      for (let x = -9; x <= 9; x++) {
        world.placeRoad(x, 2, 'avenue');
        world.placeRoad(x, -2, 'avenue');
      }

      // Connecting Cross Streets
      for (let z = -5; z <= 5; z++) {
        world.placeRoad(-5, z, 'avenue');
        world.placeRoad(5, z, 'avenue');
      }

      // Curved Interchange Ramps connecting ground avenues
      // North ramp loop (x = -9 to -5, z = -5 to -2)
      for (let x = -9; x <= -5; x++) {
        world.placeRoad(x, -5, 'suburban');
      }
      for (let z = -5; z <= -2; z++) {
        world.placeRoad(-9, z, 'suburban');
      }
      // South ramp loop (x = 5 to 9, z = 2 to 5)
      for (let x = 5; x <= 9; x++) {
        world.placeRoad(x, 5, 'suburban');
      }
      for (let z = 2; z <= 5; z++) {
        world.placeRoad(9, z, 'suburban');
      }

      // Utilities & Emergency Services
      world.placeService(-8, -5, 'power_coal');
      world.placeService(-7, -4, 'water_tower');
      world.placeService(-7, -5, 'water_tank');
      world.placeService(-4, 4, 'police_station');
      world.placeService(4, 4, 'fire_station');
      world.placeService(0, 4, 'hospital');
      world.placeService(0, -4, 'park');

      // Underground Water Pipelines connecting Water Facilities to Downtown
      for (let x = -8; x <= 8; x++) {
        world.placePipe(x, -2, 0);
        world.placePipe(x, 2, 0);
      }
      for (let z = -5; z <= 5; z++) {
        world.placePipe(-5, z, 0);
        world.placePipe(5, z, 0);
      }
      for (let x = -8; x <= -5; x++) {
        world.placePipe(x, -4, 0);
      }

      // Underground High-Voltage Grid from Coal Plant
      for (let x = -8; x <= 8; x++) {
        world.placeWire(x, -2, 0);
        world.placeWire(x, 2, 0);
      }
      for (let z = -5; z <= 5; z++) {
        world.placeWire(-5, z, 0);
        world.placeWire(5, z, 0);
      }
      for (let x = -8; x <= -5; x++) {
        world.placeWire(x, -5, 0);
      }

      // Downtown Commercial Center
      for (let x = -4; x <= 4; x++) {
        if (x !== 0) {
          world.placeZone(x, 3, 'commercial');
          world.placeZone(x, 1, 'commercial');
          world.placeZone(x, -1, 'commercial');
          world.placeZone(x, -3, 'commercial');
        }
      }

      // Residential High-Rises
      for (let x = 6; x <= 8; x++) {
        for (let z = 1; z <= 4; z++) {
          world.placeZone(x, z, 'residential');
        }
        for (let z = -4; z <= -1; z++) {
          world.placeZone(x, z, 'residential');
        }
      }

      // Industrial Heavy Manufacturing (West)
      for (let x = -9; x <= -6; x++) {
        for (let z = 3; z <= 5; z++) {
          world.placeZone(x, z, 'industrial');
        }
      }
    }
  },
  {
    id: 'river_valley',
    name: 'Industrial Port & Tech Valley',
    badge: 'VALLEY',
    description: 'Separated clean tech residential district, wind farm, and high-capacity manufacturing zone.',
    load: (world: CityWorld) => {
      world.generateBiome('valley');
      world.clearAll();
      world.stats.money = 75000;

      // Ring road loop
      for (let x = -7; x <= 7; x++) {
        world.placeRoad(x, -4, 'avenue');
        world.placeRoad(x, 4, 'suburban');
      }
      for (let z = -4; z <= 4; z++) {
        world.placeRoad(-7, z, 'suburban');
        world.placeRoad(7, z, 'suburban');
        world.placeRoad(0, z, 'suburban');
      }

      // Wind Farm array
      world.placeService(-5, -6, 'power_wind');
      world.placeService(-3, -6, 'power_wind');
      world.placeService(-1, -6, 'water_tower');
      world.placeService(0, -6, 'water_tank');
      world.placeService(5, -6, 'power_coal');

      // Underground Water Pipelines
      for (let x = -7; x <= 7; x++) {
        world.placePipe(x, -4, 0);
        world.placePipe(x, 4, 0);
      }
      for (let z = -6; z <= 4; z++) {
        world.placePipe(0, z, 0);
      }

      // Underground Power Grid
      for (let x = -5; x <= 5; x++) {
        world.placeWire(x, -6, 0);
      }
      for (let z = -6; z <= 4; z++) {
        world.placeWire(0, z, 0);
        world.placeWire(-7, z, 0);
        world.placeWire(7, z, 0);
      }
      for (let x = -7; x <= 7; x++) {
        world.placeWire(x, 4, 0);
      }

      // Services
      world.placeService(0, 5, 'park');
      world.placeService(-2, 3, 'police_station');
      world.placeService(2, 3, 'hospital');

      // Northern Residential Valley
      for (let x = -6; x <= 6; x++) {
        if (x !== 0 && x !== -7 && x !== 7) {
          world.placeZone(x, 3, 'residential');
          world.placeZone(x, 2, 'residential');
        }
      }

      // Commercial Center (Central)
      for (let x = -3; x <= 3; x++) {
        if (x !== 0) {
          world.placeZone(x, 1, 'commercial');
          world.placeZone(x, -1, 'commercial');
        }
      }

      // Southern Industrial Port
      for (let x = -6; x <= 6; x++) {
        if (x !== 0 && x !== -7 && x !== 7) {
          world.placeZone(x, -3, 'industrial');
          world.placeZone(x, -2, 'industrial');
        }
      }
    }
  },
  {
    id: 'curved_boulevard',
    name: 'Emerald Bay & Curved Boulevards',
    badge: 'BOULEVARD',
    description: 'Scenic coastal city with sweeping curved avenue rings, smooth corner turns, and vibrant seaside zoning.',
    load: (world: CityWorld) => {
      world.generateBiome('coastal');
      world.clearAll();
      world.stats.money = 80000;

      // Inner Avenue Ring with 4 sweeping curved corner turns:
      for (let x = -6; x <= 6; x++) {
        world.placeRoad(x, -4, 'avenue');
        world.placeRoad(x, 4, 'avenue');
      }
      for (let z = -4; z <= 4; z++) {
        world.placeRoad(-6, z, 'avenue');
        world.placeRoad(6, z, 'avenue');
      }

      // Central cross avenue
      for (let x = -6; x <= 6; x++) {
        world.placeRoad(x, 0, 'avenue');
      }

      // Outer Suburban Crescent Loops with curved turns (North-East and South-West)
      for (let x = 6; x <= 9; x++) {
        world.placeRoad(x, -2, 'suburban');
        world.placeRoad(x, 2, 'suburban');
      }
      for (let z = -2; z <= 2; z++) {
        world.placeRoad(9, z, 'suburban');
      }

      for (let x = -9; x <= -6; x++) {
        world.placeRoad(x, -2, 'suburban');
        world.placeRoad(x, 2, 'suburban');
      }
      for (let z = -2; z <= 2; z++) {
        world.placeRoad(-9, z, 'suburban');
      }

      // Utilities & Emergency Services
      world.placeService(0, 0, 'park');
      world.placeService(0, -5, 'water_tower');
      world.placeService(1, -5, 'water_tank');
      world.placeService(-8, -5, 'power_wind');
      world.placeService(8, -5, 'power_wind');
      world.placeService(-2, 1, 'police_station');
      world.placeService(2, 1, 'hospital');
      world.placeService(0, 5, 'fire_station');

      // Underground Water Pipelines
      for (let x = -6; x <= 6; x++) {
        world.placePipe(x, -4, 0);
        world.placePipe(x, 0, 0);
        world.placePipe(x, 4, 0);
      }
      for (let z = -5; z <= 4; z++) {
        world.placePipe(0, z, 0);
      }

      // Underground Power Grid
      for (let x = -8; x <= 8; x++) {
        world.placeWire(x, -5, 0);
        world.placeWire(x, 0, 0);
      }
      for (let z = -5; z <= 4; z++) {
        world.placeWire(-6, z, 0);
        world.placeWire(6, z, 0);
      }

      // Residential Coastal Zones
      for (let x = -5; x <= 5; x++) {
        if (x !== 0 && x !== -2 && x !== 2) {
          world.placeZone(x, 3, 'residential');
          world.placeZone(x, 2, 'residential');
        }
      }

      // Commercial Boulevard District
      for (let x = -5; x <= 5; x++) {
        if (x !== 0) {
          world.placeZone(x, -1, 'commercial');
          world.placeZone(x, 1, 'commercial');
        }
      }

      // Clean Tech & Industrial Sector
      for (let x = -5; x <= 5; x++) {
        if (x !== 0) {
          world.placeZone(x, -3, 'industrial');
        }
      }
    }
  }
];

