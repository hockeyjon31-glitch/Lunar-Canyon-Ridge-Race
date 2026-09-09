import * as THREE from 'three';

export interface CraftMeshes {
  root: THREE.Group;
  cockpit: THREE.Mesh;
  hull: THREE.Mesh;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
  flameLeft: THREE.Mesh;
  flameRight: THREE.Mesh;
  shadowDisc: THREE.Mesh;
  shieldSphere: THREE.Mesh;
}

/**
 * Creates a detailed sci-fi hovercraft pod speeder.
 * @param isPlayer If true, cyan/blue livery; if false, crimson/gold AI rival livery.
 */
export function createHovercraft(isPlayer: boolean): CraftMeshes {
  const root = new THREE.Group();

  // Colors
  const primaryColor = isPlayer ? 0x0ea5e9 : 0xe11d48; // Cyan-Sky vs Crimson
  const secondaryColor = isPlayer ? 0x0f172a : 0x18181b; // Dark graphite
  const accentColor = isPlayer ? 0x38bdf8 : 0xfbbf24; // Bright cyan vs Gold
  const glowColor = isPlayer ? 0x38bdf8 : 0xf97316; // Plasma flame glow

  // Materials
  const hullMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    metalness: 0.85,
    roughness: 0.25,
    envMapIntensity: 1.2,
  });

  const bodyMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    metalness: 0.9,
    roughness: 0.35,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.5,
    roughness: 0.2,
    emissive: accentColor,
    emissiveIntensity: 0.35,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: isPlayer ? 0x0284c7 : 0xd97706,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
    reflectivity: 0.9,
  });

  const thrusterMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.95,
    roughness: 0.2,
  });

  const flameMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: 0.85,
  });

  // 1. Central fuselage (wedge-shaped body)
  const fuselageGeo = new THREE.ConeGeometry(0.85, 3.4, 5);
  fuselageGeo.rotateX(Math.PI / 2);
  fuselageGeo.scale(1, 0.45, 1);
  const hull = new THREE.Mesh(fuselageGeo, hullMat);
  hull.castShadow = true;
  root.add(hull);

  // 2. Cockpit canopy
  const cockpitGeo = new THREE.SphereGeometry(0.45, 16, 12);
  cockpitGeo.scale(0.8, 0.6, 1.6);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, 0.25, 0.1);
  cockpit.castShadow = true;
  root.add(cockpit);

  // 3. Nose cone & front intake
  const noseGeo = new THREE.BoxGeometry(0.35, 0.2, 0.8);
  const nose = new THREE.Mesh(noseGeo, bodyMat);
  nose.position.set(0, -0.05, 1.4);
  root.add(nose);

  // 4. Wings / swept side foils
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1.8, -0.4);
  wingShape.lineTo(1.5, -1.2);
  wingShape.lineTo(0, -0.9);
  wingShape.closePath();

  const extrudeSettings = {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  };

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
  wingGeo.rotateX(-Math.PI / 2);

  // Right wing
  const rightWing = new THREE.Mesh(wingGeo, hullMat);
  rightWing.position.set(0.3, 0.0, 0.2);
  rightWing.castShadow = true;
  root.add(rightWing);

  // Left wing (mirrored)
  const leftWingGeo = wingGeo.clone();
  leftWingGeo.scale(-1, 1, 1);
  const leftWing = new THREE.Mesh(leftWingGeo, hullMat);
  leftWing.position.set(-0.3, 0.0, 0.2);
  leftWing.castShadow = true;
  root.add(leftWing);

  // Wing tip vertical fins
  const finGeo = new THREE.BoxGeometry(0.06, 0.6, 0.8);
  const rightFin = new THREE.Mesh(finGeo, accentMat);
  rightFin.position.set(1.9, 0.25, -0.6);
  rightFin.rotation.z = -0.2;
  root.add(rightFin);

  const leftFin = new THREE.Mesh(finGeo, accentMat);
  leftFin.position.set(-1.9, 0.25, -0.6);
  leftFin.rotation.z = 0.2;
  root.add(leftFin);

  // 5. Twin Repulsor Jet Engines
  const thrusterGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.8, 16);
  thrusterGeo.rotateX(Math.PI / 2);

  const thrusterLeft = new THREE.Mesh(thrusterGeo, thrusterMetalMat);
  thrusterLeft.position.set(-0.85, 0.05, -0.7);
  thrusterLeft.castShadow = true;
  root.add(thrusterLeft);

  const thrusterRight = new THREE.Mesh(thrusterGeo, thrusterMetalMat);
  thrusterRight.position.set(0.85, 0.05, -0.7);
  thrusterRight.castShadow = true;
  root.add(thrusterRight);

  // Thruster intake rings (accent glow)
  const ringGeo = new THREE.TorusGeometry(0.33, 0.05, 8, 20);
  const leftRing = new THREE.Mesh(ringGeo, accentMat);
  leftRing.position.set(-0.85, 0.05, 0.15);
  root.add(leftRing);

  const rightRing = new THREE.Mesh(ringGeo, accentMat);
  rightRing.position.set(0.85, 0.05, 0.15);
  root.add(rightRing);

  // 6. Glowing Plasma Exhaust Nozzles / Flames
  const flameGeo = new THREE.ConeGeometry(0.28, 1.4, 12);
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, -0.7);

  const flameLeft = new THREE.Mesh(flameGeo, flameMat);
  flameLeft.position.set(-0.85, 0.05, -1.6);
  root.add(flameLeft);

  const flameRight = new THREE.Mesh(flameGeo, flameMat);
  flameRight.position.set(0.85, 0.05, -1.6);
  root.add(flameRight);

  // Thruster point light (subtle ambient glow)
  const engineLight = new THREE.PointLight(glowColor, 2.5, 8);
  engineLight.position.set(0, 0.1, -1.8);
  root.add(engineLight);

  // 7. Shield sphere (transparent forcefield that flashes when hit)
  const shieldGeo = new THREE.SphereGeometry(2.3, 16, 12);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.0, // hidden until shield impact or low shield
  });
  const shieldSphere = new THREE.Mesh(shieldGeo, shieldMat);
  root.add(shieldSphere);

  // 8. Ground hover shadow projection disc
  const shadowGeo = new THREE.CircleGeometry(1.6, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = -1.2;
  root.add(shadowDisc);

  return {
    root,
    cockpit,
    hull,
    thrusterLeft,
    thrusterRight,
    flameLeft,
    flameRight,
    shadowDisc,
    shieldSphere,
  };
}
