import * as THREE from 'three';

export class VoxelPedestrianBuilder {
  private static skinColors = [0xfbcfe8, 0xfde047, 0xfbb6ce, 0xd97706, 0x78350f, 0xfef08a];
  private static shirtColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xf8fafc, 0x1e293b];
  private static pantsColors = [0x1e293b, 0x334155, 0x1e3a8a, 0x475569];

  public static createPedestrian(): { group: THREE.Group; leftLeg: THREE.Mesh; rightLeg: THREE.Mesh } {
    const group = new THREE.Group();

    const skin = this.skinColors[Math.floor(Math.random() * this.skinColors.length)];
    const shirt = this.shirtColors[Math.floor(Math.random() * this.shirtColors.length)];
    const pants = this.pantsColors[Math.floor(Math.random() * this.pantsColors.length)];

    const skinMat = new THREE.MeshLambertMaterial({ color: skin });
    const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
    const pantsMat = new THREE.MeshLambertMaterial({ color: pants });

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skinMat);
    head.position.y = 0.26;
    head.castShadow = true;
    group.add(head);

    // Torso (Shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), shirtMat);
    torso.position.y = 0.16;
    torso.castShadow = true;
    group.add(torso);

    // Left Leg
    const legGeo = new THREE.BoxGeometry(0.04, 0.1, 0.04);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.025, 0.05, 0);
    group.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.025, 0.05, 0);
    group.add(rightLeg);

    group.scale.set(0.85, 0.85, 0.85);
    return { group, leftLeg, rightLeg };
  }
}
