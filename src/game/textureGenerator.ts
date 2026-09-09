import * as THREE from 'three';

/**
 * Procedural texture generator for Martian and Lunar planetary terrain.
 * Creates rich, multi-octave noise, rock strata, cratering, and tire treads
 * directly onto HTML5 canvases without relying on external image files.
 */

export function createTerrainTexture(type: 'mars_canyon' | 'mars_ridge' | 'lunar_canyon' | 'lunar_ridge'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const isMars = type.startsWith('mars');
  const isCanyon = type.includes('canyon');

  // Base background fill
  if (isMars) {
    ctx.fillStyle = isCanyon ? '#782613' : '#a33d1b';
  } else {
    ctx.fillStyle = isCanyon ? '#242b35' : '#333e4d';
  }
  ctx.fillRect(0, 0, 512, 512);

  // Layer 1: Fine grain noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 45;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (isMars ? noise * 0.7 : noise)));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (isMars ? noise * 0.4 : noise * 1.1)));
  }
  ctx.putImageData(imgData, 0, 0);

  // Layer 2: Rock strata bands or sediment lines
  ctx.globalAlpha = 0.18;
  for (let y = 0; y < 512; y += 4 + Math.random() * 8) {
    ctx.strokeStyle = isMars ? (Math.random() > 0.5 ? '#f97316' : '#451205') : (Math.random() > 0.5 ? '#64748b' : '#0f172a');
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 20, 340, y + (Math.random() - 0.5) * 20, 512, y);
    ctx.stroke();
  }

  // Layer 3: Craters / pitted rocks
  ctx.globalAlpha = 0.22;
  const numPits = isMars ? 50 : 85;
  for (let p = 0; p < numPits; p++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 3 + Math.random() * 16;

    // Dark pit crater
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Bright rim highlight
    ctx.strokeStyle = isMars ? '#fca5a5' : '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - r * 0.15, cy - r * 0.15, r * 0.9, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();
  }

  // Layer 4: Gravel pebbles
  ctx.globalAlpha = 0.35;
  for (let g = 0; g < 150; g++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const gr = 1 + Math.random() * 2.5;
    ctx.fillStyle = Math.random() > 0.4 ? (isMars ? '#feb2b2' : '#cbd5e1') : '#0f172a';
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

export function createTireTreadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b'; // dark rubber
  ctx.fillRect(0, 0, 256, 256);

  // Chunky chevron off-road tread blocks
  ctx.fillStyle = '#0f172a';
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    // Left tread lug
    ctx.moveTo(30, y);
    ctx.lineTo(110, y + 16);
    ctx.lineTo(95, y + 26);
    ctx.lineTo(15, y + 10);
    ctx.closePath();
    ctx.fill();

    // Right tread lug
    ctx.beginPath();
    ctx.moveTo(226, y);
    ctx.lineTo(146, y + 16);
    ctx.lineTo(161, y + 26);
    ctx.lineTo(241, y + 10);
    ctx.closePath();
    ctx.fill();

    // Center reinforcement bead
    ctx.fillRect(120, y, 16, 24);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

export function createCliffTexture(isMars: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isMars ? '#5c1d0c' : '#1e2631';
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal geological strata
  for (let y = 0; y < 512; y += 6 + Math.random() * 12) {
    const isDark = Math.random() > 0.5;
    ctx.fillStyle = isDark
      ? (isMars ? '#3f1205' : '#0d131a')
      : (isMars ? '#852b12' : '#334155');
    ctx.fillRect(0, y, 512, 3 + Math.random() * 6);
  }

  // Vertical cracks & fissures
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#000000';
  for (let x = 0; x < 512; x += 32 + Math.random() * 48) {
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, 256);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4);
  return texture;
}

/**
 * Creates a high-visibility sci-fi expedition road texture:
 * Dark compacted regolith/asphalt bed with glowing neon boundary lines,
 * center dashed divider, tire tread wear grooves, and directional chevrons.
 */
export function createRoadTexture(isMars: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark compacted basalt/regolith bed
  ctx.fillStyle = isMars ? '#2a1209' : '#141a23';
  ctx.fillRect(0, 0, 512, 512);

  // Micro gravel noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 24;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Dual tire wear tracks (slightly darker smooth grooves where rovers drive)
  ctx.fillStyle = isMars ? '#1f0d06' : '#0b0f14';
  ctx.fillRect(90, 0, 95, 512);
  ctx.fillRect(327, 0, 95, 512);

  // Bright glowing outer edge boundary lines
  const edgeColor = isMars ? '#38bdf8' : '#facc15';
  const edgeGlow = isMars ? 'rgba(56, 189, 248, 0.45)' : 'rgba(250, 204, 21, 0.45)';

  // Left solid border
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(16, 0, 24, 512);
  ctx.fillStyle = edgeColor;
  ctx.fillRect(22, 0, 12, 512);

  // Right solid border
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(472, 0, 24, 512);
  ctx.fillStyle = edgeColor;
  ctx.fillRect(478, 0, 12, 512);

  // Center dashed divider line
  const dashLen = 64;
  const gapLen = 48;
  const cycle = dashLen + gapLen;
  const centerColor = isMars ? '#ffffff' : '#38bdf8';
  ctx.fillStyle = centerColor;
  for (let y = 0; y < 512; y += cycle) {
    ctx.fillRect(251, y, 10, dashLen);
  }

  // Directional chevron arrows painted in center of lane pointing forward (upwards along V)
  ctx.strokeStyle = isMars ? 'rgba(56, 189, 248, 0.65)' : 'rgba(250, 204, 21, 0.65)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let y = 80; y < 512; y += 256) {
    // Chevron pointing up (towards V=0, forward track)
    ctx.beginPath();
    ctx.moveTo(226, y + 25);
    ctx.lineTo(256, y);
    ctx.lineTo(286, y + 25);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
