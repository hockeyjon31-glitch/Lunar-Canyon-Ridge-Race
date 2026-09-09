/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { AIDifficulty, CameraView, EnvironmentType, GameStatus, RaceResults, RoverState, TrackType } from './types';
import { HUD } from './components/HUD';
import { StartModal, PauseModal, FinishModal } from './components/RaceModals';
import { sound } from './game/sound';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // App UI state - Start immediately in countdown so the 3D scene and rovers are instantly active
  const [status, setStatus] = useState<GameStatus>('countdown');
  const [currentTrack, setCurrentTrack] = useState<TrackType>('canyon');
  const [currentEnv, setCurrentEnv] = useState<EnvironmentType>('mars');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('pilot');
  const [cameraView, setCameraView] = useState<CameraView>('third');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);

  // Live telemetry state for HUD
  const [playerState, setPlayerState] = useState<RoverState>({
    progress: 0,
    routeDistance: 0,
    currentCheckpoint: 0,
    totalCheckpoints: 10,
    speed: 0,
    speedMps: 0,
    maxSpeed: 140,
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
  });

  const [aiState, setAIState] = useState<RoverState>({
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
  });

  const [rank, setRank] = useState<1 | 2>(1);
  const [splitDist, setSplitDist] = useState<number>(0);
  const [raceTime, setRaceTime] = useState<number>(0);
  const [results, setResults] = useState<RaceResults | null>(null);

  // Initialize Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    // Load default canyon track on mars
    engine.loadTrack(currentTrack, currentEnv);
    engine.setDifficulty(difficulty);
    engine.setCameraView(cameraView);
    engine.startRace();

    engine.onStateUpdate = (p, a, r, split, time) => {
      setPlayerState({ ...p });
      setAIState({ ...a });
      setRank(r);
      setSplitDist(split);
      setRaceTime(time);
    };

    engine.onCountdown = (count) => {
      setCountdown(count);
      if (count === -1) {
        setStatus('racing');
      }
    };

    engine.onFinish = (res) => {
      setResults(res);
      setStatus('finished');
    };

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key.toLowerCase();

      if (key === 'w' || key === 'arrowup') {
        engine.inputs.throttle = true;
      } else if (key === 's' || key === 'arrowdown') {
        engine.inputs.brake = true;
      } else if (key === 'a' || key === 'arrowleft') {
        engine.inputs.left = true;
      } else if (key === 'd' || key === 'arrowright') {
        engine.inputs.right = true;
      } else if (key === ' ' || key === 'shift') {
        engine.inputs.boost = true;
      } else if (key === 'c') {
        const nextCam: CameraView =
          cameraView === 'third' ? 'cockpit' : cameraView === 'cockpit' ? 'chase_high' : 'third';
        engine.setCameraView(nextCam);
        setCameraView(nextCam);
      } else if (key === 'm') {
        const muted = sound.toggleMute();
        setIsMuted(muted);
      } else if (key === 'escape' || key === 'p') {
        if (status === 'racing') {
          engine.pauseRace();
          setStatus('paused');
        } else if (status === 'paused') {
          engine.pauseRace();
          setStatus('racing');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key.toLowerCase();

      if (key === 'w' || key === 'arrowup') {
        engine.inputs.throttle = false;
      } else if (key === 's' || key === 'arrowdown') {
        engine.inputs.brake = false;
      } else if (key === 'a' || key === 'arrowleft') {
        engine.inputs.left = false;
      } else if (key === 'd' || key === 'arrowright') {
        engine.inputs.right = false;
      } else if (key === ' ' || key === 'shift') {
        engine.inputs.boost = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status, cameraView]);

  // Track and environment selection handlers
  const handleSelectTrack = (track: TrackType) => {
    setCurrentTrack(track);
    setResults(null);
    engineRef.current?.loadTrack(track, currentEnv);
    engineRef.current?.startRace();
    setStatus('countdown');
  };

  const handleSelectEnv = (env: EnvironmentType) => {
    setCurrentEnv(env);
    setResults(null);
    engineRef.current?.loadTrack(currentTrack, env);
    engineRef.current?.startRace();
    setStatus('countdown');
  };

  const handleSelectDifficulty = (diff: AIDifficulty) => {
    setDifficulty(diff);
    engineRef.current?.setDifficulty(diff);
  };

  const handleStartRace = () => {
    setStatus('countdown');
    engineRef.current?.startRace();
  };

  const handleToggleCamera = () => {
    if (engineRef.current) {
      const nextCam: CameraView =
        cameraView === 'third' ? 'cockpit' : cameraView === 'cockpit' ? 'chase_high' : 'third';
      engineRef.current.setCameraView(nextCam);
      setCameraView(nextCam);
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handlePause = () => {
    if (status === 'racing') {
      engineRef.current?.pauseRace();
      setStatus('paused');
    }
  };

  const handleResume = () => {
    engineRef.current?.pauseRace();
    setStatus('racing');
  };

  const handleRestart = () => {
    setStatus('countdown');
    setResults(null);
    engineRef.current?.startRace();
  };

  const handleChangeTrack = () => {
    setStatus('menu');
    setResults(null);
    engineRef.current?.resetPositions();
  };

  // Touch control bindings for mobile/touchscreen
  const handleTouchSteerLeft = useCallback((active: boolean) => {
    if (engineRef.current) engineRef.current.inputs.left = active;
  }, []);

  const handleTouchSteerRight = useCallback((active: boolean) => {
    if (engineRef.current) engineRef.current.inputs.right = active;
  }, []);

  const handleTouchThrottle = useCallback((active: boolean) => {
    if (engineRef.current) engineRef.current.inputs.throttle = active;
  }, []);

  const handleTouchBrake = useCallback((active: boolean) => {
    if (engineRef.current) engineRef.current.inputs.brake = active;
  }, []);

  const handleTouchBoost = useCallback((active: boolean) => {
    if (engineRef.current) engineRef.current.inputs.boost = active;
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        id="rover-canvas-container"
        ref={containerRef}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* In-Game HUD: Telemetry, Speedometer, Checkpoints, Suspension, Controls */}
      {(status === 'racing' || status === 'countdown' || status === 'menu') && (
        <HUD
          player={playerState}
          ai={aiState}
          rank={rank}
          splitDist={splitDist}
          raceTime={raceTime}
          trackType={currentTrack}
          envType={currentEnv}
          difficulty={difficulty}
          countdown={countdown}
          cameraView={cameraView}
          isMuted={isMuted}
          onSelectTrack={handleSelectTrack}
          onSelectEnv={handleSelectEnv}
          onSelectDifficulty={handleSelectDifficulty}
          onRestart={handleRestart}
          onToggleCamera={handleToggleCamera}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onTouchSteerLeft={handleTouchSteerLeft}
          onTouchSteerRight={handleTouchSteerRight}
          onTouchThrottle={handleTouchThrottle}
          onTouchBrake={handleTouchBrake}
          onTouchBoost={handleTouchBoost}
        />
      )}

      {/* Start / Launch Menu */}
      {status === 'menu' && (
        <StartModal
          currentTrack={currentTrack}
          currentEnv={currentEnv}
          difficulty={difficulty}
          onSelectTrack={handleSelectTrack}
          onSelectEnv={handleSelectEnv}
          onSelectDifficulty={handleSelectDifficulty}
          onStart={handleStartRace}
        />
      )}

      {/* Pause Menu */}
      {status === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onChangeTrack={handleChangeTrack}
        />
      )}

      {/* Race Finished / Podium Modal */}
      {status === 'finished' && results && (
        <FinishModal
          results={results}
          onRestart={handleRestart}
          onChangeTrack={handleChangeTrack}
        />
      )}
    </div>
  );
}
