import * as THREE from 'three';
import type { VehicleType } from './types';

export class VoxelVehicleBuilder {
  private static wheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.07, 8);
  private static wheelMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
  private static hubcapMat = new THREE.MeshLambertMaterial({ color: 0xa1a1aa });
  private static glassMat = new THREE.MeshLambertMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 });
  private static headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private static tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  public static createVehicle(type: VehicleType, mainColor: number): { 
    group: THREE.Group; 
    wheels: THREE.Mesh[]; 
    emergencyLights?: THREE.Mesh[]; 
    frontSteerPivots?: THREE.Group[];
  } {
    const group = new THREE.Group();
    const wheels: THREE.Mesh[] = [];
    const frontSteerPivots: THREE.Group[] = [];
    let emergencyLights: THREE.Mesh[] | undefined;

    switch (type) {
      case 'sports':
        emergencyLights = this.buildSportsCar(group, wheels, frontSteerPivots, mainColor);
        break;
      case 'sedan':
        emergencyLights = this.buildSedan(group, wheels, frontSteerPivots, mainColor);
        break;
      case 'suv':
        emergencyLights = this.buildSUV(group, wheels, mainColor);
        break;
      case 'bus':
        emergencyLights = this.buildBus(group, wheels, mainColor);
        break;
      case 'truck':
        emergencyLights = this.buildTruck(group, wheels, mainColor);
        break;
      case 'police':
        emergencyLights = this.buildEmergencyVehicle(group, wheels, 0x0f172a, 'police', frontSteerPivots);
        break;
      case 'ambulance':
        emergencyLights = this.buildEmergencyVehicle(group, wheels, 0xf8fafc, 'ambulance', frontSteerPivots);
        break;
      default:
        emergencyLights = this.buildSedan(group, wheels, frontSteerPivots, mainColor);
        break;
    }

    // Add tiny soft contact shadow underneath the vehicle
    const shadowGeo = new THREE.PlaneGeometry(0.5, 0.85);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    group.add(shadowMesh);

    // Uniformly scale vehicles to proper miniature voxel proportions (0.68x)
    // Ensures two cars comfortably pass each other in opposite lanes with plenty of extra clearance
    group.scale.set(0.68, 0.68, 0.68);

    return { group, wheels, emergencyLights, frontSteerPivots };
  }

  private static addSteerableWheel(group: THREE.Group, wheels: THREE.Mesh[], frontSteerPivots: THREE.Group[], x: number, y: number, z: number) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);

    const wheel = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;

    const capGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.075, 6);
    const cap = new THREE.Mesh(capGeo, this.hubcapMat);
    cap.rotation.z = Math.PI / 2;
    wheel.add(cap);

    pivot.add(wheel);
    group.add(pivot);

    wheels.push(wheel);
    frontSteerPivots.push(pivot);
  }

  private static addWheel(group: THREE.Group, wheels: THREE.Mesh[], x: number, y: number, z: number) {
    const wheel = new THREE.Mesh(this.wheelGeo, this.wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;

    // Hubcap
    const capGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.075, 6);
    const cap = new THREE.Mesh(capGeo, this.hubcapMat);
    cap.rotation.z = Math.PI / 2;
    wheel.add(cap);

    group.add(wheel);
    wheels.push(wheel);
  }

  // Pocket City / GTA Style High-Performance Voxel Sports Car
  public static buildSportsCar(group: THREE.Group, wheels: THREE.Mesh[], frontSteerPivots: THREE.Group[], color: number = 0xef4444): undefined {
    const bodyMat = new THREE.MeshLambertMaterial({ color: color || 0xef4444 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x18181b }); // Carbon black trim
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });

    // 1. Low-slung Wide Chassis
    const chassisGeo = new THREE.BoxGeometry(0.46, 0.11, 0.88);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.12;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Front Aerodynamic Splitter (Black)
    const splitterGeo = new THREE.BoxGeometry(0.48, 0.04, 0.12);
    const splitter = new THREE.Mesh(splitterGeo, trimMat);
    splitter.position.set(0, 0.07, 0.44);
    group.add(splitter);

    // 3. Racing Stripes (Dual central black stripes)
    const stripeGeo = new THREE.BoxGeometry(0.06, 0.01, 0.82);
    const s1 = new THREE.Mesh(stripeGeo, trimMat);
    s1.position.set(-0.06, 0.18, 0.03);
    group.add(s1);
    const s2 = new THREE.Mesh(stripeGeo, trimMat);
    s2.position.set(0.06, 0.18, 0.03);
    group.add(s2);

    // 4. Aggressive Hood Scoop
    const scoopGeo = new THREE.BoxGeometry(0.14, 0.04, 0.2);
    const scoop = new THREE.Mesh(scoopGeo, trimMat);
    scoop.position.set(0, 0.19, 0.22);
    group.add(scoop);

    // 5. Aerodynamic Fastback Cockpit Canopy
    const cabinGeo = new THREE.BoxGeometry(0.36, 0.12, 0.44);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.23, -0.06);
    cabin.castShadow = true;
    group.add(cabin);

    // 6. Tinted Windshields
    const fWinGeo = new THREE.BoxGeometry(0.34, 0.11, 0.02);
    const fWin = new THREE.Mesh(fWinGeo, this.glassMat);
    fWin.position.set(0, 0.23, 0.165);
    fWin.rotation.x = -Math.PI / 10;
    group.add(fWin);

    const rWin = new THREE.Mesh(fWinGeo, this.glassMat);
    rWin.position.set(0, 0.23, -0.285);
    rWin.rotation.x = Math.PI / 10;
    group.add(rWin);

    const sWinGeo = new THREE.BoxGeometry(0.02, 0.10, 0.36);
    const sWinL = new THREE.Mesh(sWinGeo, this.glassMat);
    sWinL.position.set(-0.182, 0.23, -0.06);
    group.add(sWinL);
    const sWinR = new THREE.Mesh(sWinGeo, this.glassMat);
    sWinR.position.set(0.182, 0.23, -0.06);
    group.add(sWinR);

    // 7. Raised GT Racing Spoiler Wing
    const strutGeo = new THREE.BoxGeometry(0.02, 0.1, 0.04);
    const strutL = new THREE.Mesh(strutGeo, trimMat);
    strutL.position.set(-0.16, 0.22, -0.42);
    group.add(strutL);
    const strutR = new THREE.Mesh(strutGeo, trimMat);
    strutR.position.set(0.16, 0.22, -0.42);
    group.add(strutR);

    const wingGeo = new THREE.BoxGeometry(0.48, 0.03, 0.12);
    const wing = new THREE.Mesh(wingGeo, trimMat);
    wing.position.set(0, 0.27, -0.42);
    group.add(wing);

    // 8. Dual Chrome Exhaust Pipes
    const exGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08);
    const ex1 = new THREE.Mesh(exGeo, chromeMat);
    ex1.rotation.x = Math.PI / 2;
    ex1.position.set(-0.11, 0.1, -0.45);
    group.add(ex1);
    const ex2 = new THREE.Mesh(exGeo, chromeMat);
    ex2.rotation.x = Math.PI / 2;
    ex2.position.set(0.11, 0.1, -0.45);
    group.add(ex2);

    // 9. High-intensity LED Headlights & Brake Lights
    this.addStandardLights(group, 0.44, 0.13, 0.17);

    // 10. Front Steerable Wheels & Rear Drive Wheels
    this.addSteerableWheel(group, wheels, frontSteerPivots, -0.23, 0.08, 0.26);
    this.addSteerableWheel(group, wheels, frontSteerPivots, 0.23, 0.08, 0.26);
    this.addWheel(group, wheels, -0.23, 0.08, -0.26);
    this.addWheel(group, wheels, 0.23, 0.08, -0.26);

    return undefined;
  }

  private static buildSedan(group: THREE.Group, wheels: THREE.Mesh[], frontSteerPivots: THREE.Group[], color: number): undefined {
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const bumperMat = new THREE.MeshLambertMaterial({ color: 0x27272a });

    // Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(0.42, 0.14, 0.82);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.14;
    chassis.castShadow = true;
    group.add(chassis);

    // Front/Rear Bumpers
    const fBumpGeo = new THREE.BoxGeometry(0.44, 0.09, 0.06);
    const fBump = new THREE.Mesh(fBumpGeo, bumperMat);
    fBump.position.set(0, 0.12, 0.42);
    group.add(fBump);
    const rBump = new THREE.Mesh(fBumpGeo, bumperMat);
    rBump.position.set(0, 0.12, -0.42);
    group.add(rBump);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(0.36, 0.15, 0.42);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.28, -0.04);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshield & Rear Window
    const fWinGeo = new THREE.BoxGeometry(0.34, 0.12, 0.02);
    const fWin = new THREE.Mesh(fWinGeo, this.glassMat);
    fWin.position.set(0, 0.27, 0.175);
    group.add(fWin);

    const rWin = new THREE.Mesh(fWinGeo, this.glassMat);
    rWin.position.set(0, 0.27, -0.255);
    group.add(rWin);

    // Side Windows
    const sWinGeo = new THREE.BoxGeometry(0.02, 0.11, 0.38);
    const sWinL = new THREE.Mesh(sWinGeo, this.glassMat);
    sWinL.position.set(-0.182, 0.27, -0.04);
    group.add(sWinL);
    const sWinR = new THREE.Mesh(sWinGeo, this.glassMat);
    sWinR.position.set(0.182, 0.27, -0.04);
    group.add(sWinR);

    // Headlights & Tail Lights
    this.addStandardLights(group, 0.42, 0.15, 0.15);

    // 4 Wheels
    this.addSteerableWheel(group, wheels, frontSteerPivots, -0.21, 0.09, 0.24);
    this.addSteerableWheel(group, wheels, frontSteerPivots, 0.21, 0.09, 0.24);
    this.addWheel(group, wheels, -0.21, 0.09, -0.24);
    this.addWheel(group, wheels, 0.21, 0.09, -0.24);

    return undefined;
  }

  private static buildSUV(group: THREE.Group, wheels: THREE.Mesh[], color: number): undefined {
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

    // Chassis (Taller)
    const chassisGeo = new THREE.BoxGeometry(0.45, 0.18, 0.86);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.18;
    chassis.castShadow = true;
    group.add(chassis);

    // Cabin (Full length wagon roof)
    const cabinGeo = new THREE.BoxGeometry(0.4, 0.18, 0.55);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.35, -0.08);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof rack rails
    const rackGeo = new THREE.BoxGeometry(0.32, 0.03, 0.45);
    const rack = new THREE.Mesh(rackGeo, trimMat);
    rack.position.set(0, 0.45, -0.08);
    group.add(rack);

    // Windows
    const fWinGeo = new THREE.BoxGeometry(0.38, 0.14, 0.02);
    const fWin = new THREE.Mesh(fWinGeo, this.glassMat);
    fWin.position.set(0, 0.35, 0.2);
    group.add(fWin);

    const rWin = new THREE.Mesh(fWinGeo, this.glassMat);
    rWin.position.set(0, 0.35, -0.36);
    group.add(rWin);

    // Spare wheel on the back!
    this.addWheel(group, wheels, 0, 0.28, -0.45);

    // Headlights & Tail Lights
    this.addStandardLights(group, 0.44, 0.18, 0.16);

    // Wheels
    this.addWheel(group, wheels, -0.23, 0.1, 0.25);
    this.addWheel(group, wheels, 0.23, 0.1, 0.25);
    this.addWheel(group, wheels, -0.23, 0.1, -0.25);
    this.addWheel(group, wheels, 0.23, 0.1, -0.25);

    return undefined;
  }

  private static buildBus(group: THREE.Group, wheels: THREE.Mesh[], color: number): undefined {
    const bodyMat = new THREE.MeshLambertMaterial({ color: color || 0xfacc15 }); // Classic yellow city bus
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Long body
    const bodyGeo = new THREE.BoxGeometry(0.46, 0.36, 1.3);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.28;
    body.castShadow = true;
    group.add(body);

    // White AC Roof
    const roofGeo = new THREE.BoxGeometry(0.44, 0.05, 1.25);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.48;
    group.add(roof);

    // Panoramic bus windows
    const sideWinGeo = new THREE.BoxGeometry(0.47, 0.14, 1.1);
    const sideWin = new THREE.Mesh(sideWinGeo, this.glassMat);
    sideWin.position.set(0, 0.34, 0.05);
    group.add(sideWin);

    // Front windshield
    const frontWinGeo = new THREE.BoxGeometry(0.42, 0.18, 0.03);
    const frontWin = new THREE.Mesh(frontWinGeo, this.glassMat);
    frontWin.position.set(0, 0.32, 0.655);
    group.add(frontWin);

    // Lights
    this.addStandardLights(group, 0.66, 0.18, 0.18);

    // 6 Wheels for heavy bus
    this.addWheel(group, wheels, -0.24, 0.1, 0.45);
    this.addWheel(group, wheels, 0.24, 0.1, 0.45);
    this.addWheel(group, wheels, -0.24, 0.1, -0.28);
    this.addWheel(group, wheels, 0.24, 0.1, -0.28);
    this.addWheel(group, wheels, -0.24, 0.1, -0.46);
    this.addWheel(group, wheels, 0.24, 0.1, -0.46);

    return undefined;
  }

  private static buildTruck(group: THREE.Group, wheels: THREE.Mesh[], color: number): undefined {
    const cabMat = new THREE.MeshLambertMaterial({ color });
    const cargoMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }); // Cargo container
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    // Chassis frame
    const frameGeo = new THREE.BoxGeometry(0.44, 0.08, 1.2);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.14;
    group.add(frame);

    // Truck Cab
    const cabGeo = new THREE.BoxGeometry(0.44, 0.34, 0.38);
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 0.3, 0.4);
    cab.castShadow = true;
    group.add(cab);

    // Windshield
    const winGeo = new THREE.BoxGeometry(0.4, 0.14, 0.02);
    const win = new THREE.Mesh(winGeo, this.glassMat);
    win.position.set(0, 0.34, 0.595);
    group.add(win);

    // Cargo Box
    const cargoGeo = new THREE.BoxGeometry(0.46, 0.4, 0.76);
    const cargo = new THREE.Mesh(cargoGeo, cargoMat);
    cargo.position.set(0, 0.33, -0.2);
    cargo.castShadow = true;
    group.add(cargo);

    // Exhaust pipes on cab back
    const exhaustGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
    const exMat = new THREE.MeshLambertMaterial({ color: 0x71717a });
    const ex1 = new THREE.Mesh(exhaustGeo, exMat);
    ex1.position.set(-0.18, 0.4, 0.2);
    group.add(ex1);
    const ex2 = new THREE.Mesh(exhaustGeo, exMat);
    ex2.position.set(0.18, 0.4, 0.2);
    group.add(ex2);

    // Lights
    this.addStandardLights(group, 0.6, 0.18, 0.17);

    // Wheels
    this.addWheel(group, wheels, -0.23, 0.1, 0.42);
    this.addWheel(group, wheels, 0.23, 0.1, 0.42);
    this.addWheel(group, wheels, -0.23, 0.1, -0.25);
    this.addWheel(group, wheels, 0.23, 0.1, -0.25);
    this.addWheel(group, wheels, -0.23, 0.1, -0.43);
    this.addWheel(group, wheels, 0.23, 0.1, -0.43);

    return undefined;
  }

  private static buildEmergencyVehicle(group: THREE.Group, wheels: THREE.Mesh[], color: number, role: 'police' | 'ambulance', frontSteerPivots: THREE.Group[] = []): THREE.Mesh[] {
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const stripeMat = new THREE.MeshLambertMaterial({ color: role === 'police' ? 0xffffff : 0xef4444 });

    // Chassis
    const chassisGeo = new THREE.BoxGeometry(0.44, 0.16, 0.88);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.16;
    chassis.castShadow = true;
    group.add(chassis);

    // Side stripe
    const stripeGeo = new THREE.BoxGeometry(0.445, 0.06, 0.8);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.16;
    group.add(stripe);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(0.4, 0.18, 0.5);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.32, -0.05);
    cabin.castShadow = true;
    group.add(cabin);

    // Windows
    const fWinGeo = new THREE.BoxGeometry(0.38, 0.12, 0.02);
    const fWin = new THREE.Mesh(fWinGeo, this.glassMat);
    fWin.position.set(0, 0.32, 0.205);
    group.add(fWin);

    // Sirens on roof
    const lightBarGeo = new THREE.BoxGeometry(0.09, 0.06, 0.08);
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const sirenLeft = new THREE.Mesh(lightBarGeo, redMat);
    sirenLeft.position.set(-0.1, 0.44, -0.05);
    group.add(sirenLeft);

    const sirenRight = new THREE.Mesh(lightBarGeo, blueMat);
    sirenRight.position.set(0.1, 0.44, -0.05);
    group.add(sirenRight);

    // Standard lights & wheels
    this.addStandardLights(group, 0.45, 0.16, 0.16);
    this.addSteerableWheel(group, wheels, frontSteerPivots, -0.23, 0.1, 0.25);
    this.addSteerableWheel(group, wheels, frontSteerPivots, 0.23, 0.1, 0.25);
    this.addWheel(group, wheels, -0.23, 0.1, -0.25);
    this.addWheel(group, wheels, 0.23, 0.1, -0.25);

    return [sirenLeft, sirenRight];
  }

  private static addStandardLights(group: THREE.Group, lengthOffset: number, yOffset: number, widthOffset: number) {
    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const hl1 = new THREE.Mesh(hlGeo, this.headLightMat);
    hl1.position.set(-widthOffset, yOffset, lengthOffset + 0.005);
    group.add(hl1);
    const hl2 = new THREE.Mesh(hlGeo, this.headLightMat);
    hl2.position.set(widthOffset, yOffset, lengthOffset + 0.005);
    group.add(hl2);

    // Tail lights
    const tlGeo = new THREE.BoxGeometry(0.08, 0.05, 0.02);
    const tl1 = new THREE.Mesh(tlGeo, this.tailLightMat);
    tl1.position.set(-widthOffset, yOffset, -lengthOffset - 0.005);
    group.add(tl1);
    const tl2 = new THREE.Mesh(tlGeo, this.tailLightMat);
    tl2.position.set(widthOffset, yOffset, -lengthOffset - 0.005);
    group.add(tl2);
  }
}

