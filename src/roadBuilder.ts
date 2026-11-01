import * as THREE from 'three';
import type { RoadTile, RoadConfig, RoadType } from './types';

export const ROAD_CONFIGS: Record<string, RoadConfig> = {
  dirt: {
    id: 'dirt',
    name: 'Dirt Trail',
    cost: 5,
    speedLimit: 0.6,
    baseColor: 0x85582a,
    curbColor: 0x664019,
    lineColor: 0x9c6f3b,
    hasCurbs: false,
    hasTrees: false,
    hasGuardrails: false,
    hasStreetLights: false,
    elevation: 0.03,
    description: 'Rustic unpaved country track'
  },
  suburban: {
    id: 'suburban',
    name: 'Suburban Street',
    cost: 15,
    speedLimit: 1.0,
    baseColor: 0x222a36, // Unified rich dark asphalt
    curbColor: 0x94a3b8,
    lineColor: 0xf8fafc,
    hasCurbs: true,
    hasTrees: true,
    hasGuardrails: false,
    hasStreetLights: true,
    elevation: 0.04,
    description: 'Wide residential street with curved corner fillets and outer sidewalk lights'
  },
  avenue: {
    id: 'avenue',
    name: '4-Lane Avenue',
    cost: 30,
    speedLimit: 1.35,
    baseColor: 0x222a36, // Matching asphalt for seamless Avenue & Street integration
    curbColor: 0x94a3b8, // Matching stone curbs
    lineColor: 0xfacc15,
    hasCurbs: true,
    hasTrees: false,
    hasGuardrails: false,
    hasStreetLights: true,
    elevation: 0.04,
    description: 'Broad arterial avenue with double yellow center lines and curved corner turn fillets'
  },
  highway: {
    id: 'highway',
    name: 'Elevated Highway',
    cost: 50,
    speedLimit: 1.85,
    baseColor: 0x18181b,
    curbColor: 0x52525b,
    lineColor: 0xffffff,
    hasCurbs: false,
    hasTrees: false,
    hasGuardrails: true,
    hasStreetLights: true,
    elevation: 0.35,
    description: 'High-speed elevated expressway with concrete pylons and guardrail lighting'
  },
  bridge: {
    id: 'bridge',
    name: 'Water Bridge',
    cost: 45,
    speedLimit: 1.4,
    baseColor: 0x1e293b,
    curbColor: 0x475569,
    lineColor: 0xfacc15,
    hasCurbs: true,
    hasTrees: false,
    hasGuardrails: true,
    hasStreetLights: true,
    elevation: 0.16,
    description: 'Marine crossing bridge with concrete water piers, red suspension trusses & safety cable towers'
  }
};

export class VoxelRoadBuilder {
  private static poleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  private static pillarMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  private static pierMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  private static bridgeTrussMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
  private static cableMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d8 });
  private static beaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  private static treeTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
  private static treeLeafMat = new THREE.MeshLambertMaterial({ color: 0x15803d });

  public static buildRoadMesh(road: RoadTile, streetLightsList?: { mesh: THREE.Mesh; light?: THREE.PointLight }[]): THREE.Group {
    const config = ROAD_CONFIGS[road.type] || ROAD_CONFIGS.suburban;
    const group = new THREE.Group();
    group.position.set(road.x + 0.5, 0, road.z + 0.5);

    const isHighway = road.type === 'highway';
    const isBridge = road.type === 'bridge';
    const isElevated = isHighway || isBridge;
    const deckY = isHighway ? 0.35 : (isBridge ? 0.16 : 0.04);
    const deckHeight = isHighway ? 0.12 : (isBridge ? 0.10 : 0.08);

    // 1. Concrete Pylons / Bridge Pillars
    if (isHighway) {
      const pillarGeo = new THREE.BoxGeometry(0.35, deckY, 0.35);
      const pillar = new THREE.Mesh(pillarGeo, this.pillarMat);
      pillar.position.set(0, deckY / 2, 0);
      pillar.castShadow = true;
      group.add(pillar);

      const crossheadGeo = new THREE.BoxGeometry(0.98, 0.08, 0.45);
      const crosshead = new THREE.Mesh(crossheadGeo, this.pillarMat);
      crosshead.position.set(0, deckY - 0.04, 0);
      group.add(crosshead);
    } else if (isBridge) {
      // Subterranean Marine Piers extending deep into water and riverbed
      const pierHeight = deckY + 0.36; // Plunges down into water (to y = -0.36)
      const pierGeo = new THREE.BoxGeometry(0.40, pierHeight, 0.40);
      const pier = new THREE.Mesh(pierGeo, this.pierMat);
      pier.position.set(0, deckY - pierHeight / 2, 0);
      pier.castShadow = true;
      group.add(pier);

      const crossheadGeo = new THREE.BoxGeometry(0.98, 0.08, 0.50);
      const crosshead = new THREE.Mesh(crossheadGeo, this.pierMat);
      crosshead.position.set(0, deckY - 0.04, 0);
      group.add(crosshead);
    }

    // 2. Main Asphalt Road Deck
    const baseGeo = new THREE.BoxGeometry(1.0, deckHeight, 1.0);
    const baseMat = new THREE.MeshLambertMaterial({ color: config.baseColor });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = deckY;
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = isElevated;
    group.add(baseMesh);

    // 3. Dirt Road Details
    if (road.type === 'dirt') {
      const rutMat = new THREE.MeshLambertMaterial({ color: 0x5c3813 });
      const rutGeo = new THREE.BoxGeometry(0.14, 0.02, 1.0);
      const rut1 = new THREE.Mesh(rutGeo, rutMat);
      rut1.position.set(-0.24, deckY + 0.04, 0);
      const rut2 = new THREE.Mesh(rutGeo, rutMat);
      rut2.position.set(0.24, deckY + 0.04, 0);
      group.add(rut1);
      group.add(rut2);
      return group;
    }

    // 4. Expanded Drivable Roadway with Paved Footpaths (0.12 width on outer edges)
    const footpathMat = new THREE.MeshLambertMaterial({ color: config.curbColor });
    const fpHeight = 0.09;
    const fpWidth = 0.12; // Generous 0.12 paved sidewalk margins create clear 0.76 drivable road width

    // Check for 90-degree corner turns
    const isCornerNE = (road.hasNorth && road.hasEast && !road.hasWest && !road.hasSouth);
    const isCornerNW = (road.hasNorth && road.hasWest && !road.hasEast && !road.hasSouth);
    const isCornerSE = (road.hasSouth && road.hasEast && !road.hasNorth && !road.hasWest);
    const isCornerSW = (road.hasSouth && road.hasWest && !road.hasNorth && !road.hasEast);
    const isCornerTurn = (isCornerNE || isCornerNW || isCornerSE || isCornerSW);
    const isStraightNS = (road.hasNorth && road.hasSouth && !road.hasEast && !road.hasWest);
    const isStraightEW = (!road.hasNorth && !road.hasSouth && road.hasEast && road.hasWest);

    if (config.hasCurbs) {
      if (!isCornerTurn) {
        // Standard straight roads and T-junctions
        if (!road.hasNorth) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(1.0, fpHeight, fpWidth), footpathMat);
          fp.position.set(0, deckY + fpHeight / 2 - 0.02, -0.44);
          group.add(fp);
        }
        if (!road.hasSouth) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(1.0, fpHeight, fpWidth), footpathMat);
          fp.position.set(0, deckY + fpHeight / 2 - 0.02, 0.44);
          group.add(fp);
        }
        if (!road.hasWest) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, 1.0), footpathMat);
          fp.position.set(-0.44, deckY + fpHeight / 2 - 0.02, 0);
          group.add(fp);
        }
        if (!road.hasEast) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, 1.0), footpathMat);
          fp.position.set(0.44, deckY + fpHeight / 2 - 0.02, 0);
          group.add(fp);
        }

        // Corner sidewalk curb caps for intersections so footpaths continue seamlessly
        if (road.hasNorth && road.hasWest) {
          const cNW = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, fpWidth), footpathMat);
          cNW.position.set(-0.44, deckY + fpHeight / 2 - 0.02, -0.44);
          group.add(cNW);
        }
        if (road.hasNorth && road.hasEast) {
          const cNE = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, fpWidth), footpathMat);
          cNE.position.set(0.44, deckY + fpHeight / 2 - 0.02, -0.44);
          group.add(cNE);
        }
        if (road.hasSouth && road.hasWest) {
          const cSW = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, fpWidth), footpathMat);
          cSW.position.set(-0.44, deckY + fpHeight / 2 - 0.02, 0.44);
          group.add(cSW);
        }
        if (road.hasSouth && road.hasEast) {
          const cSE = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, fpWidth), footpathMat);
          cSE.position.set(0.44, deckY + fpHeight / 2 - 0.02, 0.44);
          group.add(cSE);
        }
      } else {
        // Smooth Curved Corner Turn Curbs!
        let pivotX = 0.5;
        let pivotZ = -0.5;
        let startAngle = Math.PI / 2;
        let endAngle = Math.PI;

        if (isCornerNE) {
          pivotX = 0.5;
          pivotZ = -0.5;
          startAngle = Math.PI / 2;
          endAngle = Math.PI;
        } else if (isCornerNW) {
          pivotX = -0.5;
          pivotZ = -0.5;
          startAngle = 0;
          endAngle = Math.PI / 2;
        } else if (isCornerSE) {
          pivotX = 0.5;
          pivotZ = 0.5;
          startAngle = Math.PI;
          endAngle = (3 * Math.PI) / 2;
        } else if (isCornerSW) {
          pivotX = -0.5;
          pivotZ = 0.5;
          startAngle = (3 * Math.PI) / 2;
          endAngle = 2 * Math.PI;
        }

        // Inside curb arc
        const insideSteps = 5;
        for (let i = 0; i < insideSteps; i++) {
          const t = (i + 0.5) / insideSteps;
          const theta = startAngle + t * (endAngle - startAngle);
          const cx = pivotX + Math.cos(theta) * 0.12;
          const cz = pivotZ + Math.sin(theta) * 0.12;
          const cMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, fpHeight, 0.08), footpathMat);
          cMesh.position.set(cx, deckY + fpHeight / 2 - 0.02, cz);
          cMesh.rotation.y = -theta;
          group.add(cMesh);
        }
        // Fill the inside corner wedge
        const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.08, fpHeight, 0.08), footpathMat);
        wedge.position.set(pivotX - Math.sign(pivotX) * 0.04, deckY + fpHeight / 2 - 0.02, pivotZ - Math.sign(pivotZ) * 0.04);
        group.add(wedge);

        // Outside curb arc (radius 0.88 from inside pivot)
        const outsideSteps = 7;
        for (let i = 0; i < outsideSteps; i++) {
          const t = (i + 0.5) / outsideSteps;
          const theta = startAngle + t * (endAngle - startAngle);
          const cx = pivotX + Math.cos(theta) * 0.88;
          const cz = pivotZ + Math.sin(theta) * 0.88;
          const cMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, fpHeight, 0.14), footpathMat);
          cMesh.position.set(cx, deckY + fpHeight / 2 - 0.02, cz);
          cMesh.rotation.y = -theta;
          group.add(cMesh);
        }
      }
    }

    // 5. Highway & Bridge Steel Guardrails
    if (config.hasGuardrails) {
      const railMat = isBridge ? this.bridgeTrussMat : new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
      const railHeight = isBridge ? 0.18 : 0.14;
      const railThickness = 0.05;

      if (!isCornerTurn) {
        if (!road.hasNorth) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(1.0, railHeight, railThickness), railMat);
          rail.position.set(0, deckY + railHeight / 2 + 0.04, -0.475);
          group.add(rail);
        }
        if (!road.hasSouth) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(1.0, railHeight, railThickness), railMat);
          rail.position.set(0, deckY + railHeight / 2 + 0.04, 0.475);
          group.add(rail);
        }
        if (!road.hasWest) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(railThickness, railHeight, 1.0), railMat);
          rail.position.set(-0.475, deckY + railHeight / 2 + 0.04, 0);
          group.add(rail);
        }
        if (!road.hasEast) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(railThickness, railHeight, 1.0), railMat);
          rail.position.set(0.475, deckY + railHeight / 2 + 0.04, 0);
          group.add(rail);
        }
      } else {
        // Curved outer guardrail for elevated highway & bridge turns
        let pivotX = isCornerNE || isCornerSE ? 0.5 : -0.5;
        let pivotZ = isCornerNE || isCornerNW ? -0.5 : 0.5;
        let startAngle = isCornerNE ? Math.PI / 2 : isCornerNW ? 0 : isCornerSE ? Math.PI : (3 * Math.PI) / 2;
        let endAngle = isCornerNE ? Math.PI : isCornerNW ? Math.PI / 2 : isCornerSE ? (3 * Math.PI) / 2 : 2 * Math.PI;

        for (let i = 0; i < 7; i++) {
          const t = (i + 0.5) / 7;
          const theta = startAngle + t * (endAngle - startAngle);
          const rx = pivotX + Math.cos(theta) * 0.92;
          const rz = pivotZ + Math.sin(theta) * 0.92;
          const rMesh = new THREE.Mesh(new THREE.BoxGeometry(railThickness, railHeight, 0.16), railMat);
          rMesh.position.set(rx, deckY + railHeight / 2 + 0.04, rz);
          rMesh.rotation.y = -theta;
          group.add(rMesh);
        }
      }
    }

    // 6. Bridge Suspension Towers & Stay Cables (On straight marine bridge spans)
    if (isBridge && (isStraightNS || isStraightEW) && (road.x + road.z) % 3 === 0) {
      const towerHeight = 0.70;
      const towerWidth = 0.06;

      if (isStraightNS) {
        // Towers on East & West edges (x = -0.46 and x = 0.46)
        const towerL = new THREE.Mesh(new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth), this.bridgeTrussMat);
        towerL.position.set(-0.46, deckY + towerHeight / 2, 0);
        group.add(towerL);

        const towerR = new THREE.Mesh(new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth), this.bridgeTrussMat);
        towerR.position.set(0.46, deckY + towerHeight / 2, 0);
        group.add(towerR);

        // Top Arch Crossbeam connecting towers
        const arch = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.05, towerWidth), this.bridgeTrussMat);
        arch.position.set(0, deckY + towerHeight, 0);
        group.add(arch);

        // Diagonal Stay Cables to deck ends
        const cableGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.58);
        const cable1 = new THREE.Mesh(cableGeo, this.cableMat);
        cable1.position.set(-0.46, deckY + towerHeight * 0.55, -0.24);
        cable1.rotation.x = Math.PI / 6;
        group.add(cable1);

        const cable2 = new THREE.Mesh(cableGeo, this.cableMat);
        cable2.position.set(-0.46, deckY + towerHeight * 0.55, 0.24);
        cable2.rotation.x = -Math.PI / 6;
        group.add(cable2);

        const cable3 = new THREE.Mesh(cableGeo, this.cableMat);
        cable3.position.set(0.46, deckY + towerHeight * 0.55, -0.24);
        cable3.rotation.x = Math.PI / 6;
        group.add(cable3);

        const cable4 = new THREE.Mesh(cableGeo, this.cableMat);
        cable4.position.set(0.46, deckY + towerHeight * 0.55, 0.24);
        cable4.rotation.x = -Math.PI / 6;
        group.add(cable4);

        // Amber Beacon light atop tower
        const beaconL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), this.beaconMat);
        beaconL.position.set(-0.46, deckY + towerHeight + 0.03, 0);
        group.add(beaconL);

        const beaconR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), this.beaconMat);
        beaconR.position.set(0.46, deckY + towerHeight + 0.03, 0);
        group.add(beaconR);
      } else if (isStraightEW) {
        // Towers on North & South edges (z = -0.46 and z = 0.46)
        const towerN = new THREE.Mesh(new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth), this.bridgeTrussMat);
        towerN.position.set(0, deckY + towerHeight / 2, -0.46);
        group.add(towerN);

        const towerS = new THREE.Mesh(new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth), this.bridgeTrussMat);
        towerS.position.set(0, deckY + towerHeight / 2, 0.46);
        group.add(towerS);

        const arch = new THREE.Mesh(new THREE.BoxGeometry(towerWidth, 0.05, 0.98), this.bridgeTrussMat);
        arch.position.set(0, deckY + towerHeight, 0);
        group.add(arch);

        const cableGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.58);
        const cable1 = new THREE.Mesh(cableGeo, this.cableMat);
        cable1.position.set(-0.24, deckY + towerHeight * 0.55, -0.46);
        cable1.rotation.z = -Math.PI / 6;
        group.add(cable1);

        const cable2 = new THREE.Mesh(cableGeo, this.cableMat);
        cable2.position.set(0.24, deckY + towerHeight * 0.55, -0.46);
        cable2.rotation.z = Math.PI / 6;
        group.add(cable2);

        const cable3 = new THREE.Mesh(cableGeo, this.cableMat);
        cable3.position.set(-0.24, deckY + towerHeight * 0.55, 0.46);
        cable3.rotation.z = -Math.PI / 6;
        group.add(cable3);

        const cable4 = new THREE.Mesh(cableGeo, this.cableMat);
        cable4.position.set(0.24, deckY + towerHeight * 0.55, 0.46);
        cable4.rotation.z = Math.PI / 6;
        group.add(cable4);

        const beaconN = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), this.beaconMat);
        beaconN.position.set(0, deckY + towerHeight + 0.03, -0.46);
        group.add(beaconN);

        const beaconS = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), this.beaconMat);
        beaconS.position.set(0, deckY + towerHeight + 0.03, 0.46);
        group.add(beaconS);
      }
    }

    // 7. Lane Markings (Straight and Multi-Segment Smooth Curved Turn Arcs)
    const lineMat = new THREE.MeshBasicMaterial({ color: config.lineColor });
    const isIntersection = (Number(road.hasNorth) + Number(road.hasSouth) + Number(road.hasEast) + Number(road.hasWest)) >= 3;
    const lineY = deckY + (deckHeight / 2) + 0.005;

    if (isCornerTurn) {
      // 7-segment silky smooth curved centerline turn arc
      let pivotX = isCornerNE || isCornerSE ? 0.5 : -0.5;
      let pivotZ = isCornerNE || isCornerNW ? -0.5 : 0.5;
      let startAngle = isCornerNE ? Math.PI / 2 : isCornerNW ? 0 : isCornerSE ? Math.PI : (3 * Math.PI) / 2;
      let endAngle = isCornerNE ? Math.PI : isCornerNW ? Math.PI / 2 : isCornerSE ? (3 * Math.PI) / 2 : 2 * Math.PI;

      const arcGroup = new THREE.Group();
      const numSegs = 7;

      if (road.type === 'avenue' || road.type === 'bridge') {
        // Double Yellow Curved Centerline for Arterial Avenue & Bridge
        for (let i = 0; i < numSegs; i++) {
          const t = (i + 0.5) / numSegs;
          const theta = startAngle + t * (endAngle - startAngle);

          // Inner yellow stripe
          const x1 = pivotX + Math.cos(theta) * 0.46;
          const z1 = pivotZ + Math.sin(theta) * 0.46;
          const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 0.12), lineMat);
          s1.position.set(x1, lineY, z1);
          s1.rotation.y = -theta;
          arcGroup.add(s1);

          // Outer yellow stripe
          const x2 = pivotX + Math.cos(theta) * 0.54;
          const z2 = pivotZ + Math.sin(theta) * 0.54;
          const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 0.14), lineMat);
          s2.position.set(x2, lineY, z2);
          s2.rotation.y = -theta;
          arcGroup.add(s2);
        }
      } else {
        // Single White / Yellow Curved Centerline Arc
        for (let i = 0; i < numSegs; i++) {
          const t = (i + 0.5) / numSegs;
          const theta = startAngle + t * (endAngle - startAngle);
          const x = pivotX + Math.cos(theta) * 0.50;
          const z = pivotZ + Math.sin(theta) * 0.50;
          const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.13), lineMat);
          s.position.set(x, lineY, z);
          s.rotation.y = -theta;
          arcGroup.add(s);
        }
      }
      group.add(arcGroup);
    } else if (road.type === 'avenue' || road.type === 'bridge') {
      const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      if (isStraightNS) {
        // Double Yellow Centerline
        const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 1.0), lineMat);
        l1.position.set(-0.035, lineY, 0);
        const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 1.0), lineMat);
        l2.position.set(0.035, lineY, 0);
        group.add(l1);
        group.add(l2);

        // Solid White Outer Edge Fog Lines
        const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 1.0), whiteLineMat);
        edgeL.position.set(-0.36, lineY, 0);
        group.add(edgeL);
        const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 1.0), whiteLineMat);
        edgeR.position.set(0.36, lineY, 0);
        group.add(edgeR);
      } else if (isStraightEW) {
        // Double Yellow Centerline
        const l1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.035), lineMat);
        l1.position.set(0, lineY, -0.035);
        const l2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.035), lineMat);
        l2.position.set(0, lineY, 0.035);
        group.add(l1);
        group.add(l2);

        // Solid White Outer Edge Fog Lines
        const edgeT = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.025), whiteLineMat);
        edgeT.position.set(0, lineY, -0.36);
        group.add(edgeT);
        const edgeB = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.025), whiteLineMat);
        edgeB.position.set(0, lineY, 0.36);
        group.add(edgeB);
      } else if (isIntersection) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.24), lineMat);
        box.position.set(0, lineY, 0);
        group.add(box);

        // Painted Pedestrian Zebra Crosswalks on each connected street approach!
        const addZebraH = (posZ: number) => {
          for (let stripe = -0.26; stripe <= 0.26; stripe += 0.085) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.01, 0.14), whiteLineMat);
            m.position.set(stripe, lineY, posZ);
            group.add(m);
          }
        };
        const addZebraV = (posX: number) => {
          for (let stripe = -0.26; stripe <= 0.26; stripe += 0.085) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.045), whiteLineMat);
            m.position.set(posX, lineY, stripe);
            group.add(m);
          }
        };

        if (road.hasNorth) addZebraH(-0.38);
        if (road.hasSouth) addZebraH(0.38);
        if (road.hasWest) addZebraV(-0.38);
        if (road.hasEast) addZebraV(0.38);
      }
    } else {
      const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      if (isStraightNS) {
        // Dashed Centerline
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.55), lineMat);
        line.position.set(0, lineY, 0);
        group.add(line);

        // Solid White Outer Edge Fog Lines
        const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 1.0), whiteLineMat);
        edgeL.position.set(-0.36, lineY, 0);
        group.add(edgeL);
        const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 1.0), whiteLineMat);
        edgeR.position.set(0.36, lineY, 0);
        group.add(edgeR);
      } else if (isStraightEW) {
        // Dashed Centerline
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.01, 0.05), lineMat);
        line.position.set(0, lineY, 0);
        group.add(line);

        // Solid White Outer Edge Fog Lines
        const edgeT = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.025), whiteLineMat);
        edgeT.position.set(0, lineY, -0.36);
        group.add(edgeT);
        const edgeB = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.01, 0.025), whiteLineMat);
        edgeB.position.set(0, lineY, 0.36);
        group.add(edgeB);
      } else if (isIntersection) {
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.12), lineMat);
        dot.position.set(0, lineY, 0);
        group.add(dot);

        // Painted Pedestrian Zebra Crosswalks on each connected street approach!
        const addZebraH = (posZ: number) => {
          for (let stripe = -0.26; stripe <= 0.26; stripe += 0.085) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.01, 0.14), whiteLineMat);
            m.position.set(stripe, lineY, posZ);
            group.add(m);
          }
        };
        const addZebraV = (posX: number) => {
          for (let stripe = -0.26; stripe <= 0.26; stripe += 0.085) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.045), whiteLineMat);
            m.position.set(posX, lineY, stripe);
            group.add(m);
          }
        };

        if (road.hasNorth) addZebraH(-0.38);
        if (road.hasSouth) addZebraH(0.38);
        if (road.hasWest) addZebraV(-0.38);
        if (road.hasEast) addZebraV(0.38);
      }
    }

    // 7. Voxel Trees (Strictly on the outer sidewalk edge at 0.45)
    if (config.hasTrees && (isStraightNS || isStraightEW) && (road.x + road.z) % 3 === 0) {
      const treeGroup = new THREE.Group();
      if (isStraightNS) {
        treeGroup.position.set(-0.45, deckY + 0.06, 0);
      } else {
        treeGroup.position.set(0, deckY + 0.06, -0.45);
      }

      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.04), this.treeTrunkMat);
      trunk.position.y = 0.13;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), this.treeLeafMat);
      foliage.position.y = 0.32;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      group.add(treeGroup);
    }

    // 8. Streetlights: Strictly on the outer sidewalk ribbon (0.45) facing inwards
    if (config.hasStreetLights && !isIntersection && (road.x + road.z) % 2 === 0) {
      const lampGroup = new THREE.Group();
      let lampPosX = 0;
      let lampPosZ = 0;
      let armX = 0;
      let armZ = 0;

      if (isStraightEW) {
        const isNorthSide = (road.x % 2 === 0);
        lampPosZ = isNorthSide ? -0.45 : 0.45;
        lampPosX = 0;
        armZ = isNorthSide ? 0.10 : -0.10;
      } else if (isStraightNS) {
        const isEastSide = (road.z % 2 === 0);
        lampPosX = isEastSide ? 0.45 : -0.45;
        lampPosZ = 0;
        armX = isEastSide ? -0.10 : 0.10;
      } else {
        // Place securely on the outer footpath bend of corner turns
        lampPosX = (isCornerNE || isCornerSE) ? -0.45 : 0.45;
        lampPosZ = (isCornerNE || isCornerNW) ? 0.45 : -0.45;
        armX = -Math.sign(lampPosX) * 0.10;
        armZ = -Math.sign(lampPosZ) * 0.10;
      }

      lampGroup.position.set(lampPosX, deckY + 0.06, lampPosZ);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.65), this.poleMat);
      pole.position.y = 0.325;
      lampGroup.add(pole);

      const armGeo = new THREE.BoxGeometry(
        Math.abs(armX) > 0.01 ? Math.abs(armX) : 0.03,
        0.025,
        Math.abs(armZ) > 0.01 ? Math.abs(armZ) : 0.03
      );
      const arm = new THREE.Mesh(armGeo, this.poleMat);
      arm.position.set(armX / 2, 0.65, armZ / 2);
      lampGroup.add(arm);

      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.07), bulbMat);
      bulb.position.set(armX, 0.63, armZ);
      lampGroup.add(bulb);

      const poolGeo = new THREE.PlaneGeometry(0.7, 0.7);
      const poolMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      });
      const lightPool = new THREE.Mesh(poolGeo, poolMat);
      lightPool.rotation.x = -Math.PI / 2;
      lightPool.position.set(armX * 1.2, 0.015, armZ * 1.2);
      lampGroup.add(lightPool);

      group.add(lampGroup);

      if (streetLightsList) {
        streetLightsList.push({ mesh: bulb, light: lightPool as any });
      }
    }

    return group;
  }

  // --- SMART ROAD BLUEPRINT GHOST PREVIEW ---
  // Renders a luminous preview that matches the exact road deck width, curbs, and lane markings
  public static buildRoadPreviewMesh(
    type: RoadType,
    hasNorth: boolean,
    hasSouth: boolean,
    hasEast: boolean,
    hasWest: boolean,
    valid: boolean = true
  ): THREE.Group {
    const config = ROAD_CONFIGS[type] || ROAD_CONFIGS.suburban;
    const group = new THREE.Group();

    const isHighway = type === 'highway';
    const isBridge = type === 'bridge';
    const deckY = isHighway ? 0.35 : (isBridge ? 0.16 : 0.04);
    const deckHeight = isHighway ? 0.12 : (isBridge ? 0.10 : 0.08);

    const baseColor = valid ? 0x38bdf8 : 0xef4444; // Cyan blueprint or Red invalid
    const mat = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: valid ? 0.45 : 0.6,
      depthWrite: false
    });

    const curbMat = new THREE.MeshBasicMaterial({
      color: valid ? 0x93c5fd : 0xf87171,
      transparent: true,
      opacity: valid ? 0.65 : 0.75,
      depthWrite: false
    });

    const lineMat = new THREE.MeshBasicMaterial({
      color: valid ? (type === 'avenue' || type === 'bridge' ? 0xfde047 : 0xffffff) : 0xfecaca,
      transparent: true,
      opacity: valid ? 0.85 : 0.75,
      depthWrite: false
    });

    // 1. Base Road Deck
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, deckHeight, 1.0), mat);
    baseMesh.position.y = deckY;
    group.add(baseMesh);

    // Support Pier Preview for Highway and Bridge
    if (isHighway) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.35, deckY, 0.35), mat);
      pier.position.set(0, deckY / 2, 0);
      group.add(pier);
    } else if (isBridge) {
      const pierHeight = deckY + 0.36;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.38, pierHeight, 0.38), mat);
      pier.position.set(0, deckY - pierHeight / 2, 0);
      group.add(pier);
    }

    // 2. Curbs on outer disconnected sides (width 0.12, matching exact road mesh)
    const fpHeight = 0.09;
    const fpWidth = 0.12;

    const isCornerNE = (hasNorth && hasEast && !hasWest && !hasSouth);
    const isCornerNW = (hasNorth && hasWest && !hasEast && !hasSouth);
    const isCornerSE = (hasSouth && hasEast && !hasNorth && !hasWest);
    const isCornerSW = (hasSouth && hasWest && !hasNorth && !hasEast);
    const isCornerTurn = (isCornerNE || isCornerNW || isCornerSE || isCornerSW);

    if (config.hasCurbs) {
      if (!isCornerTurn) {
        if (!hasNorth) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(1.0, fpHeight, fpWidth), curbMat);
          fp.position.set(0, deckY + fpHeight / 2 - 0.02, -0.44);
          group.add(fp);
        }
        if (!hasSouth) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(1.0, fpHeight, fpWidth), curbMat);
          fp.position.set(0, deckY + fpHeight / 2 - 0.02, 0.44);
          group.add(fp);
        }
        if (!hasWest) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, 1.0), curbMat);
          fp.position.set(-0.44, deckY + fpHeight / 2 - 0.02, 0);
          group.add(fp);
        }
        if (!hasEast) {
          const fp = new THREE.Mesh(new THREE.BoxGeometry(fpWidth, fpHeight, 1.0), curbMat);
          fp.position.set(0.44, deckY + fpHeight / 2 - 0.02, 0);
          group.add(fp);
        }
      }
    }

    // 3. Blueprint Lane Markings
    const isStraightNS = (hasNorth && hasSouth && !hasEast && !hasWest) || (!hasEast && !hasWest && (hasNorth || hasSouth));
    const isStraightEW = (!hasNorth && !hasSouth && hasEast && hasWest) || (!hasNorth && !hasSouth && (hasEast || hasWest));
    const lineY = deckY + (deckHeight / 2) + 0.005;

    if (type === 'avenue' || type === 'bridge') {
      if (isStraightNS || (!isStraightEW && !isCornerTurn)) {
        const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.96), lineMat);
        l1.position.set(-0.04, lineY, 0);
        const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.96), lineMat);
        l2.position.set(0.04, lineY, 0);
        group.add(l1);
        group.add(l2);
      } else if (isStraightEW) {
        const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.01, 0.04), lineMat);
        l1.position.set(0, lineY, -0.04);
        const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.01, 0.04), lineMat);
        l2.position.set(0, lineY, 0.04);
        group.add(l1);
        group.add(l2);
      }
    } else {
      if (isStraightNS || (!isStraightEW && !isCornerTurn)) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.6), lineMat);
        l.position.set(0, lineY, 0);
        group.add(l);
      } else if (isStraightEW) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.01, 0.05), lineMat);
        l.position.set(0, lineY, 0);
        group.add(l);
      }
    }

    return group;
  }
}
