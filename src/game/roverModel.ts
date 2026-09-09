import * as THREE from 'three';
import { createTireTreadTexture } from './textureGenerator';

export interface RoverMeshGroup extends THREE.Group {
  userData: {
    wheels: THREE.Group[];
    frontWheelSteerGroups: THREE.Group[];
    suspensionStruts: THREE.Mesh[];
    thrusterFlames: THREE.Mesh[];
    headlights: THREE.SpotLight[];
    boosterLight?: THREE.PointLight;
  };
}

export function createLandRover(isPlayer: boolean = true): RoverMeshGroup {
  const rover = new THREE.Group() as RoverMeshGroup;

  const primaryColor = isPlayer ? 0xe2e8f0 : 0x1e293b; // White/Silver vs Stealth Dark Slate
  const accentColor = isPlayer ? 0x06b6d4 : 0xef4444;  // Cyan vs Neon Red/Orange
  const frameColor = 0x334155;                         // Dark Titanium
  const tireColor = 0x0f172a;                          // Deep carbon rubber

  const primaryMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.35,
    metalness: 0.65,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.25,
    metalness: 0.8,
    emissive: accentColor,
    emissiveIntensity: 0.35,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: 0.6,
    metalness: 0.85,
  });

  const treadTexture = createTireTreadTexture();
  const tireMat = new THREE.MeshStandardMaterial({
    color: tireColor,
    roughness: 0.9,
    metalness: 0.1,
    bumpMap: treadTexture,
    bumpScale: 0.08,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.3,
    metalness: 0.9,
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.2,
    metalness: 0.9,
  });

  // 1. Lower Chassis Skid Plate & Hull
  const chassisGeom = new THREE.BoxGeometry(1.5, 0.45, 3.0);
  const chassis = new THREE.Mesh(chassisGeom, primaryMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  rover.add(chassis);

  // Front wedge armor plate
  const wedgeGeom = new THREE.CylinderGeometry(0.7, 0.9, 0.7, 4);
  wedgeGeom.rotateY(Math.PI / 4);
  const wedge = new THREE.Mesh(wedgeGeom, primaryMat);
  wedge.position.set(0, 0.65, 1.4);
  wedge.scale.set(1.0, 0.5, 1.0);
  wedge.castShadow = true;
  rover.add(wedge);

  // Front bull-bar / bumper
  const bumperGeom = new THREE.BoxGeometry(1.6, 0.18, 0.25);
  const bumper = new THREE.Mesh(bumperGeom, frameMat);
  bumper.position.set(0, 0.45, 1.6);
  rover.add(bumper);

  // 2. Cockpit / Canopy
  const canopyGeom = new THREE.BoxGeometry(1.1, 0.5, 1.3);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0x0284c7 : 0x991b1b,
    metalness: 0.85,
    roughness: 0.15,
    transparent: true,
    opacity: 0.85,
    emissive: isPlayer ? 0x0369a1 : 0x7f1d1d,
    emissiveIntensity: 0.2,
  });
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.set(0, 0.95, -0.1);
  canopy.castShadow = true;
  rover.add(canopy);

  // 3. Heavy-Duty Roll Cage
  const rollCageGroup = new THREE.Group();
  const barMat = frameMat;
  const barRadius = 0.045;

  const createRollBar = (start: THREE.Vector3, end: THREE.Vector3) => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const geom = new THREE.CylinderGeometry(barRadius, barRadius, len, 8);
    geom.translate(0, len / 2, 0);
    geom.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geom, barMat);
    mesh.position.copy(start);
    mesh.lookAt(end);
    return mesh;
  };

  // Left & right cage hoops
  rollCageGroup.add(createRollBar(new THREE.Vector3(-0.7, 0.7, 0.9), new THREE.Vector3(-0.65, 1.35, 0.4)));
  rollCageGroup.add(createRollBar(new THREE.Vector3(0.7, 0.7, 0.9), new THREE.Vector3(0.65, 1.35, 0.4)));
  rollCageGroup.add(createRollBar(new THREE.Vector3(-0.65, 1.35, 0.4), new THREE.Vector3(-0.65, 1.35, -0.8)));
  rollCageGroup.add(createRollBar(new THREE.Vector3(0.65, 1.35, 0.4), new THREE.Vector3(0.65, 1.35, -0.8)));
  rollCageGroup.add(createRollBar(new THREE.Vector3(-0.65, 1.35, -0.8), new THREE.Vector3(-0.7, 0.7, -1.3)));
  rollCageGroup.add(createRollBar(new THREE.Vector3(0.65, 1.35, -0.8), new THREE.Vector3(0.7, 0.7, -1.3)));
  // Top cross-bars
  rollCageGroup.add(createRollBar(new THREE.Vector3(-0.65, 1.35, 0.4), new THREE.Vector3(0.65, 1.35, 0.4)));
  rollCageGroup.add(createRollBar(new THREE.Vector3(-0.65, 1.35, -0.8), new THREE.Vector3(0.65, 1.35, -0.8)));
  rover.add(rollCageGroup);

  // 4. Rear Scientific & Power Bay + Thermal Gold Foil
  const rearBayGeom = new THREE.BoxGeometry(1.35, 0.55, 0.9);
  const rearBay = new THREE.Mesh(rearBayGeom, goldFoilMat);
  rearBay.position.set(0, 0.85, -0.95);
  rearBay.castShadow = true;
  rover.add(rearBay);

  // Antenna / High-gain comms dish
  const dishGeom = new THREE.CylinderGeometry(0.3, 0.05, 0.1, 16);
  const dish = new THREE.Mesh(dishGeom, accentMat);
  dish.rotation.x = Math.PI * 0.35;
  dish.rotation.z = Math.PI * 0.1;
  dish.position.set(-0.4, 1.45, -1.1);
  rover.add(dish);

  const mastGeom = new THREE.CylinderGeometry(0.02, 0.03, 0.6, 6);
  const mast = new THREE.Mesh(mastGeom, frameMat);
  mast.position.set(0.45, 1.45, -1.2);
  rover.add(mast);

  // 5. Twin Nitro / Ion Rocket Boosters
  const thrusterFlames: THREE.Mesh[] = [];
  const boosterLight = new THREE.PointLight(isPlayer ? 0x38bdf8 : 0xf97316, 0, 15);
  boosterLight.position.set(0, 0.65, -1.8);
  rover.add(boosterLight);

  for (const xOff of [-0.4, 0.4]) {
    const nozzleGeom = new THREE.CylinderGeometry(0.14, 0.18, 0.4, 12);
    nozzleGeom.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeom, frameMat);
    nozzle.position.set(xOff, 0.65, -1.55);
    rover.add(nozzle);

    // Dynamic thruster flame plume (scaled during boost)
    const flameGeom = new THREE.ConeGeometry(0.13, 0.8, 8);
    flameGeom.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? 0x38bdf8 : 0xf97316,
      transparent: true,
      opacity: 0,
    });
    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.set(xOff, 0.65, -1.95);
    rover.add(flame);
    thrusterFlames.push(flame);
  }

  // 6. Roof & Bumper Headlights
  const headlights: THREE.SpotLight[] = [];
  const headlightPositions = [
    { pos: new THREE.Vector3(-0.55, 0.52, 1.62), targetZ: 25 },
    { pos: new THREE.Vector3(0.55, 0.52, 1.62), targetZ: 25 },
  ];

  for (const hp of headlightPositions) {
    // Glowing lens cap
    const lensGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12);
    lensGeom.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
    });
    const lens = new THREE.Mesh(lensGeom, lensMat);
    lens.position.copy(hp.pos);
    rover.add(lens);

    // Realistic spotlight casting beams ahead
    const spot = new THREE.SpotLight(0xfff7ed, 4.0, 45, Math.PI / 6, 0.4, 1.5);
    spot.position.copy(hp.pos);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(hp.pos.x, hp.pos.y - 0.5, hp.pos.z + hp.targetZ);
    rover.add(targetObj);
    spot.target = targetObj;
    rover.add(spot);
    headlights.push(spot);
  }

  // 7. Four Chunky Planetary Wheels with Independent Suspension
  const wheels: THREE.Group[] = [];
  const frontWheelSteerGroups: THREE.Group[] = [];
  const suspensionStruts: THREE.Mesh[] = [];

  // Wheel positions: Front-Left, Front-Right, Rear-Left, Rear-Right
  const wheelConfigs = [
    { x: -1.05, z: 1.05, isFront: true },
    { x: 1.05, z: 1.05, isFront: true },
    { x: -1.05, z: -0.95, isFront: false },
    { x: 1.05, z: -0.95, isFront: false },
  ];

  const wheelRadius = 0.45;
  const wheelWidth = 0.38;

  for (const cfg of wheelConfigs) {
    // Suspension arm / wishbone from chassis to wheel hub
    const strutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
    strutGeom.rotateZ(cfg.x > 0 ? -Math.PI / 5 : Math.PI / 5);
    const strut = new THREE.Mesh(strutGeom, frameMat);
    strut.position.set(cfg.x * 0.6, 0.45, cfg.z);
    rover.add(strut);
    suspensionStruts.push(strut);

    // Spring coil
    const coilGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8);
    coilGeom.rotateZ(cfg.x > 0 ? -Math.PI / 5 : Math.PI / 5);
    const coil = new THREE.Mesh(coilGeom, accentMat);
    coil.position.set(cfg.x * 0.6, 0.45, cfg.z);
    rover.add(coil);

    // Steer group (yaw rotation for front wheels)
    const steerGroup = new THREE.Group();
    steerGroup.position.set(cfg.x, wheelRadius, cfg.z);
    rover.add(steerGroup);

    if (cfg.isFront) {
      frontWheelSteerGroups.push(steerGroup);
    }

    // Wheel spin group (pitch rotation when rolling)
    const wheelSpinGroup = new THREE.Group();
    steerGroup.add(wheelSpinGroup);
    wheels.push(wheelSpinGroup);

    // Tire tread mesh
    const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeom, tireMat);
    tireMesh.castShadow = true;
    wheelSpinGroup.add(tireMesh);

    // Rim hub & planetary gear cap
    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth + 0.02, 12);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    wheelSpinGroup.add(rimMesh);

    // Outer hub accent cap
    const capGeom = new THREE.CylinderGeometry(0.14, 0.14, wheelWidth + 0.05, 8);
    capGeom.rotateZ(Math.PI / 2);
    const capMesh = new THREE.Mesh(capGeom, accentMat);
    wheelSpinGroup.add(capMesh);

    // 5 wheel lug nuts
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const nutGeom = new THREE.CylinderGeometry(0.03, 0.03, wheelWidth + 0.04, 6);
      nutGeom.rotateZ(Math.PI / 2);
      const nutMesh = new THREE.Mesh(nutGeom, frameMat);
      nutMesh.position.set(
        cfg.x > 0 ? 0.01 : -0.01,
        Math.sin(angle) * 0.18,
        Math.cos(angle) * 0.18
      );
      wheelSpinGroup.add(nutMesh);
    }
  }

  rover.userData = {
    wheels,
    frontWheelSteerGroups,
    suspensionStruts,
    thrusterFlames,
    headlights,
    boosterLight,
  };

  return rover;
}
