import * as THREE from 'three';

export class VoxelUtilityBuilder {
  // Shared reusable materials & geometries
  private static pipeMatActive = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.45
  });

  private static pipeMatInactive = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    emissive: 0x1e293b,
    emissiveIntensity: 0.2,
    roughness: 0.5,
    metalness: 0.3
  });

  private static wireMatActive = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.6
  });

  private static wireMatInactive = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0x451a03,
    emissiveIntensity: 0.15,
    roughness: 0.6,
    metalness: 0.2
  });

  private static flangeMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.5
  });

  // --- 1. BUILD WATER PIPE MESH ---
  public static buildPipeMesh(
    hasNorth: boolean,
    hasSouth: boolean,
    hasEast: boolean,
    hasWest: boolean,
    isConnected: boolean
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = isConnected ? this.pipeMatActive : this.pipeMatInactive;
    const depthY = -0.16; // Deep underground inside substrate

    // Central junction chamber
    const centerNode = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12), mat);
    centerNode.position.y = depthY;
    group.add(centerNode);

    // If isolated, display cross stubs so the player sees the laid pipe
    const none = !hasNorth && !hasSouth && !hasEast && !hasWest;
    const n = hasNorth || none;
    const s = hasSouth || none;
    const e = hasEast;
    const w = hasWest;

    const armRadius = 0.065;
    const armLength = 0.5;
    const armGeo = new THREE.CylinderGeometry(armRadius, armRadius, armLength, 10);
    const flangeGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.04, 10);

    if (n) {
      const armN = new THREE.Mesh(armGeo, mat);
      armN.rotation.x = Math.PI / 2;
      armN.position.set(0, depthY, -0.25);
      group.add(armN);

      const flangeN = new THREE.Mesh(flangeGeo, this.flangeMat);
      flangeN.rotation.x = Math.PI / 2;
      flangeN.position.set(0, depthY, -0.46);
      group.add(flangeN);
    }

    if (s) {
      const armS = new THREE.Mesh(armGeo, mat);
      armS.rotation.x = Math.PI / 2;
      armS.position.set(0, depthY, 0.25);
      group.add(armS);

      const flangeS = new THREE.Mesh(flangeGeo, this.flangeMat);
      flangeS.rotation.x = Math.PI / 2;
      flangeS.position.set(0, depthY, 0.46);
      group.add(flangeS);
    }

    if (e) {
      const armE = new THREE.Mesh(armGeo, mat);
      armE.rotation.z = Math.PI / 2;
      armE.position.set(0.25, depthY, 0);
      group.add(armE);

      const flangeE = new THREE.Mesh(flangeGeo, this.flangeMat);
      flangeE.rotation.z = Math.PI / 2;
      flangeE.position.set(0.46, depthY, 0);
      group.add(flangeE);
    }

    if (w) {
      const armW = new THREE.Mesh(armGeo, mat);
      armW.rotation.z = Math.PI / 2;
      armW.position.set(-0.25, depthY, 0);
      group.add(armW);

      const flangeW = new THREE.Mesh(flangeGeo, this.flangeMat);
      flangeW.rotation.z = Math.PI / 2;
      flangeW.position.set(-0.46, depthY, 0);
      group.add(flangeW);
    }

    return group;
  }

  // --- 2. BUILD UNDERGROUND WIRE MESH ---
  public static buildWireMesh(
    hasNorth: boolean,
    hasSouth: boolean,
    hasEast: boolean,
    hasWest: boolean,
    isConnected: boolean
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = isConnected ? this.wireMatActive : this.wireMatInactive;
    const depthY = -0.07; // Above pipes so both can co-exist on the same tile!

    // Central junction transformer node
    const boxGeo = new THREE.BoxGeometry(0.15, 0.1, 0.15);
    const box = new THREE.Mesh(boxGeo, mat);
    box.position.y = depthY;
    group.add(box);

    // Glowing core indicator
    const coreGeo = new THREE.BoxGeometry(0.08, 0.11, 0.08);
    const coreMat = new THREE.MeshBasicMaterial({
      color: isConnected ? 0xffffff : 0x44403c
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = depthY;
    group.add(core);

    const none = !hasNorth && !hasSouth && !hasEast && !hasWest;
    const n = hasNorth || none;
    const s = hasSouth || none;
    const e = hasEast;
    const w = hasWest;

    const conduitRadius = 0.035;
    const conduitLength = 0.5;
    const conduitGeo = new THREE.CylinderGeometry(conduitRadius, conduitRadius, conduitLength, 8);

    if (n) {
      const cN = new THREE.Mesh(conduitGeo, mat);
      cN.rotation.x = Math.PI / 2;
      cN.position.set(0, depthY, -0.25);
      group.add(cN);
    }

    if (s) {
      const cS = new THREE.Mesh(conduitGeo, mat);
      cS.rotation.x = Math.PI / 2;
      cS.position.set(0, depthY, 0.25);
      group.add(cS);
    }

    if (e) {
      const cE = new THREE.Mesh(conduitGeo, mat);
      cE.rotation.z = Math.PI / 2;
      cE.position.set(0.25, depthY, 0);
      group.add(cE);
    }

    if (w) {
      const cW = new THREE.Mesh(conduitGeo, mat);
      cW.rotation.z = Math.PI / 2;
      cW.position.set(-0.25, depthY, 0);
      group.add(cW);
    }

    return group;
  }

  // --- 3. BUILD LIVE CURSOR PREVIEW WITH COVERAGE RADIUS (TheoTown Style!) ---
  public static buildCursorCoveragePreview(type: 'pipe' | 'wire', radiusTiles: number = 4): THREE.Group {
    const group = new THREE.Group();
    const isPipe = type === 'pipe';

    const mainColor = isPipe ? 0x06b6d4 : 0xfacc15;
    const auraColor = isPipe ? 0x22d3ee : 0xfde047;

    // Radius in world coordinates: 4 tiles * 1.0 = ~4.2 world units
    const worldRadius = radiusTiles + 0.25;

    // 1. Semi-transparent coverage field disc
    const discGeo = new THREE.CircleGeometry(worldRadius, 36);
    const discMat = new THREE.MeshBasicMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.035;
    group.add(disc);

    // 2. High-visibility outer perimeter boundary ring
    const ringGeo = new THREE.RingGeometry(worldRadius - 0.12, worldRadius + 0.08, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.038;
    group.add(ring);

    // 3. Central pipe/wire preview model
    if (isPipe) {
      const pipePreview = this.buildPipeMesh(true, true, true, true, true);
      pipePreview.position.y = 0.2; // Raised slightly for crisp hover visibility
      group.add(pipePreview);
    } else {
      const wirePreview = this.buildWireMesh(true, true, true, true, true);
      wirePreview.position.y = 0.2;
      group.add(wirePreview);
    }

    return group;
  }
}

