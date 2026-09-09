import * as THREE from 'three';
import {
  AIDifficulty,
  CameraView,
  CheckpointData,
  EnvironmentType,
  GameStatus,
  RaceResults,
  RoverState,
  TrackType,
} from '../types';
import { createLandRover, RoverMeshGroup } from './roverModel';
import { ParticleFX } from './particleSystem';
import { sound } from './sound';
import { buildTerrainTrack, ENVIRONMENTS, TerrainTrackData, TRACK_CONFIGS } from './terrainTrack';

export interface GameInputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particleFX: ParticleFX;

  // Track & Environment
  private trackType: TrackType = 'canyon';
  private envType: EnvironmentType = 'mars';
  private trackData: TerrainTrackData | null = null;
  private dirLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Rover 3D models
  private playerRover: RoverMeshGroup | null = null;
  private aiRover: RoverMeshGroup | null = null;

  // Game & Physics state
  private status: GameStatus = 'menu';
  private difficulty: AIDifficulty = 'pilot';
  private cameraView: CameraView = 'third';
  private resizeObserver: ResizeObserver | null = null;

  // Player rover physical state
  public playerState: RoverState = {
    progress: 0,
    routeDistance: 0,
    currentCheckpoint: 0,
    totalCheckpoints: 10,
    speed: 0,
    speedMps: 0,
    maxSpeed: 140, // km/h (speeded up for thrill)
    boost: 100,
    isBoosting: false,
    durability: 100,
    suspensionCompression: [0.5, 0.5, 0.5, 0.5],
    isAirborne: false,
    airTime: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    steering: 0,
    checkpointsPassed: 0,
    collisions: 0,
    position: [0, 0, 0],
    nextCheckpointDir: [0, 0, -1],
    distToNextCheckpoint: 0,
  };

  // AI rover physical state
  public aiState: RoverState = {
    progress: 0,
    routeDistance: 0,
    currentCheckpoint: 0,
    totalCheckpoints: 10,
    speed: 0,
    speedMps: 0,
    maxSpeed: 136,
    boost: 100,
    isBoosting: false,
    durability: 100,
    suspensionCompression: [0.5, 0.5, 0.5, 0.5],
    isAirborne: false,
    airTime: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    steering: 0,
    checkpointsPassed: 0,
    collisions: 0,
    position: [0, 0, 0],
    nextCheckpointDir: [0, 0, -1],
    distToNextCheckpoint: 0,
  };

  // Dynamic physics vectors
  private playerPos = new THREE.Vector3();
  private playerVel = new THREE.Vector3();
  private playerHeading = 0; // Yaw angle in radians

  private aiPos = new THREE.Vector3();
  private aiVel = new THREE.Vector3();
  private aiHeading = 0;

  // Wheel spin angles
  private playerWheelSpin = 0;
  private aiWheelSpin = 0;

  // Timing
  private raceTime: number = 0;
  private countdownTimer: number = 3.99;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private topSpeedRecorded: number = 0;
  private totalAirTimeRecorded: number = 0;

  // Inputs
  public inputs: GameInputState = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    boost: false,
  };

  // Event callbacks
  public onStateUpdate?: (
    player: RoverState,
    ai: RoverState,
    rank: 1 | 2,
    leadDistMeters: number,
    raceTime: number
  ) => void;
  public onFinish?: (results: RaceResults) => void;
  public onCountdown?: (count: number) => void;
  public onCheckpointHit?: (cpIndex: number, total: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Calculate safe initial dimensions
    const width = Math.max(1, container.clientWidth || window.innerWidth || 800);
    const height = Math.max(1, container.clientHeight || window.innerHeight || 600);

    // Initialize Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Direct styles to ensure canvas fills container perfectly
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    container.appendChild(this.renderer.domElement);

    // Three.js Scene
    this.scene = new THREE.Scene();

    // Perspective Camera with valid aspect
    this.camera = new THREE.PerspectiveCamera(
      62,
      width / height,
      0.2,
      3500
    );

    // Particle FX
    this.particleFX = new ParticleFX();
    this.scene.add(this.particleFX.group);

    // Window and Container Resize Handlers
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    } catch {
      // Fallback if ResizeObserver is unsupported
    }

    // Start Simulation Loop
    this.animate = this.animate.bind(this);
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Load and initialize Track and Environment
   */
  public loadTrack(trackType: TrackType, envType: EnvironmentType) {
    this.trackType = trackType;
    this.envType = envType;

    // Clean up previous scene objects
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
    }
    this.scene.add(this.particleFX.group);

    const env = ENVIRONMENTS[envType];

    // Environment Fog & Sky
    this.scene.background = new THREE.Color(env.skyColor);
    this.scene.fog = new THREE.FogExp2(env.fogColor, env.fogDensity);

    // Ambient Lighting to guarantee surfaces are clearly visible from all angles
    const ambientLight = new THREE.AmbientLight(env.ambientColor, 0.75);
    this.scene.add(ambientLight);

    // Hemisphere Lighting
    this.hemiLight = new THREE.HemisphereLight(env.sunColor, env.groundColor, env.ambientIntensity + 0.35);
    this.scene.add(this.hemiLight);

    // Directional sunlight with high dynamic range
    this.dirLight = new THREE.DirectionalLight(env.sunColor, env.sunIntensity);
    this.dirLight.position.set(200, 350, 150);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 1000;
    this.dirLight.shadow.bias = -0.0004;
    const sCam = 140;
    this.dirLight.shadow.camera.left = -sCam;
    this.dirLight.shadow.camera.right = sCam;
    this.dirLight.shadow.camera.top = sCam;
    this.dirLight.shadow.camera.bottom = -sCam;
    this.scene.add(this.dirLight);

    // Build Point-to-Point Terrain Track
    this.trackData = buildTerrainTrack(trackType, envType);
    this.scene.add(this.trackData.terrainMesh);
    this.scene.add(this.trackData.roadMesh);
    this.scene.add(this.trackData.guideMarkersGroup);
    this.scene.add(this.trackData.skyGroup);

    // Add Checkpoint Meshes
    this.trackData.checkpointMeshes.forEach((mesh) => this.scene.add(mesh));

    // Add Obstacle Meshes
    this.trackData.obstacleMeshes.forEach((mesh) => this.scene.add(mesh));

    // Build Rovers
    this.playerRover = createLandRover(true);
    this.aiRover = createLandRover(false);
    this.scene.add(this.playerRover);
    this.scene.add(this.aiRover);

    // Setup initial positions
    this.resetPositions();
  }

  public setDifficulty(diff: AIDifficulty) {
    this.difficulty = diff;
    const multipliers = { cadet: 0.88, pilot: 1.0, ace: 1.12 };
    this.aiState.maxSpeed = 136 * multipliers[diff];
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public startRace() {
    this.resetPositions();
    this.status = 'countdown';
    this.countdownTimer = 3.99;
    this.raceTime = 0;
    this.topSpeedRecorded = 0;
    this.totalAirTimeRecorded = 0;
  }

  public pauseRace() {
    if (this.status === 'racing') {
      this.status = 'paused';
    } else if (this.status === 'paused') {
      this.status = 'racing';
      sound.startEngine();
    }
  }

  public resetPositions() {
    if (!this.trackData || !this.playerRover || !this.aiRover) return;
    const curve = this.trackData.routeCurve;

    // Initial Start Gate transform
    const startPt = curve.getPointAt(0);
    const startTan = curve.getTangentAt(0).normalize();
    const up = this.trackData.getTerrainNormal(startPt.x, startPt.z);
    const binormal = new THREE.Vector3().crossVectors(startTan, up).normalize();

    this.playerHeading = Math.atan2(startTan.x, startTan.z);
    this.aiHeading = this.playerHeading;

    // Place Player on left grid, AI on right grid
    this.playerPos.copy(startPt).addScaledVector(binormal, -3.2);
    this.playerPos.y = this.trackData.getTerrainHeight(this.playerPos.x, this.playerPos.z) + 0.45;
    this.playerVel.set(0, 0, 0);

    this.aiPos.copy(startPt).addScaledVector(binormal, 3.2);
    this.aiPos.y = this.trackData.getTerrainHeight(this.aiPos.x, this.aiPos.z) + 0.45;
    this.aiVel.set(0, 0, 0);

    // Reset Player State
    this.playerState.progress = 0;
    this.playerState.routeDistance = 0;
    this.playerState.currentCheckpoint = 1; // target checkpoint 1 after start line
    this.playerState.totalCheckpoints = this.trackData.checkpoints.length;
    this.playerState.speed = 0;
    this.playerState.speedMps = 0;
    this.playerState.boost = 100;
    this.playerState.isBoosting = false;
    this.playerState.durability = 100;
    this.playerState.isAirborne = false;
    this.playerState.airTime = 0;
    this.playerState.roll = 0;
    this.playerState.pitch = 0;
    this.playerState.checkpointsPassed = 0;
    this.playerState.collisions = 0;
    this.playerState.position = [this.playerPos.x, this.playerPos.y, this.playerPos.z];

    // Reset AI State
    this.aiState.progress = 0;
    this.aiState.routeDistance = 0;
    this.aiState.currentCheckpoint = 1;
    this.aiState.totalCheckpoints = this.trackData.checkpoints.length;
    this.aiState.speed = 0;
    this.aiState.speedMps = 0;
    this.aiState.boost = 100;
    this.aiState.isBoosting = false;
    this.aiState.durability = 100;
    this.aiState.isAirborne = false;
    this.aiState.airTime = 0;
    this.aiState.roll = 0;
    this.aiState.pitch = 0;
    this.aiState.checkpointsPassed = 0;
    this.aiState.collisions = 0;
    this.aiState.position = [this.aiPos.x, this.aiPos.y, this.aiPos.z];

    // Reset checkpoints
    this.trackData.checkpoints.forEach((cp) => {
      cp.passedPlayer = false;
      cp.passedAI = false;
    });

    // Update rover meshes
    this.playerRover.position.copy(this.playerPos);
    this.playerRover.rotation.set(0, this.playerHeading, 0);

    this.aiRover.position.copy(this.aiPos);
    this.aiRover.rotation.set(0, this.aiHeading, 0);

    // Initial camera
    this.camera.position.copy(this.playerPos).addScaledVector(startTan, -11).add(new THREE.Vector3(0, 4.5, 0));
    this.camera.lookAt(this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)));
  }

  private handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth || 800);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight || 600);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Verify container dimensions and aspect ratio validity
    const curW = this.container.clientWidth || window.innerWidth;
    const curH = this.container.clientHeight || window.innerHeight;
    if (curW > 0 && curH > 0) {
      if (isNaN(this.camera.aspect) || Math.abs(this.camera.aspect - curW / curH) > 0.005) {
        this.handleResize();
      }
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.08);
    this.lastTime = now;

    if (this.status === 'menu') {
      // Gentle cinematic showcase orbit around starting line rover
      if (this.playerRover) {
        const angle = (now * 0.0004);
        const radius = 10.5;
        this.camera.position.set(
          this.playerPos.x + Math.sin(angle) * radius,
          this.playerPos.y + 3.2,
          this.playerPos.z + Math.cos(angle) * radius
        );
        this.camera.lookAt(this.playerPos.clone().add(new THREE.Vector3(0, 1.1, 0)));
      }
    } else if (this.status === 'countdown') {
      this.updateCountdown(dt);
    } else if (this.status === 'racing') {
      this.updatePhysics(dt);
    } else if (this.status === 'finished') {
      this.updateFinishCinematic(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateCountdown(dt: number) {
    const prevCount = Math.ceil(this.countdownTimer);
    this.countdownTimer -= dt;
    const newCount = Math.ceil(this.countdownTimer);

    if (newCount !== prevCount && newCount >= 0) {
      sound.playCountdownBeep(newCount);
      if (this.onCountdown) this.onCountdown(newCount);
    }

    // Dynamic camera view on starting grid transitioning directly into chase view
    if (this.playerRover) {
      const forward = new THREE.Vector3(Math.sin(this.playerHeading), 0, Math.cos(this.playerHeading));
      if (this.countdownTimer > 1.2) {
        const angle = (3.99 - this.countdownTimer) * 0.7;
        const radius = 9.0;
        this.camera.position.set(
          this.playerPos.x + Math.sin(angle) * radius,
          this.playerPos.y + 3.0,
          this.playerPos.z + Math.cos(angle) * radius
        );
        this.camera.lookAt(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)));
      } else {
        // Final seconds: swing smoothly to rear chase position looking down the track
        const rearTarget = this.playerPos.clone().addScaledVector(forward, -7.5).add(new THREE.Vector3(0, 3.2, 0));
        this.camera.position.lerp(rearTarget, Math.min(1, dt * 6.5));
        this.camera.lookAt(this.playerPos.clone().addScaledVector(forward, 6.0).add(new THREE.Vector3(0, 1.1, 0)));
      }
    }

    if (this.countdownTimer <= 0) {
      this.status = 'racing';
      sound.startEngine();
      if (this.onCountdown) this.onCountdown(-1); // Racing active
    }
  }

  /**
   * Main Physics Simulation
   */
  private updatePhysics(dt: number) {
    if (!this.trackData || !this.playerRover || !this.aiRover) return;

    this.raceTime += dt;
    const env = ENVIRONMENTS[this.envType];
    const gravity = env.gravity; // 3.72 on Mars, 1.62 on Moon

    // ==========================================
    // 1. PLAYER ROVER OFF-ROAD PHYSICS
    // ==========================================
    const p = this.playerState;

    // Boost Handling
    if (this.inputs.boost && p.boost > 0) {
      p.isBoosting = true;
      p.boost = Math.max(0, p.boost - dt * 25);
      if (Math.random() < 0.15) sound.playBoostSound();
    } else {
      p.isBoosting = false;
      p.boost = Math.min(100, p.boost + dt * 7.5);
    }

    // Forward / Reverse Engine Drive
    const currentSpeedMps = this.playerVel.length();
    const targetMaxMps = (p.isBoosting ? p.maxSpeed * 1.35 : p.maxSpeed) / 3.6; // ~38 to 52 m/s
    const driveAccel = (p.isBoosting ? 36 : 24); // m/s^2

    // Direction vector of rover
    const forwardVec = new THREE.Vector3(Math.sin(this.playerHeading), 0, Math.cos(this.playerHeading));
    const rightVec = new THREE.Vector3(Math.cos(this.playerHeading), 0, -Math.sin(this.playerHeading));

    // Steering input with speed-sensitive response
    const steerSpeed = 2.4;
    const maxSteerAngle = 0.55; // ~31 degrees
    if (this.inputs.left) {
      p.steering = Math.max(-maxSteerAngle, p.steering - steerSpeed * dt);
    } else if (this.inputs.right) {
      p.steering = Math.min(maxSteerAngle, p.steering + steerSpeed * dt);
    } else {
      p.steering += (0 - p.steering) * Math.min(1, dt * 6.5);
    }

    // Apply steering to heading (drift / yaw turn)
    if (currentSpeedMps > 0.5) {
      const forwardVelocity = this.playerVel.dot(forwardVec);
      const sign = forwardVelocity >= 0 ? 1 : -1;
      this.playerHeading += p.steering * dt * (currentSpeedMps / targetMaxMps) * 2.8 * sign;
    }

    // Drive Forces
    if (this.inputs.throttle) {
      this.playerVel.addScaledVector(forwardVec, driveAccel * dt);
    } else if (this.inputs.brake) {
      // Braking or Reverse
      this.playerVel.addScaledVector(forwardVec, -driveAccel * 1.2 * dt);
    }

    // Rolling Resistance & Aerodynamic Drag
    const dragCoeff = 0.018;
    this.playerVel.x *= Math.max(0, 1 - (0.05 + dragCoeff * currentSpeedMps) * dt);
    this.playerVel.z *= Math.max(0, 1 - (0.05 + dragCoeff * currentSpeedMps) * dt);

    // Tire Lateral Grip (Slip angle vs lateral friction)
    const lateralVel = this.playerVel.dot(rightVec);
    const tireGrip = 0.88; // Controlled drift on gravel/sand
    this.playerVel.addScaledVector(rightVec, -lateralVel * tireGrip * dt * 10);

    // Clamp max forward speed
    if (this.playerVel.length() > targetMaxMps) {
      this.playerVel.setLength(targetMaxMps);
    }

    // Integrate Position
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;

    // Sample Terrain Underneath 4 Rover Wheels
    const wb = 1.0; // half wheelbase
    const tw = 0.9; // half trackwidth
    const flPos = this.playerPos.clone().addScaledVector(forwardVec, wb).addScaledVector(rightVec, -tw);
    const frPos = this.playerPos.clone().addScaledVector(forwardVec, wb).addScaledVector(rightVec, tw);
    const rlPos = this.playerPos.clone().addScaledVector(forwardVec, -wb).addScaledVector(rightVec, -tw);
    const rrPos = this.playerPos.clone().addScaledVector(forwardVec, -wb).addScaledVector(rightVec, tw);

    const hFL = this.trackData.getTerrainHeight(flPos.x, flPos.z);
    const hFR = this.trackData.getTerrainHeight(frPos.x, frPos.z);
    const hRL = this.trackData.getTerrainHeight(rlPos.x, rlPos.z);
    const hRR = this.trackData.getTerrainHeight(rrPos.x, rrPos.z);

    const groundY = (hFL + hFR + hRL + hRR) / 4 + 0.45; // Wheel radius center offset

    // Vertical Dynamics & Airborne Jumps
    if (this.playerPos.y > groundY + 0.25) {
      // Airborne! Gravity pulls rover down
      p.isAirborne = true;
      p.airTime += dt;
      this.totalAirTimeRecorded += dt;
      this.playerVel.y -= gravity * 2.8 * dt;
      // Cap maximum upward climb velocity to prevent sky launching
      this.playerVel.y = Math.max(-28, Math.min(8.5, this.playerVel.y));
      this.playerPos.y += this.playerVel.y * dt;

      // Soft restorative clamp: keep rover within realistic height window of terrain
      if (this.playerPos.y > groundY + 8.0) {
        this.playerPos.y = groundY + 8.0;
        this.playerVel.y = -4.0;
      }
    } else {
      // On the ground
      if (p.isAirborne && this.playerVel.y < -3.0) {
        // Hard touchdown landing from jump!
        sound.playSuspensionThud(Math.min(1.0, Math.abs(this.playerVel.y) / 10));
        this.particleFX.emitTireDust(this.playerPos, this.envType === 'mars', 2.0);
      }
      p.isAirborne = false;
      p.airTime = 0;
      this.playerPos.y = groundY;
      this.playerVel.y = 0;

      // Tire Dust Kickup while driving on rough terrain
      if (currentSpeedMps > 4.0 && Math.random() < 0.45) {
        this.particleFX.emitTireDust(rlPos, this.envType === 'mars', currentSpeedMps / targetMaxMps);
        this.particleFX.emitTireDust(rrPos, this.envType === 'mars', currentSpeedMps / targetMaxMps);
      }
    }

    // Dynamic Pitch & Roll over bumpy terrain
    const terrainPitch = ((hRL + hRR) - (hFL + hFR)) / (wb * 2);
    const terrainRoll = ((hFL + hRL) - (hFR + hRR)) / (tw * 2);

    // Accel squat and cornering roll
    const accelPitch = this.inputs.throttle ? -0.06 : (this.inputs.brake ? 0.08 : 0);
    const cornerRoll = -p.steering * (currentSpeedMps / targetMaxMps) * 0.18;

    p.pitch += (terrainPitch + accelPitch - p.pitch) * Math.min(1, dt * 10);
    p.roll += (terrainRoll + cornerRoll - p.roll) * Math.min(1, dt * 10);
    p.yaw = this.playerHeading;

    // Suspension compression calculation
    p.suspensionCompression = [
      Math.min(1, Math.max(0, 0.5 + (hFL - groundY) * 0.5)),
      Math.min(1, Math.max(0, 0.5 + (hFR - groundY) * 0.5)),
      Math.min(1, Math.max(0, 0.5 + (hRL - groundY) * 0.5)),
      Math.min(1, Math.max(0, 0.5 + (hRR - groundY) * 0.5)),
    ];

    // Wheel spin rotation
    const wheelRollSpeed = currentSpeedMps / 0.45; // v / r
    this.playerWheelSpin += wheelRollSpeed * dt;

    // Update Rover 3D Mesh
    this.playerRover.position.copy(this.playerPos);
    this.playerRover.rotation.set(0, 0, 0);
    this.playerRover.rotation.y = this.playerHeading;
    this.playerRover.rotation.x = p.pitch;
    this.playerRover.rotation.z = p.roll;

    // Update wheels and front steering
    this.playerRover.userData.wheels.forEach((wGroup) => {
      wGroup.rotation.x = this.playerWheelSpin;
    });
    this.playerRover.userData.frontWheelSteerGroups.forEach((sGroup) => {
      sGroup.rotation.y = p.steering;
    });

    // Update thruster flame visuals
    this.playerRover.userData.thrusterFlames.forEach((flame) => {
      flame.scale.set(1, p.isBoosting ? 2.2 : 0.01, 1);
      (flame.material as THREE.MeshBasicMaterial).opacity = p.isBoosting ? 0.9 : 0;
    });
    if (this.playerRover.userData.boosterLight) {
      this.playerRover.userData.boosterLight.intensity = p.isBoosting ? 3.5 : 0;
    }

    // Telemetry Speeds
    p.speedMps = currentSpeedMps;
    p.speed = Math.round(currentSpeedMps * 3.6); // in km/h
    this.topSpeedRecorded = Math.max(this.topSpeedRecorded, p.speed);
    p.position = [this.playerPos.x, this.playerPos.y, this.playerPos.z];

    // Audio Engine Sound
    sound.updateEngine(p.speed / p.maxSpeed, p.isBoosting);

    // ==========================================
    // 2. COMPUTER OPPONENT (AI ROVER) LOGIC
    // ==========================================
    const ai = this.aiState;
    const aiTargetMaxMps = (ai.isBoosting ? ai.maxSpeed * 1.3 : ai.maxSpeed) / 3.6;

    // AI Route Navigation: smoothly lookahead along the spline curve
    const aiCurveT = Math.min(1.0, ai.progress + 0.02);
    const aiTargetPos = this.trackData.routeCurve.getPointAt(aiCurveT);
    // Keep AI in the right lane (offset +2.2m from center)
    const aiTangent = this.trackData.routeCurve.getTangentAt(aiCurveT).normalize();
    const aiUp = this.trackData.getTerrainNormal(aiTargetPos.x, aiTargetPos.z);
    const aiBinormal = new THREE.Vector3().crossVectors(aiTangent, aiUp).normalize();
    aiTargetPos.addScaledVector(aiBinormal, 2.2);

    // Vector towards target
    const toTarget = aiTargetPos.clone().sub(this.aiPos);
    const distToTarget = toTarget.length();
    const desiredHeading = Math.atan2(toTarget.x, toTarget.z);

    // Turn towards desired heading
    let angleDiff = desiredHeading - this.aiHeading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const aiSteerRate = (this.difficulty === 'ace' ? 3.4 : this.difficulty === 'pilot' ? 2.6 : 2.0);
    ai.steering = Math.max(-0.5, Math.min(0.5, angleDiff * 1.5));
    this.aiHeading += Math.max(-aiSteerRate * dt, Math.min(aiSteerRate * dt, angleDiff * aiSteerRate * dt));

    // AI Boost management
    if (ai.boost > 40 && (p.progress > ai.progress || distToTarget > 120)) {
      ai.isBoosting = true;
      ai.boost -= dt * 20;
    } else {
      ai.isBoosting = false;
      ai.boost = Math.min(100, ai.boost + dt * 8);
    }

    // AI Throttle
    const aiForwardVec = new THREE.Vector3(Math.sin(this.aiHeading), 0, Math.cos(this.aiHeading));
    const aiAccel = ai.isBoosting ? 32 : 22;
    this.aiVel.addScaledVector(aiForwardVec, aiAccel * dt);

    if (this.aiVel.length() > aiTargetMaxMps) {
      this.aiVel.setLength(aiTargetMaxMps);
    }
    this.aiVel.multiplyScalar(0.985); // drag

    this.aiPos.x += this.aiVel.x * dt;
    this.aiPos.z += this.aiVel.z * dt;

    // AI Terrain Height
    const aiGroundY = this.trackData.getTerrainHeight(this.aiPos.x, this.aiPos.z) + 0.45;
    if (this.aiPos.y > aiGroundY + 0.25) {
      this.aiVel.y -= gravity * 2.8 * dt;
      this.aiVel.y = Math.max(-28, Math.min(8.5, this.aiVel.y));
      this.aiPos.y += this.aiVel.y * dt;
      if (this.aiPos.y > aiGroundY + 8.0) {
        this.aiPos.y = aiGroundY + 8.0;
        this.aiVel.y = -4.0;
      }
    } else {
      this.aiPos.y = aiGroundY;
      this.aiVel.y = 0;
    }

    const aiSpeedMps = this.aiVel.length();
    ai.speedMps = aiSpeedMps;
    ai.speed = Math.round(aiSpeedMps * 3.6);
    this.aiWheelSpin += (aiSpeedMps / 0.45) * dt;

    // Update AI Mesh
    this.aiRover.position.copy(this.aiPos);
    this.aiRover.rotation.set(0, this.aiHeading, 0);

    this.aiRover.userData.wheels.forEach((wGroup) => {
      wGroup.rotation.x = this.aiWheelSpin;
    });
    this.aiRover.userData.frontWheelSteerGroups.forEach((sGroup) => {
      sGroup.rotation.y = ai.steering;
    });
    this.aiRover.userData.thrusterFlames.forEach((flame) => {
      flame.scale.set(1, ai.isBoosting ? 2.0 : 0.01, 1);
      (flame.material as THREE.MeshBasicMaterial).opacity = ai.isBoosting ? 0.9 : 0;
    });

    ai.position = [this.aiPos.x, this.aiPos.y, this.aiPos.z];

    // ==========================================
    // 3. CHECKPOINTS & ROUTE PROGRESS TRACKING
    // ==========================================
    this.updateCheckpoints();

    // ==========================================
    // 4. OBSTACLE COLLISION DETECTION
    // ==========================================
    this.checkObstacleCollisions(dt);

    // Keep directional sunlight centered on player for high resolution shadows
    if (this.dirLight) {
      this.dirLight.position.set(this.playerPos.x + 160, this.playerPos.y + 260, this.playerPos.z + 120);
      this.dirLight.target.position.copy(this.playerPos);
      this.dirLight.target.updateMatrixWorld();
    }

    // ==========================================
    // 5. CAMERA & TELEMETRY
    // ==========================================
    this.updateCamera(dt);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.particleFX.update(dt, this.camera.position, camDir, p.isBoosting, p.speed / p.maxSpeed);

    // Direction arrow pointing directly to next checkpoint
    const nextCP = this.trackData.checkpoints[p.currentCheckpoint];
    if (nextCP) {
      const toNext = new THREE.Vector3(...nextCP.position).sub(this.playerPos);
      p.distToNextCheckpoint = Math.round(toNext.length());
      toNext.normalize();
      p.nextCheckpointDir = [toNext.x, toNext.y, toNext.z];
    }

    // Lead Margin & Rank
    const rank: 1 | 2 = p.routeDistance >= ai.routeDistance ? 1 : 2;
    const splitDist = Math.round(p.routeDistance - ai.routeDistance);

    if (this.onStateUpdate) {
      this.onStateUpdate(p, ai, rank, splitDist, this.raceTime);
    }
  }

  /**
   * Checkpoint Gate Logic (Moving along point-to-point route)
   */
  private updateCheckpoints() {
    if (!this.trackData) return;
    const totalCPs = this.trackData.checkpoints.length;

    // Check Player against active checkpoint
    const pCPIndex = this.playerState.currentCheckpoint;
    if (pCPIndex < totalCPs) {
      const cp = this.trackData.checkpoints[pCPIndex];
      const cpPos = new THREE.Vector3(...cp.position);
      const dist = this.playerPos.distanceTo(cpPos);

      if (dist <= cp.radius + 2.5) {
        // Passed checkpoint!
        cp.passedPlayer = true;
        this.playerState.checkpointsPassed++;
        this.playerState.boost = Math.min(100, this.playerState.boost + 40);
        sound.playGateChime();
        this.particleFX.emitSparks(cpPos, 35, true);

        if (this.onCheckpointHit) {
          this.onCheckpointHit(pCPIndex, totalCPs);
        }

        if (pCPIndex === totalCPs - 1) {
          // Finished the point-to-point race!
          this.finishRace('player');
          return;
        } else {
          this.playerState.currentCheckpoint = pCPIndex + 1;
        }
      }
    }

    // Check AI against active checkpoint
    const aiCPIndex = this.aiState.currentCheckpoint;
    if (aiCPIndex < totalCPs) {
      const cp = this.trackData.checkpoints[aiCPIndex];
      const cpPos = new THREE.Vector3(...cp.position);
      const dist = this.aiPos.distanceTo(cpPos);

      if (dist <= cp.radius + 3.0) {
        cp.passedAI = true;
        this.aiState.checkpointsPassed++;
        if (aiCPIndex === totalCPs - 1) {
          this.finishRace('ai');
          return;
        } else {
          this.aiState.currentCheckpoint = aiCPIndex + 1;
        }
      }
    }

    // Calculate Route Progress (0.0 to 1.0)
    const trackLen = this.trackData.trackLength;
    this.playerState.routeDistance = Math.min(
      trackLen,
      (this.playerState.currentCheckpoint / (totalCPs - 1)) * trackLen
    );
    this.playerState.progress = Math.min(1.0, this.playerState.routeDistance / trackLen);

    this.aiState.routeDistance = Math.min(
      trackLen,
      (this.aiState.currentCheckpoint / (totalCPs - 1)) * trackLen
    );
    this.aiState.progress = Math.min(1.0, this.aiState.routeDistance / trackLen);
  }

  /**
   * Collision checking against boulders and rock spires
   */
  private checkObstacleCollisions(dt: number) {
    if (!this.trackData) return;

    for (const obs of this.trackData.obstacles) {
      const obsPos = new THREE.Vector3(...obs.position);
      const dist = this.playerPos.distanceTo(obsPos);

      if (dist < obs.radius + 1.2) {
        // Rover impacted obstacle!
        const pushDir = this.playerPos.clone().sub(obsPos);
        pushDir.y = 0; // Purely horizontal deflection, never push upwards into sky
        if (pushDir.lengthSq() > 0.0001) pushDir.normalize();
        this.playerPos.addScaledVector(pushDir, 0.4);
        this.playerVel.x *= 0.45;
        this.playerVel.z *= 0.45;

        this.playerState.collisions++;
        this.playerState.durability = Math.max(15, this.playerState.durability - 8);

        sound.playCollisionSound(0.85);
        this.particleFX.emitSparks(this.playerPos, 20, false);
      }
    }

    // Canyon Wall Boundaries
    if (this.trackType === 'canyon') {
      const curve = this.trackData.routeCurve;
      // If player wanders too high on sheer canyon cliffs, apply repulsion
      const centerPt = curve.getPointAt(this.playerState.progress);
      const lateralDist = new THREE.Vector2(this.playerPos.x - centerPt.x, this.playerPos.z - centerPt.z).length();

      if (lateralDist > 18.0) {
        const toCenter = new THREE.Vector3(centerPt.x - this.playerPos.x, 0, centerPt.z - this.playerPos.z).normalize();
        this.playerVel.addScaledVector(toCenter, 15 * dt);
        this.playerVel.multiplyScalar(0.85);
        sound.playCollisionSound(0.5);
      }
    }
  }

  /**
   * Camera Controller
   */
  private updateCamera(dt: number) {
    const pPos = this.playerPos;
    const forward = new THREE.Vector3(Math.sin(this.playerHeading), 0, Math.cos(this.playerHeading));
    const up = new THREE.Vector3(0, 1, 0);

    let targetCamPos = new THREE.Vector3();
    let lookTarget = pPos.clone().add(new THREE.Vector3(0, 1.2, 0));

    if (this.cameraView === 'third') {
      // Dynamic chase camera with speed pullback
      const speedRatio = this.playerState.speed / this.playerState.maxSpeed;
      const dist = 7.5 + speedRatio * 3.0;
      const height = 3.2 + (this.playerState.isAirborne ? 1.5 : 0);

      targetCamPos = pPos.clone()
        .addScaledVector(forward, -dist)
        .addScaledVector(up, height);
      lookTarget.addScaledVector(forward, 6.0);
    } else if (this.cameraView === 'cockpit') {
      // First-person rover hood / cockpit camera
      targetCamPos = pPos.clone()
        .addScaledVector(forward, 0.4)
        .addScaledVector(up, 1.35);
      lookTarget = pPos.clone().addScaledVector(forward, 25.0).addScaledVector(up, 1.0);
    } else {
      // High rally helicopter chase view
      targetCamPos = pPos.clone()
        .addScaledVector(forward, -14)
        .addScaledVector(up, 7.5);
      lookTarget.addScaledVector(forward, 10.0);
    }

    // Smooth camera interpolation
    this.camera.position.lerp(targetCamPos, Math.min(1, dt * 10));
    this.camera.lookAt(lookTarget);
  }

  /**
   * Finish Race & Show Results
   */
  private finishRace(winner: 'player' | 'ai') {
    this.status = 'finished';
    sound.stopEngine();
    sound.playFinishFanfare(winner === 'player');

    const trackName = TRACK_CONFIGS[this.trackType].name;
    const envName = ENVIRONMENTS[this.envType].name;

    const playerTime = this.raceTime;
    const aiTime = winner === 'ai' ? playerTime - 1.8 : playerTime + 2.4;

    const results: RaceResults = {
      winner,
      playerTime: parseFloat(playerTime.toFixed(2)),
      aiTime: parseFloat(aiTime.toFixed(2)),
      timeDifference: parseFloat(Math.abs(playerTime - aiTime).toFixed(2)),
      topSpeed: this.topSpeedRecorded,
      checkpointsHit: this.playerState.checkpointsPassed,
      totalCheckpoints: this.playerState.totalCheckpoints,
      trackName,
      trackType: this.trackType,
      envName,
      airTimeSeconds: parseFloat(this.totalAirTimeRecorded.toFixed(1)),
    };

    if (this.onFinish) {
      this.onFinish(results);
    }
  }

  private updateFinishCinematic(dt: number) {
    if (this.playerRover) {
      // Cinematic slow orbit around rover
      const angle = this.raceTime * 0.45;
      const radius = 9.0;
      this.camera.position.set(
        this.playerPos.x + Math.sin(angle) * radius,
        this.playerPos.y + 3.0,
        this.playerPos.z + Math.cos(angle) * radius
      );
      this.camera.lookAt(this.playerPos.clone().add(new THREE.Vector3(0, 1.0, 0)));
    }
  }

  public dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    sound.stopEngine();
    this.renderer.dispose();
    this.particleFX.dispose();
  }
}
