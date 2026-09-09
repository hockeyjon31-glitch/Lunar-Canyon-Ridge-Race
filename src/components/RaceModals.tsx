import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Award, Zap, Shield, Mountain, Compass, ChevronRight, Gauge } from 'lucide-react';
import { AIDifficulty, EnvironmentType, RaceResults, TrackType } from '../types';
import { TRACK_CONFIGS } from '../game/terrainTrack';

interface StartModalProps {
  currentTrack: TrackType;
  currentEnv: EnvironmentType;
  difficulty: AIDifficulty;
  onSelectTrack: (track: TrackType) => void;
  onSelectEnv: (env: EnvironmentType) => void;
  onSelectDifficulty: (diff: AIDifficulty) => void;
  onStart: () => void;
}

export const StartModal: React.FC<StartModalProps> = ({
  currentTrack,
  currentEnv,
  difficulty,
  onSelectTrack,
  onSelectEnv,
  onSelectDifficulty,
  onStart,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 md:p-8 shadow-2xl flex flex-col gap-5 text-slate-100 my-auto">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/40 text-sky-300 text-xs font-mono tracking-widest uppercase mb-2">
            <Compass className="w-3.5 h-3.5" /> Planetary Rover Rally Championship
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            Rover Canyon & Ridge Rally
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-lg mx-auto">
            High-speed off-road land rover expedition across rough, bumpy extraterrestrial terrain with point-to-point checkpoints.
          </p>
        </div>

        {/* 1. Track Selection: Canyon Walls vs Hilly Ridge */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5 text-sky-400" /> 1. Select Route & Terrain (Point-to-Point)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Canyon Track */}
            <button
              id="btn-select-track-canyon"
              type="button"
              onClick={() => onSelectTrack('canyon')}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                currentTrack === 'canyon'
                  ? 'bg-gradient-to-br from-amber-950/70 to-rose-950/70 border-amber-500 ring-2 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase font-mono">TRACK 1: CANYON GORGE</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    2.2 KM POINT-TO-POINT
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-1">High Canyon Walls</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Flanked on both sides by 70m sheer vertical rock walls. Bumpy gravel riverbed, narrow chicanes, and fallen boulders.
                </p>
              </div>
              <div className="text-[11px] font-mono text-amber-300/80 flex items-center gap-1">
                Terrain: Deep Fissure with Towing Bluffs
              </div>
            </button>

            {/* Ridge Track */}
            <button
              id="btn-select-track-ridge"
              type="button"
              onClick={() => onSelectTrack('ridge')}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                currentTrack === 'ridge'
                  ? 'bg-gradient-to-br from-slate-900 to-sky-950/70 border-sky-400 ring-2 ring-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                  : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 uppercase font-mono">TRACK 2: HILLY RIDGE</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                    2.4 KM POINT-TO-POINT
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-1">Mountain Crest Traverse</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Traverses an undulating mountain ridge with steep side drop-offs. Natural launch crests for thrilling airborne jumps.
                </p>
              </div>
              <div className="text-[11px] font-mono text-sky-300/80 flex items-center gap-1">
                Terrain: Rolling Hills, Jumps & Crests
              </div>
            </button>
          </div>
        </div>

        {/* 2. Planetary Environment & AI Rival */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Planet Environment */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono tracking-wider text-slate-400 uppercase">
              2. Celestial Sector (Gravity)
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onSelectEnv('mars')}
                className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                  currentEnv === 'mars'
                    ? 'bg-rose-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mars (3.72 m/s²)
              </button>
              <button
                type="button"
                onClick={() => onSelectEnv('lunar')}
                className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                  currentEnv === 'lunar'
                    ? 'bg-sky-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Moon (1.62 m/s²)
              </button>
            </div>
          </div>

          {/* AI Rival Competency */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono tracking-wider text-slate-400 uppercase">
              3. AI Opponent Skill
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              {(['cadet', 'pilot', 'ace'] as AIDifficulty[]).map((d) => (
                <button
                  key={d}
                  id={`btn-diff-${d}`}
                  type="button"
                  onClick={() => onSelectDifficulty(d)}
                  className={`py-2 text-xs font-mono uppercase font-bold rounded-lg transition-all ${
                    difficulty === d
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Physics & Gameplay Highlights */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-3 justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Sped-up realistic physics: 4-wheel independent suspension, drift, and airborne jump dynamics.</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Pass through sequential checkpoint arches along the route to maintain nitro boost.</span>
          </div>
        </div>

        {/* 4. Launch Action Button */}
        <button
          id="btn-start-race"
          type="button"
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-lg tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(56,189,248,0.4)] active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          Deploy Rover & Start Rally
        </button>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onChangeTrack: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onChangeTrack }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
        <h2 className="text-2xl font-black uppercase text-white tracking-wider">Rally Paused</h2>
        <p className="text-xs font-mono text-slate-400">Rover handbrake engaged on planetary route.</p>

        <div className="flex flex-col gap-2.5 mt-2">
          <button
            id="btn-pause-resume"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase font-mono tracking-wider transition-all"
          >
            Resume Expedition
          </button>
          <button
            id="btn-pause-restart"
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Restart Stage
          </button>
          <button
            id="btn-pause-change-track"
            onClick={onChangeTrack}
            className="w-full py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono uppercase tracking-wider text-xs transition-all"
          >
            Switch Track or Planet
          </button>
        </div>
      </div>
    </div>
  );
};

interface FinishModalProps {
  results: RaceResults;
  onRestart: () => void;
  onChangeTrack: () => void;
}

export const FinishModal: React.FC<FinishModalProps> = ({ results, onRestart, onChangeTrack }) => {
  const won = results.winner === 'player';

  useEffect(() => {
    if (won) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#0ea5e9', '#f59e0b', '#10b981'],
      });
    }
  }, [won]);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t * 100) % 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="max-w-lg w-full bg-slate-900/95 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-slate-100 text-center">
        {/* Banner */}
        <div className="flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
              won
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>

          <h2
            className={`text-3xl sm:text-4xl font-black uppercase tracking-tight ${
              won ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {won ? 'STAGE VICTORY!' : 'STAGE FINISHED (2ND)'}
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            {won
              ? `You conquered ${results.trackName} and crossed the finish line first!`
              : `Your AI opponent reached the recovery gateway ${results.timeDifference}s ahead. Re-match for the cup!`}
          </p>
        </div>

        {/* Telemetry Stats Card */}
        <div className="grid grid-cols-2 gap-3 bg-slate-800/60 border border-slate-700/80 p-4 rounded-2xl text-left font-mono text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Stage Time</span>
            <div className="text-lg font-bold text-white">{formatTime(results.playerTime)}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Rival Time</span>
            <div className="text-lg font-bold text-slate-300">{formatTime(results.aiTime)}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Top Speed</span>
            <div className="text-lg font-bold text-amber-400">{results.topSpeed} km/h</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase">Air-Time Jumps</span>
            <div className="text-lg font-bold text-sky-400">{results.airTimeSeconds}s airborne</div>
          </div>
          <div className="col-span-2 border-t border-slate-700/80 pt-2 flex justify-between items-center">
            <span className="text-slate-400 text-[10px] uppercase">Checkpoints Reached</span>
            <span className="text-cyan-400 font-bold">
              {results.checkpointsHit} / {results.totalCheckpoints}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            id="btn-finish-rematch"
            onClick={onRestart}
            className="flex-1 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" /> Re-Run Stage
          </button>
          <button
            id="btn-finish-switch-track"
            onClick={onChangeTrack}
            className="flex-1 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white font-mono uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2"
          >
            Change Track <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
