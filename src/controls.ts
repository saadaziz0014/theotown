import * as THREE from 'three';

export class VoxelCameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  public enabled: boolean = true;

  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public radius: number = 28;
  public theta: number = Math.PI / 4; // Horizontal rotation
  public phi: number = Math.PI / 3.5; // Vertical pitch

  // Photoshop / Illustrator Hand Tool Mode (Hold Space + Left Click Drag)
  public isSpacePressed: boolean = false;
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.updateCamera();
    this.setupListeners();
  }

  private setupListeners() {
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Track Space key globally
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space') {
        // Prevent page scroll
        e.preventDefault();
        if (!this.isSpacePressed) {
          this.isSpacePressed = true;
          this.domElement.style.cursor = 'grab';
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        if (!this.isPanning) {
          this.domElement.style.cursor = 'default';
        }
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0 && this.isSpacePressed) {
        // Space + Left Click: Illustrator-style Canvas Pan
        e.preventDefault();
        e.stopPropagation();
        this.isPanning = true;
        this.domElement.style.cursor = 'grabbing';
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) {
        // Right click: Orbit 3D camera
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      } else if (e.button === 1) {
        // Middle click: Pan
        this.isPanning = true;
        this.domElement.style.cursor = 'grabbing';
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.theta -= deltaX * 0.008;
        this.phi = Math.max(0.15, Math.min(Math.PI / 2.1, this.phi - deltaY * 0.008));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        this.updateCamera();
      } else if (this.isPanning) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const panSpeed = 0.038 * (this.radius / 25);
        this.target.addScaledVector(right, -deltaX * panSpeed);
        this.target.addScaledVector(forward, deltaY * panSpeed);

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        this.updateCamera();
      }
    });

    window.addEventListener('mouseup', () => {
      if (!this.enabled) return;
      this.isDragging = false;
      this.isPanning = false;
      if (this.isSpacePressed) {
        this.domElement.style.cursor = 'grab';
      } else {
        this.domElement.style.cursor = 'default';
      }
    });

    this.domElement.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.radius = Math.max(6, Math.min(95, this.radius + e.deltaY * 0.035));
      this.updateCamera();
    }, { passive: false });

    // Keyboard Pan (WASD / Arrows / QE rotation)
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const speed = 1.0;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        this.target.addScaledVector(forward, speed);
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        this.target.addScaledVector(forward, -speed);
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        this.target.addScaledVector(right, -speed);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        this.target.addScaledVector(right, speed);
      } else if (e.key === 'q' || e.key === 'Q') {
        this.theta += 0.1;
      } else if (e.key === 'e' || e.key === 'E') {
        this.theta -= 0.1;
      }
      this.updateCamera();
    });
  }

  public updateCamera() {
    if (!this.enabled) return;
    const x = this.target.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.target.y + this.radius * Math.cos(this.phi);
    const z = this.target.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}
