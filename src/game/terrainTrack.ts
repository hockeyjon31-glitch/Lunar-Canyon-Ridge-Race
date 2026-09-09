import * as THREE from 'three';
import { CheckpointData, EnvironmentConfig, EnvironmentType, ObstacleData, TrackConfig, TrackType } from '../types';
import { createCliffTexture, createRoadTexture, createTerrainTexture } from './textureGenerator';

export const TRACK_CONFIGS: Record<TrackType, TrackConfig> = {
  canyon: {
    id: 'canyon',
    name: 'Valles Chasm Fissure',
    tagline: 'Deep Point-to-Point Gorge',
    description: 'A 2.2km point-to-point route through towering 70m canyon walls. Rough gravel bed, fallen boulders, and blind chicanes.',
    terrainType: 'canyon_gorge',
    lengthMeters: 2200,
    totalCheckpoints: 10,
    roughness: 0.85,
    difficulty: 'High Speed Off-Road',
  },
  ridge: {
    id: 'ridge',
    name: 'Montes Hilly Ridgeline',
    tagline: 'High-Altitude Crest Traverse',
    description: 'A 2.4km undulating rally along a rocky mountain ridge. Rolling bumps, steep lateral drop-offs, and massive air-time crests.',
    terrainType: 'hilly_ridge',
    lengthMeters: 2400,
    totalCheckpoints: 10,
    roughness: 0.9,
    difficulty: 'Extreme Terrain & Jumps',
  },
};

export const ENVIRONMENTS: Record<EnvironmentType, EnvironmentConfig> = {
  mars: {
    id: 'mars',
    name: 'Mars: Noctis Labyrinthus',
    subtitle: 'Red Planet Iron & Basalt Sector',
    description: 'Low-gravity terrain bathed in crimson haze. Rugged red sandstone, basalt needles, and atmospheric dust.',
    skyColor: 0x9a482b,
    fogColor: 0x8a391e,
    fogDensity: 0.0028,
    sunColor: 0xffedd5,
    sunIntensity: 2.2,
    ambientColor: 0x7c2d12,
    ambientIntensity: 0.65,
    groundColor: 0x99381c,
    cliffColor: 0x661d0a,
    accentColor: '#f97316',
    secondaryColor: '#38bdf8',
    gravity: 3.72,
    atmosphereName: 'Thin CO2 Haze (0.01 atm)',
  },
  lunar: {
    id: 'lunar',
    name: 'Moon: Oceanus Procellarum',
    subtitle: 'Apollo Frontier Vacuum Basin',
    description: 'Stark regolith, deep black starfield, high-contrast shadows, and low lunar gravity (1.62 m/s²).',
    skyColor: 0x030306,
    fogColor: 0x080a0f,
    fogDensity: 0.0018,
    sunColor: 0xffffff,
    sunIntensity: 3.0,
    ambientColor: 0x1e293b,
    ambientIntensity: 0.4,
    groundColor: 0x334155,
    cliffColor: 0x1e293b,
    accentColor: '#38bdf8',
    secondaryColor: '#a855f7',
    gravity: 1.62,
    atmosphereName: 'Hard Vacuum (0.00 atm)',
  },
};

export interface TerrainTrackData {
  trackType: TrackType;
  envType: EnvironmentType;
  routeCurve: THREE.CatmullRomCurve3;
  trackLength: number;
  terrainMesh: THREE.Mesh;
  roadMesh: THREE.Mesh;
  guideMarkersGroup: THREE.Group;
  cliffsMesh?: THREE.Mesh;
  checkpoints: CheckpointData[];
  checkpointMeshes: THREE.Group[];
  obstacles: ObstacleData[];
  obstacleMeshes: THREE.Group[];
  skyGroup: THREE.Group;
  getTerrainHeight: (x: number, z: number) => number;
  getTerrainNormal: (x: number, z: number) => THREE.Vector3;
}

// Procedural multi-frequency bump and noise generator
function terrainNoise(x: number, z: number): number {
  const n1 = Math.sin(x * 0.045 + z * 0.035) * 1.8;
  const n2 = Math.cos(x * 0.09 - z * 0.075) * 0.9;
  const n3 = Math.sin(x * 0.22 + z * 0.18) * 0.35; // high-frequency gravel bump
  const n4 = Math.cos(x * 0.45 - z * 0.4) * 0.15;  // micro-roughness
  return n1 + n2 + n3 + n4;
}

/**
 * Builds the Point-to-Point Track:
 * Canyon Gorge or Hilly Ridge with rough bumpy terrain and checkpoints moving along the route.
 */
export function buildTerrainTrack(trackType: TrackType, envType: EnvironmentType): TerrainTrackData {
  const env = ENVIRONMENTS[envType];
  const isCanyon = trackType === 'canyon';

  // 1. Define Point-to-Point Spline Waypoints (NOT a loop)
  // Length is ~2.2km to 2.4km from Start to Finish
  const canyonWaypoints = [
    new THREE.Vector3(0, 4, 0),         // Start Line
    new THREE.Vector3(40, 6, -200),     // Canyon Entrance
    new THREE.Vector3(120, 12, -450),   // High Canyon Pass
    new THREE.Vector3(260, 4, -720),    // S-Curve between Towers
    new THREE.Vector3(210, -6, -980),   // Deep Fissure Descent
    new THREE.Vector3(60, -12, -1250),  // Rocky Riverbed Gorge
    new THREE.Vector3(-110, -4, -1500), // Narrow Chasm Hairpin
    new THREE.Vector3(-240, 8, -1720),  // Ascending Scree Slope
    new THREE.Vector3(-310, 16, -1950), // Upper Gorge Straight
    new THREE.Vector3(-380, 22, -2200), // Extraction Finish Gateway
  ];

  const ridgeWaypoints = [
    new THREE.Vector3(0, 10, 0),        // Start Highland Gate
    new THREE.Vector3(60, 18, -220),    // First Crest Jump
    new THREE.Vector3(160, 12, -460),   // Ridge Saddle Dip
    new THREE.Vector3(280, 28, -720),   // High Pinnacle Peak
    new THREE.Vector3(390, 20, -990),   // Rollercoaster Undulation
    new THREE.Vector3(460, 32, -1260),  // Crest Launch Ramp
    new THREE.Vector3(420, 18, -1520),  // Crater Rim Edge
    new THREE.Vector3(280, 24, -1780),  // Winding Ridge Spire
    new THREE.Vector3(140, 14, -2040),  // Downhill Valley Run
    new THREE.Vector3(20, 8, -2320),    // Outpost Finish Line
  ];

  const waypoints = isCanyon ? canyonWaypoints : ridgeWaypoints;
  const routeCurve = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.2);
  const trackLength = routeCurve.getLength();

  // 2. Pre-sample spline into 600 fine segments for exact, continuous O(1) projection
  const segmentCount = 600;
  const splinePts = routeCurve.getPoints(segmentCount);

  interface SplineSegment {
    a: THREE.Vector3;
    b: THREE.Vector3;
    dx: number;
    dz: number;
    lenSq: number;
    minZ: number;
    maxZ: number;
  }

  const segments: SplineSegment[] = [];
  for (let i = 0; i < splinePts.length - 1; i++) {
    const a = splinePts[i];
    const b = splinePts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    segments.push({
      a,
      b,
      dx,
      dz,
      lenSq: dx * dx + dz * dz,
      minZ: Math.min(a.z, b.z),
      maxZ: Math.max(a.z, b.z),
    });
  }

  // Z-bin spatial hash for fast O(1) segment query
  const binZMin = -2600;
  const binZMax = 100;
  const binSize = 30;
  const numBins = Math.ceil((binZMax - binZMin) / binSize) + 1;
  const zBins: number[][] = Array.from({ length: numBins }, () => []);

  segments.forEach((seg, idx) => {
    const startBin = Math.max(0, Math.floor((seg.minZ - 50 - binZMin) / binSize));
    const endBin = Math.min(numBins - 1, Math.floor((seg.maxZ + 50 - binZMin) / binSize));
    for (let b = startBin; b <= endBin; b++) {
      zBins[b].push(idx);
    }
  });

  const getClosestPointOnSpline = (x: number, z: number) => {
    const binIdx = Math.max(0, Math.min(numBins - 1, Math.floor((z - binZMin) / binSize)));
    const candidateIndices = zBins[binIdx];
    let minDistSq = Infinity;
    let closestSplineY = 0;

    const list = candidateIndices && candidateIndices.length > 0 ? candidateIndices : null;
    const count = list ? list.length : segments.length;

    for (let i = 0; i < count; i++) {
      const segIdx = list ? list[i] : i;
      const seg = segments[segIdx];
      const u = (x - seg.a.x) * seg.dx + (z - seg.a.z) * seg.dz;
      const t = Math.max(0, Math.min(1, u / seg.lenSq));
      const projX = seg.a.x + t * seg.dx;
      const projZ = seg.a.z + t * seg.dz;
      const distSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestSplineY = seg.a.y + t * (seg.b.y - seg.a.y);
      }
    }

    return {
      lateralDist: Math.sqrt(minDistSq),
      closestSplineY,
    };
  };

  // 3. Continuous Analytical Terrain Height Function
  // Evaluated for 3D mesh vertices AND real-time rover physics (wheels/suspension)
  const getTerrainHeight = (x: number, z: number): number => {
    const { lateralDist, closestSplineY } = getClosestPointOnSpline(x, z);
    const bump = terrainNoise(x, z);

    if (isCanyon) {
      // Canyon Gorge: Wide 34m road corridor (half-width 17m)
      const floorHalfWidth = 17.0;
      if (lateralDist <= floorHalfWidth) {
        // Track bed: smooth, slight gravel bump
        return closestSplineY + bump * 0.4;
      } else {
        // Canyon wall rise: smooth quadratic embankment curving upward into towering cliffs
        const wallOffset = lateralDist - floorHalfWidth;
        const wallElevation = Math.min(75, (wallOffset * 0.22) * (wallOffset * 0.22) * 2.6 + wallOffset * 1.0);
        const wallNoise = Math.sin(x * 0.05 + wallOffset * 0.15) * 3.0 + Math.cos(z * 0.05) * 2.0;
        return closestSplineY + bump * 0.25 + wallElevation + wallNoise;
      }
    } else {
      // Hilly Ridge: 34m wide ridge corridor with rolling bumps and gentle mountain side slopes
      const ridgeHalfWidth = 17.0;
      if (lateralDist <= ridgeHalfWidth) {
        return closestSplineY + bump * 0.5;
      } else {
        const dropOffset = lateralDist - ridgeHalfWidth;
        const dropElevation = -(dropOffset * 0.2) * (dropOffset * 0.2) * 1.6 - dropOffset * 0.8;
        return closestSplineY + bump * 0.3 + dropElevation;
      }
    }
  };

  // Terrain Normal Vector calculation via finite differences
  const getTerrainNormal = (x: number, z: number): THREE.Vector3 => {
    const eps = 0.5;
    const hL = getTerrainHeight(x - eps, z);
    const hR = getTerrainHeight(x + eps, z);
    const hD = getTerrainHeight(x, z - eps);
    const hU = getTerrainHeight(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
    return normal;
  };

  // 4. Generate Textured 3D Terrain Mesh
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  waypoints.forEach(wp => {
    minX = Math.min(minX, wp.x);
    maxX = Math.max(maxX, wp.x);
    minZ = Math.min(minZ, wp.z);
    maxZ = Math.max(maxZ, wp.z);
  });

  const pad = isCanyon ? 90 : 130;
  const widthX = (maxX - minX) + pad * 2;
  const depthZ = (maxZ - minZ) + pad * 2;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const segmentsX = 140;
  const segmentsZ = 160;

  const terrainGeo = new THREE.PlaneGeometry(widthX, depthZ, segmentsX, segmentsZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(centerX, 0, centerZ);

  // Displace plane vertices with getTerrainHeight
  const posAttr = terrainGeo.attributes.position;
  const colors: number[] = [];
  const baseCol = new THREE.Color(env.groundColor);
  const cliffCol = new THREE.Color(env.cliffColor);
  const highlightCol = new THREE.Color(env.accentColor);

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);

    // Color gradient based on elevation and slope
    const norm = getTerrainNormal(vx, vz);
    const slope = 1.0 - Math.max(0, norm.y);

    const vColor = baseCol.clone();
    if (slope > 0.35) {
      vColor.lerp(cliffCol, Math.min(1.0, (slope - 0.35) * 2.2));
    }
    if (vy > 20) {
      vColor.lerp(highlightCol, Math.min(0.3, (vy - 20) * 0.02));
    }
    colors.push(vColor.r, vColor.g, vColor.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  terrainGeo.computeBoundingBox();
  terrainGeo.computeBoundingSphere();

  const texType = `${envType}_${trackType}` as 'mars_canyon' | 'mars_ridge' | 'lunar_canyon' | 'lunar_ridge';
  const groundTexture = createTerrainTexture(texType);

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: groundTexture,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.frustumCulled = false;

  // 5. Dedicated High-Visibility 3D Road Ribbon Mesh along the entire route
  const roadWidth = 16.0;
  const roadSteps = 500;
  const roadGeo = new THREE.BufferGeometry();
  const roadVertices: number[] = [];
  const roadUVs: number[] = [];
  const roadIndices: number[] = [];
  const roadColors: number[] = [];

  for (let s = 0; s <= roadSteps; s++) {
    const t = s / roadSteps;
    const pt = routeCurve.getPointAt(t);
    const tan = routeCurve.getTangentAt(t).normalize();
    const up = getTerrainNormal(pt.x, pt.z);
    const binormal = new THREE.Vector3().crossVectors(tan, up).normalize();

    const halfW = roadWidth * 0.5;
    const leftPt = pt.clone().addScaledVector(binormal, -halfW);
    const rightPt = pt.clone().addScaledVector(binormal, halfW);

    leftPt.y = getTerrainHeight(leftPt.x, leftPt.z) + 0.08;
    rightPt.y = getTerrainHeight(rightPt.x, rightPt.z) + 0.08;
    const centerPt = pt.clone();
    centerPt.y = getTerrainHeight(centerPt.x, centerPt.z) + 0.10;

    roadVertices.push(leftPt.x, leftPt.y, leftPt.z);
    roadVertices.push(centerPt.x, centerPt.y, centerPt.z);
    roadVertices.push(rightPt.x, rightPt.y, rightPt.z);

    const vCoord = (t * trackLength) / 10.0;
    roadUVs.push(0.0, vCoord);
    roadUVs.push(0.5, vCoord);
    roadUVs.push(1.0, vCoord);

    roadColors.push(1, 1, 1, 1, 1, 1, 1, 1, 1);

    if (s < roadSteps) {
      const base = s * 3;
      roadIndices.push(base, base + 1, base + 4);
      roadIndices.push(base, base + 4, base + 3);
      roadIndices.push(base + 1, base + 2, base + 5);
      roadIndices.push(base + 1, base + 5, base + 4);
    }
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
  roadGeo.setAttribute('color', new THREE.Float32BufferAttribute(roadColors, 3));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();
  roadGeo.computeBoundingBox();
  roadGeo.computeBoundingSphere();

  const roadTex = createRoadTexture(envType === 'mars');
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.75,
    metalness: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -2.0,
    polygonOffsetUnits: -2.0,
    side: THREE.DoubleSide,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  roadMesh.frustumCulled = false;

  // 6. Roadside Guide Bollards & Directional Chevron Turn Warning Signs
  const guideMarkersGroup = new THREE.Group();
  const markerSpacing = 22; // meters between roadside guide bollards
  const numMarkers = Math.floor(trackLength / markerSpacing);

  const bollardPostGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8);
  const bollardPostMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  const beaconNormalMat = new THREE.MeshBasicMaterial({
    color: envType === 'mars' ? 0x38bdf8 : 0x34d399,
  });
  const beaconTurnMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
  });

  const beaconCapGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 8);

  for (let m = 1; m < numMarkers; m++) {
    const t = m / numMarkers;
    const pt = routeCurve.getPointAt(t);
    const tan = routeCurve.getTangentAt(t).normalize();
    const up = getTerrainNormal(pt.x, pt.z);
    const binormal = new THREE.Vector3().crossVectors(tan, up).normalize();

    // Check road curvature ahead to detect turns
    const nextT = Math.min(1.0, t + 0.015);
    const nextTan = routeCurve.getTangentAt(nextT).normalize();
    const turnAngle = tan.angleTo(nextTan);
    const isSharpTurn = turnAngle > 0.04;
    const capMat = isSharpTurn ? beaconTurnMat : beaconNormalMat;

    // Left and right bollard positions
    const leftPos = pt.clone().addScaledVector(binormal, -8.6);
    leftPos.y = getTerrainHeight(leftPos.x, leftPos.z);

    const rightPos = pt.clone().addScaledVector(binormal, 8.6);
    rightPos.y = getTerrainHeight(rightPos.x, rightPos.z);

    // Left bollard
    const leftBollard = new THREE.Group();
    leftBollard.position.copy(leftPos);
    const leftPost = new THREE.Mesh(bollardPostGeo, bollardPostMat);
    leftPost.position.y = 0.7;
    const leftCap = new THREE.Mesh(beaconCapGeo, capMat);
    leftCap.position.y = 1.5;
    leftBollard.add(leftPost, leftCap);
    guideMarkersGroup.add(leftBollard);

    // Right bollard
    const rightBollard = new THREE.Group();
    rightBollard.position.copy(rightPos);
    const rightPost = new THREE.Mesh(bollardPostGeo, bollardPostMat);
    rightPost.position.y = 0.7;
    const rightCap = new THREE.Mesh(beaconCapGeo, capMat);
    rightCap.position.y = 1.5;
    rightBollard.add(rightPost, rightCap);
    guideMarkersGroup.add(rightBollard);

    // On sharp turns: place a directional chevron warning sign on the outside of the bend
    if (isSharpTurn && m % 2 === 0) {
      const turnCross = new THREE.Vector3().crossVectors(tan, nextTan);
      const isTurningRight = turnCross.y < 0;
      const outerSignPos = isTurningRight
        ? pt.clone().addScaledVector(binormal, -9.8)
        : pt.clone().addScaledVector(binormal, 9.8);
      outerSignPos.y = getTerrainHeight(outerSignPos.x, outerSignPos.z) + 1.2;

      const signBoardGeo = new THREE.BoxGeometry(2.4, 1.2, 0.15);
      const signBoardMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
      });
      const signMesh = new THREE.Mesh(signBoardGeo, signBoardMat);
      signMesh.position.copy(outerSignPos);
      signMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().negate());
      guideMarkersGroup.add(signMesh);
    }
  }

  // 4. Sequential Checkpoints along Route
  const checkpoints: CheckpointData[] = [];
  const checkpointMeshes: THREE.Group[] = [];

  const totalCPs = TRACK_CONFIGS[trackType].totalCheckpoints;

  for (let c = 0; c < totalCPs; c++) {
    const t = c / (totalCPs - 1); // 0.0 (Start) to 1.0 (Finish)
    const pos = routeCurve.getPointAt(t);
    pos.y = getTerrainHeight(pos.x, pos.z);

    const tangent = routeCurve.getTangentAt(t).normalize();
    const up = getTerrainNormal(pos.x, pos.z);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

    const isStart = c === 0;
    const isFinish = c === totalCPs - 1;
    const cpGroup = new THREE.Group();
    cpGroup.position.copy(pos);

    const rotMat = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
    cpGroup.quaternion.setFromRotationMatrix(rotMat);

    // Archway Width & Radius
    const archWidth = 14.0;
    const archHeight = 8.5;

    // Industrial Planetary Truss Gateway
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3,
    });

    const energyMat = new THREE.MeshStandardMaterial({
      color: isFinish ? 0x22c55e : (isStart ? 0x38bdf8 : 0xf59e0b),
      emissive: isFinish ? 0x22c55e : (isStart ? 0x38bdf8 : 0xf59e0b),
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
    });

    // Left & Right Support Towers
    const pylonGeo = new THREE.BoxGeometry(1.4, archHeight, 1.4);
    const pylonLeft = new THREE.Mesh(pylonGeo, trussMat);
    pylonLeft.position.set(-archWidth * 0.5, archHeight * 0.5, 0);
    pylonLeft.castShadow = true;
    cpGroup.add(pylonLeft);

    const pylonRight = new THREE.Mesh(pylonGeo, trussMat);
    pylonRight.position.set(archWidth * 0.5, archHeight * 0.5, 0);
    pylonRight.castShadow = true;
    cpGroup.add(pylonRight);

    // Crossbar Header
    const crossbarGeo = new THREE.BoxGeometry(archWidth + 2.0, 1.6, 1.8);
    const crossbar = new THREE.Mesh(crossbarGeo, trussMat);
    crossbar.position.set(0, archHeight + 0.6, 0);
    crossbar.castShadow = true;
    cpGroup.add(crossbar);

    // Glowing Holographic Energy Gate Ring
    const ringGeo = new THREE.TorusGeometry(archWidth * 0.44, 0.25, 8, 24);
    const ringMesh = new THREE.Mesh(ringGeo, energyMat);
    ringMesh.position.set(0, archHeight * 0.5, 0);
    cpGroup.add(ringMesh);

    // Skyward Beacon Laser (Points into sky so player can easily locate checkpoints from distance)
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.4, 180, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: isFinish ? 0x4ade80 : (isStart ? 0x60a5fa : 0xfbbf24),
      transparent: true,
      opacity: 0.45,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 90, 0);
    cpGroup.add(beam);

    // Checkpoint Sign Text / Label Plate
    const signGeo = new THREE.PlaneGeometry(8, 1.8);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = isFinish ? '#22c55e' : (isStart ? '#38bdf8' : '#f59e0b');
    sCtx.lineWidth = 8;
    sCtx.strokeRect(4, 4, 504, 120);

    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 52px system-ui, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    const labelStr = isStart ? 'EXPEDITION START' : (isFinish ? 'FINISH LINE' : `CHECKPOINT ${c}`);
    sCtx.fillText(labelStr, 256, 64);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, archHeight + 0.6, 1.0);
    cpGroup.add(signMesh);

    checkpointMeshes.push(cpGroup);

    checkpoints.push({
      index: c,
      label: labelStr,
      position: [pos.x, pos.y + 2.0, pos.z],
      quaternion: [cpGroup.quaternion.x, cpGroup.quaternion.y, cpGroup.quaternion.z, cpGroup.quaternion.w],
      radius: archWidth * 0.55,
      distanceAlongRoute: t * trackLength,
      passedPlayer: false,
      passedAI: false,
    });
  }

  // 5. Obstacles: Boulders, Jagged Rocks, Spire Outcrops
  const obstacles: ObstacleData[] = [];
  const obstacleMeshes: THREE.Group[] = [];

  const rockMat = new THREE.MeshStandardMaterial({
    color: env.cliffColor,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });

  const numObs = 32;
  for (let o = 0; o < numObs; o++) {
    // Avoid placing directly on checkpoints
    const t = 0.05 + (o / numObs) * 0.9 + (Math.sin(o * 3.7) * 0.015);
    const pt = routeCurve.getPointAt(t);
    const tangent = routeCurve.getTangentAt(t).normalize();
    const up = getTerrainNormal(pt.x, pt.z);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Lateral offset: place obstacles on the outer verges/slopes, keeping the 16m central track open
    const side = (o % 3 === 0) ? (Math.random() > 0.5 ? 1 : -1) : (o % 2 === 0 ? 1 : -1);
    const lateralDist = side * (10.5 + (o % 4) * 2.5);

    const obsPos = pt.clone().addScaledVector(binormal, lateralDist);
    obsPos.y = getTerrainHeight(obsPos.x, obsPos.z);

    const obsGroup = new THREE.Group();
    obsGroup.position.copy(obsPos);

    let radius = 2.4;
    const typeRoll = o % 3;

    if (typeRoll === 0) {
      // Chunky Planetary Boulder
      const boulderGeo = new THREE.DodecahedronGeometry(2.2, 1);
      const boulder = new THREE.Mesh(boulderGeo, rockMat);
      boulder.scale.set(1.2 + (o % 3) * 0.3, 0.9, 1.4);
      boulder.rotation.set(o * 0.4, o * 0.7, 0);
      boulder.position.y = 1.2;
      boulder.castShadow = true;
      obsGroup.add(boulder);
      radius = 2.5;
    } else if (typeRoll === 1) {
      // Jagged Basalt Spire Needle
      const spireGeo = new THREE.ConeGeometry(1.6, 9.0, 6);
      const spire = new THREE.Mesh(spireGeo, rockMat);
      spire.rotation.z = (side > 0 ? -0.2 : 0.2);
      spire.position.y = 4.0;
      spire.castShadow = true;
      obsGroup.add(spire);
      radius = 2.2;
    } else {
      // Rock cluster
      for (let r = 0; r < 3; r++) {
        const smGeo = new THREE.DodecahedronGeometry(1.3, 1);
        const sm = new THREE.Mesh(smGeo, rockMat);
        sm.position.set((r - 1) * 1.5, 0.8, (r % 2) * 1.2);
        sm.castShadow = true;
        obsGroup.add(sm);
      }
      radius = 2.8;
    }

    obstacleMeshes.push(obsGroup);
    obstacles.push({
      id: o,
      type: typeRoll === 0 ? 'boulder' : (typeRoll === 1 ? 'spire' : 'crater_rock'),
      position: [obsPos.x, obsPos.y, obsPos.z],
      rotation: [obsGroup.rotation.x, obsGroup.rotation.y, obsGroup.rotation.z],
      scale: [1, 1, 1],
      radius,
    });
  }

  // 6. Sky & Celestial Planetary Vista
  const skyGroup = new THREE.Group();

  if (envType === 'mars') {
    // Martian Atmosphere Dome
    const skyDomeGeo = new THREE.SphereGeometry(2200, 24, 16);
    const skyDomeMat = new THREE.MeshBasicMaterial({
      color: 0x8a391e,
      side: THREE.BackSide,
    });
    skyGroup.add(new THREE.Mesh(skyDomeGeo, skyDomeMat));

    // Phobos & Deimos Moons
    const phobosGeo = new THREE.DodecahedronGeometry(35, 1);
    const phobosMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const phobos = new THREE.Mesh(phobosGeo, phobosMat);
    phobos.position.set(500, 700, -1200);
    skyGroup.add(phobos);

    const deimosGeo = new THREE.DodecahedronGeometry(18, 1);
    const deimos = new THREE.Mesh(deimosGeo, phobosMat);
    deimos.position.set(-700, 850, -1400);
    skyGroup.add(deimos);
  } else {
    // Lunar Sky: Pitch Black Deep Space + Twinkling Stars
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    const starColors: number[] = [];

    for (let s = 0; s < starCount; s++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2000;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 60;
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPos.push(x, y, z);
      const bright = 0.55 + Math.random() * 0.45;
      starColors.push(bright, bright, bright * 1.1);
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    });
    skyGroup.add(new THREE.Points(starGeo, starMat));

    // Earth in Lunar Sky
    const earthGeo = new THREE.SphereGeometry(90, 32, 24);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(-450, 600, -1600);
    skyGroup.add(earth);
  }

  return {
    trackType,
    envType,
    routeCurve,
    trackLength,
    terrainMesh,
    roadMesh,
    guideMarkersGroup,
    checkpoints,
    checkpointMeshes,
    obstacles,
    obstacleMeshes,
    skyGroup,
    getTerrainHeight,
    getTerrainNormal,
  };
}
