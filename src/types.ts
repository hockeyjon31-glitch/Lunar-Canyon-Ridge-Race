export type EnvironmentType = 'mars' | 'lunar';

export type TrackType = 'canyon' | 'ridge';

export type AIDifficulty = 'cadet' | 'pilot' | 'ace';

export type CameraView = 'third' | 'cockpit' | 'chase_high';

export type GameStatus = 'menu' | 'countdown' | 'racing' | 'finished' | 'paused';

export interface TrackConfig {
  id: TrackType;
  name: string;
  tagline: string;
  description: string;
  terrainType: 'canyon_gorge' | 'hilly_ridge';
  lengthMeters: number;
  totalCheckpoints: number;
  roughness: number; // 0.0 to 1.0 bumpiness
  difficulty: string;
}

export interface EnvironmentConfig {
  id: EnvironmentType;
  name: string;
  subtitle: string;
  description: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  groundColor: number;
  cliffColor: number;
  accentColor: string; // Tailwind color or hex
  secondaryColor: string;
  gravity: number;
  atmosphereName: string;
}

export interface CheckpointData {
  index: number;
  label: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
  distanceAlongRoute: number;
  passedPlayer: boolean;
  passedAI: boolean;
}

export interface ObstacleData {
  id: number;
  type: 'boulder' | 'spire' | 'crater_rock' | 'ridge_crevasse';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  radius: number;
}

export interface RoverState {
  progress: number; // 0.0 to 1.0 along the point-to-point route
  routeDistance: number; // meters traveled
  currentCheckpoint: number; // next target checkpoint index
  totalCheckpoints: number;
  speed: number; // in km/h
  speedMps: number; // in m/s
  maxSpeed: number;
  boost: number; // 0 to 100%
  isBoosting: boolean;
  durability: number; // 0 to 100%
  suspensionCompression: [number, number, number, number]; // FL, FR, RL, RR (0.0 to 1.0)
  isAirborne: boolean;
  airTime: number; // consecutive airborne seconds
  roll: number;
  pitch: number;
  yaw: number;
  steering: number;
  checkpointsPassed: number;
  collisions: number;
  position: [number, number, number];
  nextCheckpointDir: [number, number, number]; // Normalized vector pointing to next active checkpoint
  distToNextCheckpoint: number;
}

export interface RaceResults {
  winner: 'player' | 'ai';
  playerTime: number; // seconds
  aiTime: number; // seconds
  timeDifference: number;
  topSpeed: number;
  checkpointsHit: number;
  totalCheckpoints: number;
  trackName: string;
  trackType: TrackType;
  envName: string;
  airTimeSeconds: number;
}

