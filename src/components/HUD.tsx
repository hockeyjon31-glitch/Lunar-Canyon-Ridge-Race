import React from 'react';
import { Camera, Volume2, VolumeX, Pause, Zap, Compass, Navigation, Radio, RotateCcw, Mountain, Globe } from 'lucide-react';
import { AIDifficulty, CameraView, EnvironmentType, RoverState, TrackType } from '../types';

interface HUDProps {
  player: RoverState;
  ai: RoverState;
  rank: 1 | 2;
  splitDist: number;
  raceTime: number;
  trackType: TrackType;
  envType: EnvironmentType;
  difficulty: AIDifficulty;
  countdown: number; // -1 = racing, 0 = GO, 1,2,3
  cameraView: CameraView;
  isMuted: boolean;
  onSelectTrack: (track: TrackType) => void;
  onSelectEnv: (env: EnvironmentType) => void;
  onSelectDifficulty: (diff: AIDifficulty) => void;
  onRestart: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  // Touch control callbacks
  onTouchSteerLeft: (active: boolean) => void;
  onTouchSteerRight: (active: boolean) => void;
  onTouchThrottle: (active: boolean) => void;
  onTouchBrake: (active: boolean) => void;
  onTouchBoost: (active: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  ai,
  rank,
  splitDist,
  raceTime,
  trackType,
  envType,
  difficulty,
  countdown,
  cameraView,
  isMuted,
  onSelectTrack,
  onSelectEnv,
  onSelectDifficulty,
  onRestart,
  onToggleCamera,
  onToggleMute,
  onPause,
  onTouchSteerLeft,
  onTouchSteerRight,
  onTouchThrottle,
  onTouchBrake,
  onTouchBoost,
}) => {
  // Time format
  const mins = Math.floor(raceTime / 60);
  const secs = Math.floor(raceTime % 60);
  const millis = Math.floor((raceTime * 100) % 100);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;

  // Normalized progress along the point-to-point route (0 to 1)
  const playerRoutePct = Math.min(100, Math.max(0, player.progress * 100));
  const aiRoutePct = Math.min(100, Math.max(0, ai.progress * 100));

  // Waypoint angle relative to rover heading
  const dirX = player.nextCheckpointDir[0];
  const dirZ = player.nextCheckpointDir[2];
  const waypointAngleRad = Math.atan2(dirX, dirZ) - player.yaw;
  const waypointAngleDeg = (waypointAngleRad * 180) / Math.PI;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-6 select-none overflow-hidden font-sans">
      {/* 1. TOP HEADER: Telemetry, Waypoint Compass, Route Progress */}
      <div className="w-full flex items-start justify-between gap-3">
        {/* Top Left: Position & Split Distance */}
        <div className="flex items-center gap-3">
          <div
            id="hud-position-badge"
            className={`px-4 py-2 rounded-xl border backdrop-blur-md transition-all flex items-baseline gap-2 ${
              rank === 1
                ? 'bg-sky-950/85 border-sky-500/60 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                : 'bg-rose-950/85 border-rose-500/60 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
            }`}
          >
            <span className="text-2xl md:text-3xl font-black tracking-wider">
              {rank === 1 ? '1ST' : '2ND'}
            </span>
            <span className="text-xs uppercase font-mono tracking-widest opacity-85">
              {rank === 1 ? 'LEAD' : 'CHASING'}
            </span>
          </div>

          <div
            id="hud-split-dist"
            className="hidden sm:flex flex-col bg-slate-900/80 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono shadow-md"
          >
            <span className="text-slate-400">RIVAL DISTANCE</span>
            <span className={`font-bold ${splitDist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {splitDist >= 0 ? `+${splitDist}m LEAD` : `${Math.abs(splitDist)}m BEHIND`}
            </span>
          </div>
        </div>

        {/* Top Center: Point-to-Point Route Progress Bar */}
        <div className="flex-1 max-w-lg mx-2 flex flex-col items-center">
          <div className="w-full bg-slate-900/85 border border-slate-800 backdrop-blur-md rounded-2xl px-4 py-2.5 flex flex-col gap-2 shadow-xl">
            {/* Header info */}
            <div className="flex justify-between items-center text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5 font-bold text-sky-400">
                <Navigation className="w-3.5 h-3.5" />
                {trackType === 'canyon' ? 'CANYON EXPEDITION' : 'RIDGEWAY STAGE'}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">
                  CHECKPOINT {player.currentCheckpoint} / {player.totalCheckpoints - 1}
                </span>
                <span className="text-slate-100 font-semibold tracking-widest bg-slate-800/80 px-2 py-0.5 rounded">
                  {timeFormatted}
                </span>
              </span>
            </div>

            {/* Point-to-Point Linear Route Timeline with Checkpoint markers */}
            <div className="relative w-full h-3 bg-slate-800/90 rounded-full overflow-visible">
              {/* Checkpoint milestone ticks */}
              {Array.from({ length: player.totalCheckpoints }).map((_, idx) => {
                const tickPct = (idx / (player.totalCheckpoints - 1)) * 100;
                const isPassed = idx < player.currentCheckpoint;
                const isActive = idx === player.currentCheckpoint;
                return (
                  <div
                    key={idx}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3 rounded-full z-10 transition-all ${
                      isPassed
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                        : isActive
                        ? 'bg-amber-400 w-2.5 h-4 shadow-[0_0_10px_rgba(251,191,36,1)] animate-ping'
                        : 'bg-slate-600'
                    }`}
                    style={{ left: `${tickPct}%` }}
                    title={`CP ${idx}`}
                  />
                );
              })}

              {/* Player Progress Fill */}
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-sky-500 to-sky-400 rounded-full transition-all duration-75 relative z-0"
                style={{ width: `${playerRoutePct}%` }}
              />

              {/* AI Rival Indicator Pin */}
              <div
                title="Rival Rover"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-rose-500 border border-white rounded-full shadow-[0_0_8px_rgba(244,63,94,0.9)] transition-all duration-75 pointer-events-none z-20"
                style={{ left: `${aiRoutePct}%` }}
              />

              {/* Player Rover Indicator Pin */}
              <div
                title="Your Rover"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-sky-400 border-2 border-white rounded-full shadow-[0_0_12px_rgba(56,189,248,1)] transition-all duration-75 pointer-events-none z-30"
                style={{ left: `${playerRoutePct}%` }}
              />
            </div>

            {/* Checkpoint Target Distance & Compass Pointer */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                TARGET: {player.currentCheckpoint === player.totalCheckpoints - 1 ? 'FINAL RECOVERY GATE' : `GATE ${player.currentCheckpoint}`}
              </span>
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Compass
                  className="w-3.5 h-3.5 transition-transform duration-75 text-amber-400"
                  style={{ transform: `rotate(${waypointAngleDeg}deg)` }}
                />
                {player.distToNextCheckpoint}m AHEAD
              </span>
            </div>
          </div>
        </div>

        {/* Top Right: System Buttons */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg">
            {/* Track Switcher */}
            <div className="flex items-center rounded-lg bg-slate-800/80 p-0.5 text-[11px] font-mono">
              <button
                id="hud-pill-canyon"
                type="button"
                onClick={() => onSelectTrack('canyon')}
                className={`px-2.5 py-1 rounded-md transition-all font-bold ${
                  trackType === 'canyon'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Canyon Track: Sheer high canyon walls on both sides"
              >
                Canyon
              </button>
              <button
                id="hud-pill-ridge"
                type="button"
                onClick={() => onSelectTrack('ridge')}
                className={`px-2.5 py-1 rounded-md transition-all font-bold ${
                  trackType === 'ridge'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ridge Track: Hilly ridge crest with steep drop-offs and jumps"
              >
                Ridge
              </button>
            </div>

            {/* Planet Switcher */}
            <div className="flex items-center rounded-lg bg-slate-800/80 p-0.5 text-[11px] font-mono">
              <button
                id="hud-pill-mars"
                type="button"
                onClick={() => onSelectEnv('mars')}
                className={`px-2.5 py-1 rounded-md transition-all font-bold ${
                  envType === 'mars'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mars: Reddish dust, canyon bluffs, low gravity"
              >
                Mars
              </button>
              <button
                id="hud-pill-moon"
                type="button"
                onClick={() => onSelectEnv('lunar')}
                className={`px-2.5 py-1 rounded-md transition-all font-bold ${
                  envType === 'lunar'
                    ? 'bg-slate-200 text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Moon: Deep starry space, gray regolith, ultra-low gravity"
              >
                Moon
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Restart */}
            <button
              id="hud-btn-restart"
              onClick={onRestart}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95 flex items-center gap-1 text-xs font-mono"
              title="Restart Expedition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>

            {/* Camera Toggle */}
            <button
              id="hud-btn-camera"
              onClick={onToggleCamera}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-mono"
              title={`Camera: ${cameraView}`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase">{cameraView}</span>
            </button>

            {/* Sound Toggle */}
            <button
              id="hud-btn-sound"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
            </button>

            {/* Pause */}
            <button
              id="hud-btn-pause"
              onClick={onPause}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md transition-all shadow-md active:scale-95"
              title="Pause Race"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CENTER COUNTDOWN / JUMP OVERLAY */}
      {countdown >= 0 ? (
        <div className="self-center my-auto flex flex-col items-center justify-center animate-pulse pointer-events-none">
          <div className="text-7xl sm:text-9xl font-black italic tracking-tighter drop-shadow-[0_0_35px_rgba(56,189,248,0.85)] text-transparent bg-clip-text bg-gradient-to-b from-white via-sky-200 to-sky-500">
            {countdown === 0 ? 'LAUNCH!' : countdown}
          </div>
          <p className="text-sm font-mono tracking-widest text-sky-300 mt-2 uppercase bg-slate-900/80 px-4 py-1 rounded-full border border-sky-500/30">
            {countdown === 0 ? 'ALL-WHEEL DRIVE ENGAGED' : 'ALIGNING PLANETARY ROVER SYSTEMS'}
          </p>
        </div>
      ) : player.isAirborne ? (
        <div className="self-center my-auto flex flex-col items-center justify-center pointer-events-none animate-bounce">
          <div className="px-5 py-2 rounded-2xl bg-amber-500/20 border border-amber-400 backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center gap-2">
            <span className="text-2xl font-black text-amber-300 tracking-wider font-mono">AIR-TIME</span>
            <span className="text-lg font-mono font-bold text-white">{player.airTime.toFixed(1)}s</span>
          </div>
        </div>
      ) : null}

      {/* 3. BOTTOM HUD: Speedometer, 4-Wheel Suspension Gauges, Boost, Durability, Controls */}
      <div className="w-full flex flex-col sm:flex-row items-end justify-between gap-4">
        {/* Bottom Left: Speedometer & Rover Dynamics */}
        <div className="flex flex-col gap-2.5 pointer-events-auto bg-slate-900/90 border border-slate-800 backdrop-blur-md p-4 rounded-2xl shadow-2xl w-full sm:w-72">
          {/* Digital Speedometer */}
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-4xl font-black tracking-tight text-white font-mono">
                {player.speed}
              </span>
              <span className="text-xs font-mono text-slate-400 ml-1.5">KM/H</span>
            </div>
            {player.isBoosting && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse">
                NITRO BOOST
              </span>
            )}
          </div>

          {/* 4-Wheel Independent Suspension Telemetry */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
              <span>Suspension Compression</span>
              <span>FL FR RL RR</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-3 bg-slate-950 p-0.5 rounded border border-slate-800">
              {player.suspensionCompression.map((val, idx) => (
                <div key={idx} className="w-full h-full bg-slate-800 rounded-sm overflow-hidden flex items-end">
                  <div
                    className={`w-full transition-all duration-75 ${
                      val > 0.8 ? 'bg-rose-500' : val > 0.6 ? 'bg-amber-400' : 'bg-sky-400'
                    }`}
                    style={{ height: `${val * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Boost Tank Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Zap className="w-3.5 h-3.5" />
                NITRO OVERDRIVE
              </span>
              <span>{Math.round(player.boost)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  player.isBoosting
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
                }`}
                style={{ width: `${player.boost}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Center: Touch Controls for Mobile/Tablet */}
        <div className="w-full sm:w-auto flex justify-center items-center gap-2 pointer-events-auto sm:hidden pb-1">
          {/* Steer Left */}
          <button
            id="touch-btn-left"
            onTouchStart={() => onTouchSteerLeft(true)}
            onTouchEnd={() => onTouchSteerLeft(false)}
            onMouseDown={() => onTouchSteerLeft(true)}
            onMouseUp={() => onTouchSteerLeft(false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-200 active:bg-sky-600 font-black text-xl flex items-center justify-center shadow-lg active:scale-95"
          >
            ◀
          </button>

          {/* Steer Right */}
          <button
            id="touch-btn-right"
            onTouchStart={() => onTouchSteerRight(true)}
            onTouchEnd={() => onTouchSteerRight(false)}
            onMouseDown={() => onTouchSteerRight(true)}
            onMouseUp={() => onTouchSteerRight(false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-200 active:bg-sky-600 font-black text-xl flex items-center justify-center shadow-lg active:scale-95"
          >
            ▶
          </button>

          {/* Brake / Reverse */}
          <button
            id="touch-btn-brake"
            onTouchStart={() => onTouchBrake(true)}
            onTouchEnd={() => onTouchBrake(false)}
            onMouseDown={() => onTouchBrake(true)}
            onMouseUp={() => onTouchBrake(false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/95 border border-slate-700 text-rose-300 active:bg-rose-700 font-mono text-xs font-bold flex items-center justify-center shadow-lg active:scale-95"
          >
            BRAKE
          </button>

          {/* Throttle */}
          <button
            id="touch-btn-throttle"
            onTouchStart={() => onTouchThrottle(true)}
            onTouchEnd={() => onTouchThrottle(false)}
            onMouseDown={() => onTouchThrottle(true)}
            onMouseUp={() => onTouchThrottle(false)}
            className="w-16 h-14 rounded-2xl bg-sky-600/95 border border-sky-400 text-white font-mono text-xs font-black flex items-center justify-center shadow-lg active:scale-95"
          >
            GAS
          </button>

          {/* Nitro Boost */}
          <button
            id="touch-btn-boost"
            onTouchStart={() => onTouchBoost(true)}
            onTouchEnd={() => onTouchBoost(false)}
            onMouseDown={() => onTouchBoost(true)}
            onMouseUp={() => onTouchBoost(false)}
            className="w-14 h-14 rounded-2xl bg-amber-600/95 border border-amber-400 text-white font-mono text-xs font-black flex items-center justify-center shadow-lg active:scale-95"
          >
            BOOST
          </button>
        </div>

        {/* Bottom Right: Keyboard Reference & Stage Info */}
        <div className="hidden sm:flex flex-col gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur-md p-4 rounded-2xl shadow-xl w-64">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-mono text-slate-300 font-bold">
              {trackType === 'canyon' ? 'DEEP CANYON WALLS' : 'HILLY RIDGELINE'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
              OFF-ROAD RALLY
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>STEER:</span>
              <span className="text-slate-200">A / D or ◀ ▶</span>
            </div>
            <div className="flex justify-between">
              <span>THROTTLE / BRAKE:</span>
              <span className="text-slate-200">W / S or ▲ ▼</span>
            </div>
            <div className="flex justify-between">
              <span>NITRO BOOST:</span>
              <span className="text-amber-300 font-bold">SPACE / SHIFT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
