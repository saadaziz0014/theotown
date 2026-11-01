import * as THREE from 'three';
import type { RailTile } from './types';

export class VoxelRailBuilder {
  // Shared materials for high performance and clean memory management
  private static ballastMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  private static sleeperMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
  private static railMat = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
  private static crossingAsphaltMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
  private static signalPoleMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  private static crossbuckMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private static redLampMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  private static yellowWarningMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  private static bridgePierMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  private static bridgeTrussMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });

  public static buildRailMesh(rail: RailTile, isWater: boolean = false): THREE.Group {
    const group = new THREE.Group();
    group.position.set(rail.x + 0.5, 0, rail.z + 0.5);

    const isCrossing = !!rail.isCrossing;
    const isBridge = isWater || rail.elevation > 0.1;
    const trackY = isBridge ? 0.16 : 0.04;
    const gauge = 0.44; // Distance between steel rails
    const railWidth = 0.038;
    const railHeight = 0.038;

    // Detect track configuration
    const isCornerNE = (rail.hasNorth && rail.hasEast && !rail.hasWest && !rail.hasSouth);
    const isCornerNW = (rail.hasNorth && rail.hasWest && !rail.hasEast && !rail.hasSouth);
    const isCornerSE = (rail.hasSouth && rail.hasEast && !rail.hasNorth && !rail.hasWest);
    const isCornerSW = (rail.hasSouth && rail.hasWest && !rail.hasNorth && !rail.hasEast);
    const isCornerTurn = (isCornerNE || isCornerNW || isCornerSE || isCornerSW);
    const isStraightNS = (rail.hasNorth && rail.hasSouth && !rail.hasEast && !rail.hasWest);
    const isStraightEW = (!rail.hasNorth && !rail.hasSouth && rail.hasEast && rail.hasWest);

    // 1. Water Bridge Trestle Pillars
    if (isBridge) {
      const pierHeight = trackY + 0.38;
      const pierGeo = new THREE.BoxGeometry(0.36, pierHeight, 0.36);
      const pier = new THREE.Mesh(pierGeo, this.bridgePierMat);
      pier.position.set(0, trackY - pierHeight / 2, 0);
      pier.castShadow = true;
      group.add(pier);

      const crosshead = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.46), this.bridgePierMat);
      crosshead.position.set(0, trackY - 0.04, 0);
      group.add(crosshead);

      // Steel truss guardrails on sides
      const trussHeight = 0.22;
      const railL = new THREE.Mesh(new THREE.BoxGeometry(isStraightEW ? 1.0 : 0.06, trussHeight, isStraightEW ? 0.06 : 1.0), this.bridgeTrussMat);
      railL.position.set(isStraightEW ? 0 : -0.44, trackY + trussHeight / 2, isStraightEW ? -0.44 : 0);
      group.add(railL);

      const railR = new THREE.Mesh(new THREE.BoxGeometry(isStraightEW ? 1.0 : 0.06, trussHeight, isStraightEW ? 0.06 : 1.0), this.bridgeTrussMat);
      railR.position.set(isStraightEW ? 0 : 0.44, trackY + trussHeight / 2, isStraightEW ? 0.44 : 0);
      group.add(railR);
    }

    // 2. Ballast Roadbed (or Asphalt Roadbed if Road Level Crossing)
    if (isCrossing) {
      // Road Grade Crossing: Level asphalt deck matching roadway elevation
      const asphalt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), this.crossingAsphaltMat);
      asphalt.position.y = 0.04;
      asphalt.receiveShadow = true;
      group.add(asphalt);

      // Timber flangeway gap filler planks between rails
      const plankGeo = new THREE.BoxGeometry(isStraightEW ? 1.0 : (gauge - 0.08), 0.02, isStraightEW ? (gauge - 0.08) : 1.0);
      const plank = new THREE.Mesh(plankGeo, this.sleeperMat);
      plank.position.y = 0.075;
      group.add(plank);

      // Railroad Crossing Signals (Crossbucks & Red Flashing Warning Lamps)
      this.buildCrossingSignal(group, -0.44, 0.44, 0);
      this.buildCrossingSignal(group, 0.44, -0.44, Math.PI);
    } else {
      // Standard Gravel Ballast Bed
      if (isStraightNS || (!isStraightEW && !isCornerTurn)) {
        const ballast = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 1.0), this.ballastMat);
        ballast.position.y = trackY;
        ballast.receiveShadow = true;
        group.add(ballast);
      } else if (isStraightEW) {
        const ballast = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.76), this.ballastMat);
        ballast.position.y = trackY;
        ballast.receiveShadow = true;
        group.add(ballast);
      } else {
        // Curve turn / multi-way junction ballast
        const ballast = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.04, 0.96), this.ballastMat);
        ballast.position.y = trackY;
        ballast.receiveShadow = true;
        group.add(ballast);
      }
    }

    // 3. Wooden Sleepers (Ties)
    const sleeperY = trackY + 0.025;
    if (!isCrossing) {
      if (isStraightNS || (!isStraightEW && !isCornerTurn)) {
        // North-South ties (horizontal width 0.80)
        const tieCount = 5;
        for (let i = 0; i < tieCount; i++) {
          const zOffset = -0.40 + i * 0.20;
          const tie = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.025, 0.08), this.sleeperMat);
          tie.position.set(0, sleeperY, zOffset);
          tie.castShadow = true;
          group.add(tie);
        }
      } else if (isStraightEW) {
        // East-West ties (vertical length 0.80)
        const tieCount = 5;
        for (let i = 0; i < tieCount; i++) {
          const xOffset = -0.40 + i * 0.20;
          const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.80), this.sleeperMat);
          tie.position.set(xOffset, sleeperY, 0);
          tie.castShadow = true;
          group.add(tie);
        }
      } else if (isCornerTurn) {
        // Radiating curved ties along the 90° curve fillet
        const pivotX = isCornerNE || isCornerSE ? 0.5 : -0.5;
        const pivotZ = isCornerNE || isCornerNW ? -0.5 : 0.5;
        const startAngle = isCornerNE ? Math.PI : isCornerNW ? (3 * Math.PI) / 2 : isCornerSE ? Math.PI / 2 : 0;
        const endAngle = startAngle + Math.PI / 2;

        const count = 5;
        for (let i = 0; i < count; i++) {
          const t = (i + 0.5) / count;
          const angle = startAngle + t * (endAngle - startAngle);
          const rx = pivotX + Math.cos(angle) * 0.5;
          const rz = pivotZ + Math.sin(angle) * 0.5;

          const tie = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.025, 0.08), this.sleeperMat);
          tie.position.set(rx, sleeperY, rz);
          tie.rotation.y = -angle + Math.PI / 2;
          group.add(tie);
        }
      }
    }

    // 4. Parallel Steel Rails
    const railY = sleeperY + (railHeight / 2) + 0.005;
    const halfGauge = gauge / 2;

    if (isStraightNS || (!isStraightEW && !isCornerTurn)) {
      // Rail 1 (Left / West)
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, 1.0), this.railMat);
      r1.position.set(-halfGauge, railY, 0);
      r1.castShadow = true;
      group.add(r1);

      // Rail 2 (Right / East)
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, 1.0), this.railMat);
      r2.position.set(halfGauge, railY, 0);
      r2.castShadow = true;
      group.add(r2);
    } else if (isStraightEW) {
      // Rail 1 (Top / North)
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, railHeight, railWidth), this.railMat);
      r1.position.set(0, railY, -halfGauge);
      r1.castShadow = true;
      group.add(r1);

      // Rail 2 (Bottom / South)
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, railHeight, railWidth), this.railMat);
      r2.position.set(0, railY, halfGauge);
      r2.castShadow = true;
      group.add(r2);
    } else if (isCornerTurn) {
      // Curved Dual Steel Rails
      const pivotX = isCornerNE || isCornerSE ? 0.5 : -0.5;
      const pivotZ = isCornerNE || isCornerNW ? -0.5 : 0.5;
      const startAngle = isCornerNE ? Math.PI : isCornerNW ? (3 * Math.PI) / 2 : isCornerSE ? Math.PI / 2 : 0;
      const endAngle = startAngle + Math.PI / 2;

      const segments = 9;
      const innerRadius = 0.5 - halfGauge;
      const outerRadius = 0.5 + halfGauge;

      for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        const a1 = startAngle + t1 * (endAngle - startAngle);
        const a2 = startAngle + t2 * (endAngle - startAngle);
        const midA = (a1 + a2) / 2;
        const arcStep = (Math.PI / 2) / segments;

        // Inner curved rail segment
        const innerLen = innerRadius * arcStep * 1.04;
        const inX = pivotX + Math.cos(midA) * innerRadius;
        const inZ = pivotZ + Math.sin(midA) * innerRadius;
        const innerMesh = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, innerLen), this.railMat);
        innerMesh.position.set(inX, railY, inZ);
        innerMesh.rotation.y = -midA;
        group.add(innerMesh);

        // Outer curved rail segment
        const outerLen = outerRadius * arcStep * 1.04;
        const outX = pivotX + Math.cos(midA) * outerRadius;
        const outZ = pivotZ + Math.sin(midA) * outerRadius;
        const outerMesh = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, outerLen), this.railMat);
        outerMesh.position.set(outX, railY, outZ);
        outerMesh.rotation.y = -midA;
        group.add(outerMesh);
      }
    } else {
      // 3-way or 4-way Junction: intersecting rails
      if (rail.hasNorth || rail.hasSouth) {
        const r1 = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, 1.0), this.railMat);
        r1.position.set(-halfGauge, railY, 0);
        group.add(r1);

        const r2 = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, 1.0), this.railMat);
        r2.position.set(halfGauge, railY, 0);
        group.add(r2);
      }
      if (rail.hasEast || rail.hasWest) {
        const r1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, railHeight, railWidth), this.railMat);
        r1.position.set(0, railY, -halfGauge);
        group.add(r1);

        const r2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, railHeight, railWidth), this.railMat);
        r2.position.set(0, railY, halfGauge);
        group.add(r2);
      }
    }

    return group;
  }

  // --- Crossing Signal Posts (Crossbuck 'X' + Red Lamps) ---
  private static buildCrossingSignal(group: THREE.Group, x: number, z: number, rotationY: number) {
    const post = new THREE.Group();
    post.position.set(x, 0.08, z);
    post.rotation.y = rotationY;

    // Steel Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.55), this.signalPoleMat);
    mast.position.y = 0.275;
    post.add(mast);

    // Crossbuck ("X" sign)
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.01), this.crossbuckMat);
    arm1.position.y = 0.46;
    arm1.rotation.z = Math.PI / 4;
    post.add(arm1);

    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.01), this.crossbuckMat);
    arm2.position.y = 0.46;
    arm2.rotation.z = -Math.PI / 4;
    post.add(arm2);

    // Dual Red Warning Lights
    const lampL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), this.redLampMat);
    lampL.position.set(-0.06, 0.38, 0.015);
    post.add(lampL);

    const lampR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), this.redLampMat);
    lampR.position.set(0.06, 0.38, 0.015);
    post.add(lampR);

    // Base Hazard Warning stripes
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), this.yellowWarningMat);
    base.position.y = 0.03;
    post.add(base);

    group.add(post);
  }

  // --- Blueprint Hover Preview Mesh ---
  public static buildRailPreviewMesh(
    hasNorth: boolean,
    hasSouth: boolean,
    hasEast: boolean,
    hasWest: boolean,
    valid: boolean = true
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: valid ? 0x38bdf8 : 0xef4444,
      transparent: true,
      opacity: valid ? 0.65 : 0.75,
      depthWrite: false
    });

    const isStraightEW = (!hasNorth && !hasSouth && hasEast && hasWest);
    const ballastGeo = isStraightEW
      ? new THREE.BoxGeometry(1.0, 0.05, 0.72)
      : new THREE.BoxGeometry(0.72, 0.05, 1.0);
    const ballast = new THREE.Mesh(ballastGeo, mat);
    ballast.position.y = 0.035;
    group.add(ballast);

    // Twin ghost rails
    const railMat = new THREE.MeshBasicMaterial({
      color: valid ? 0xfacc15 : 0xfecaca,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const railGeo = isStraightEW
      ? new THREE.BoxGeometry(1.0, 0.03, 0.03)
      : new THREE.BoxGeometry(0.03, 0.03, 1.0);

    const r1 = new THREE.Mesh(railGeo, railMat);
    r1.position.set(isStraightEW ? 0 : -0.22, 0.065, isStraightEW ? -0.22 : 0);
    group.add(r1);

    const r2 = new THREE.Mesh(railGeo, railMat);
    r2.position.set(isStraightEW ? 0 : 0.22, 0.065, isStraightEW ? 0.22 : 0);
    group.add(r2);

    return group;
  }

  // ========================================================
  // VOXEL TRAIN MODELS (Passenger Express & Heavy Freight)
  // ========================================================

  /**
   * Builds an aerodynamic passenger locomotive engine
   */
  public static buildPassengerEngine(color: number = 0x0284c7): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Heavy Undercarriage Chassis & Wheel Bogies
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.82), darkMat);
    chassis.position.y = 0.06;
    chassis.castShadow = true;
    group.add(chassis);

    // Dual 4-wheel bogies
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const bogieZ = [-0.26, 0.26];
    for (const bz of bogieZ) {
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), wheelMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.set(-0.17, 0.045, bz);
      group.add(w1);

      const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), wheelMat);
      w2.rotation.z = Math.PI / 2;
      w2.position.set(0.17, 0.045, bz);
      group.add(w2);
    }

    // 2. Streamlined Locomotive Cab Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.74), bodyMat);
    body.position.y = 0.20;
    body.castShadow = true;
    group.add(body);

    // White Racing Speed Stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.345, 0.04, 0.75), whiteMat);
    stripe.position.y = 0.17;
    group.add(stripe);

    // 3. Aerodynamic Slanted Nose Cab
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.12), bodyMat);
    nose.position.set(0, 0.16, 0.40);
    group.add(nose);

    // Front Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.03), glassMat);
    windshield.position.set(0, 0.23, 0.38);
    windshield.rotation.x = -Math.PI / 10;
    group.add(windshield);

    // Side Cab Windows
    const sideWinL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.16), glassMat);
    sideWinL.position.set(-0.175, 0.23, 0.24);
    group.add(sideWinL);

    const sideWinR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.16), glassMat);
    sideWinR.position.set(0.175, 0.23, 0.24);
    group.add(sideWinR);

    // 4. LED Dual Headlights
    const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), lightMat);
    lightL.position.set(-0.09, 0.13, 0.46);
    group.add(lightL);

    const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), lightMat);
    lightR.position.set(0.09, 0.13, 0.46);
    group.add(lightR);

    // 5. Roof Pantograph (Electric overhead current collector)
    const pantographMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), darkMat);
    pBase.position.set(0, 0.32, -0.16);
    group.add(pBase);

    const pBar = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.015, 0.04), pantographMat);
    pBar.position.set(0, 0.37, -0.16);
    group.add(pBar);

    return group;
  }

  /**
   * Builds an articulated passenger coach carriage
   */
  public static buildPassengerCarriage(color: number = 0x0284c7): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Illuminated passenger windows!
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    // Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.78), darkMat);
    chassis.position.y = 0.06;
    group.add(chassis);

    // Wheels
    const bogieZ = [-0.25, 0.25];
    for (const bz of bogieZ) {
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), wheelMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.set(-0.17, 0.045, bz);
      group.add(w1);

      const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), wheelMat);
      w2.rotation.z = Math.PI / 2;
      w2.position.set(0.17, 0.045, bz);
      group.add(w2);
    }

    // Carriage Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.74), bodyMat);
    body.position.y = 0.20;
    body.castShadow = true;
    group.add(body);

    // Speed Stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.345, 0.04, 0.75), whiteMat);
    stripe.position.y = 0.17;
    group.add(stripe);

    // Illuminated Passenger Windows along sides
    const winOffsets = [-0.24, -0.08, 0.08, 0.24];
    for (const wz of winOffsets) {
      const wL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.10), glassMat);
      wL.position.set(-0.175, 0.23, wz);
      group.add(wL);

      const wR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.10), glassMat);
      wR.position.set(0.175, 0.23, wz);
      group.add(wR);
    }

    // Gangway articulation bellows on ends
    const gangwayMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const gF = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.03), gangwayMat);
    gF.position.set(0, 0.19, 0.385);
    group.add(gF);

    const gB = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.03), gangwayMat);
    gB.position.set(0, 0.19, -0.385);
    group.add(gB);

    return group;
  }

  /**
   * Builds a heavy freight diesel locomotive
   */
  public static buildFreightEngine(): THREE.Group {
    const group = new THREE.Group();

    const darkYellowMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const grayMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x67e8f9 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

    // Heavy Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.86), darkMat);
    chassis.position.y = 0.06;
    chassis.castShadow = true;
    group.add(chassis);

    // Heavy 6-wheel bogies
    const bogieZ = [-0.28, 0, 0.28];
    for (const bz of bogieZ) {
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), grayMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.set(-0.18, 0.045, bz);
      group.add(w1);

      const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), grayMat);
      w2.rotation.z = Math.PI / 2;
      w2.position.set(0.18, 0.045, bz);
      group.add(w2);
    }

    // Long Hood Engine Bay
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.52), darkYellowMat);
    hood.position.set(0, 0.20, -0.12);
    hood.castShadow = true;
    group.add(hood);

    // High Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.24), darkYellowMat);
    cab.position.set(0, 0.23, 0.26);
    cab.castShadow = true;
    group.add(cab);

    // Front Cab Windows
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.03), glassMat);
    win.position.set(0, 0.28, 0.385);
    group.add(win);

    // Headlight
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), lightMat);
    light.position.set(0, 0.17, 0.435);
    group.add(light);

    // Diesel Exhaust Stack
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08), grayMat);
    exhaust.position.set(0, 0.34, -0.22);
    group.add(exhaust);

    return group;
  }

  /**
   * Builds an intermodal freight container flatcar
   */
  public static buildCargoFlatcar(containerColor: number = 0xb91c1c): THREE.Group {
    const group = new THREE.Group();

    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const containerMat = new THREE.MeshLambertMaterial({ color: containerColor });

    // Flatbed chassis
    const flatbed = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.78), darkMat);
    flatbed.position.y = 0.06;
    flatbed.castShadow = true;
    group.add(flatbed);

    // Wheels
    const bogieZ = [-0.26, 0.26];
    for (const bz of bogieZ) {
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), wheelMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.set(-0.17, 0.045, bz);
      group.add(w1);

      const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), wheelMat);
      w2.rotation.z = Math.PI / 2;
      w2.position.set(0.17, 0.045, bz);
      group.add(w2);
    }

    // Corrugated ISO Shipping Container
    const container = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.70), containerMat);
    container.position.y = 0.20;
    container.castShadow = true;
    group.add(container);

    // Corner castings
    const cornerMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.02, 0.02), cornerMat);
    c1.position.set(0, 0.31, 0.34);
    group.add(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.02, 0.02), cornerMat);
    c2.position.set(0, 0.31, -0.34);
    group.add(c2);

    return group;
  }
}
