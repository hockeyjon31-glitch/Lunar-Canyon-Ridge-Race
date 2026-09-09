import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  isDust?: boolean;
}

export class ParticleFX {
  private particles: Particle[] = [];
  private pointGeo: THREE.BufferGeometry;
  private pointMat: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;

  // Speed warp lines during boost
  private warpLinesGeo: THREE.BufferGeometry;
  private warpLinesMat: THREE.LineBasicMaterial;
  private warpLines: THREE.LineSegments;
  private warpLinePositions: Float32Array;

  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();

    // Combined Dust & Spark Particles
    const maxParticles = 300;
    this.pointGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(maxParticles * 3);
    const colArr = new Float32Array(maxParticles * 3);

    this.pointGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    this.pointGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

    this.pointMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointGeo, this.pointMat);
    this.group.add(this.pointsMesh);

    // Speed warp streaks during booster burn
    const numLines = 50;
    this.warpLinePositions = new Float32Array(numLines * 6);
    this.warpLinesGeo = new THREE.BufferGeometry();
    this.warpLinesGeo.setAttribute('position', new THREE.BufferAttribute(this.warpLinePositions, 3));

    this.warpLinesMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });

    this.warpLines = new THREE.LineSegments(this.warpLinesGeo, this.warpLinesMat);
    this.group.add(this.warpLines);
  }

  /**
   * Spawn dust and gravel kicked up by tires
   */
  public emitTireDust(origin: THREE.Vector3, isMars: boolean = true, intensity: number = 1.0) {
    const baseColor = isMars ? new THREE.Color(0xb45309) : new THREE.Color(0x64748b);
    const count = Math.min(8, Math.floor(4 * intensity));

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 300) this.particles.shift();

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        0.5 + Math.random() * 2.0 * intensity,
        (Math.random() - 0.5) * 2.5
      );

      this.particles.push({
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3)),
        velocity: vel,
        color: baseColor.clone().offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1),
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
        size: 3.5,
        isDust: true,
      });
    }
  }

  /**
   * Spawn collision sparks or checkpoint flash
   */
  public emitSparks(origin: THREE.Vector3, count: number = 25, isGate: boolean = false) {
    const col = isGate ? new THREE.Color(0x38bdf8) : new THREE.Color(0xf59e0b);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 300) this.particles.shift();

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(isGate ? 8 + Math.random() * 12 : 5 + Math.random() * 14);

      this.particles.push({
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5)),
        velocity: dir,
        color: col.clone().offsetHSL(0, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2),
        life: 0,
        maxLife: isGate ? 0.6 : 0.45,
        size: isGate ? 2.5 : 1.8,
        isDust: false,
      });
    }
  }

  public update(dt: number, cameraPos: THREE.Vector3, cameraForward: THREE.Vector3, isBoosting: boolean, speedRatio: number) {
    // 1. Update Particles
    const posAttr = this.pointGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = this.pointGeo.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, dt);
      if (p.isDust) {
        p.velocity.y -= 3.0 * dt; // gentler dust settle
        p.velocity.multiplyScalar(0.94);
      } else {
        p.velocity.y -= 12.0 * dt; // gravity fall
        p.velocity.multiplyScalar(0.96);
      }
    }

    const pCount = this.particles.length;
    for (let i = 0; i < 300; i++) {
      if (i < pCount) {
        const p = this.particles[i];
        posArr[i * 3] = p.position.x;
        posArr[i * 3 + 1] = p.position.y;
        posArr[i * 3 + 2] = p.position.z;

        const alpha = Math.max(0, 1.0 - p.life / p.maxLife);
        posArr[i * 3 + 1] = p.position.y;
        colArr[i * 3] = p.color.r * alpha;
        colArr[i * 3 + 1] = p.color.g * alpha;
        colArr[i * 3 + 2] = p.color.b * alpha;
      } else {
        posArr[i * 3] = 0;
        posArr[i * 3 + 1] = -9999;
        posArr[i * 3 + 2] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 2. Warp Speed Lines when boosting
    const warpOpacity = isBoosting ? 0.75 : Math.max(0, (speedRatio - 0.75) * 1.5);
    this.warpLinesMat.opacity = warpOpacity;

    if (warpOpacity > 0.05) {
      const numLines = 50;
      const right = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, cameraForward).normalize();

      for (let i = 0; i < numLines; i++) {
        const radius = 3.5 + (i % 7) * 2.2;
        const angle = (i / numLines) * Math.PI * 2 + (Date.now() * 0.001);
        const center = cameraPos.clone()
          .addScaledVector(cameraForward, 12 + ((i * 37) % 30))
          .addScaledVector(right, Math.cos(angle) * radius)
          .addScaledVector(up, Math.sin(angle) * radius);

        const streakLen = 4.0 + (isBoosting ? 6.0 : 2.0);
        const start = center.clone().addScaledVector(cameraForward, streakLen);
        const end = center.clone().addScaledVector(cameraForward, -streakLen);

        const idx = i * 6;
        this.warpLinePositions[idx] = start.x;
        this.warpLinePositions[idx + 1] = start.y;
        this.warpLinePositions[idx + 2] = start.z;
        this.warpLinePositions[idx + 3] = end.x;
        this.warpLinePositions[idx + 4] = end.y;
        this.warpLinePositions[idx + 5] = end.z;
      }
      (this.warpLinesGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public dispose() {
    this.pointGeo.dispose();
    this.pointMat.dispose();
    this.warpLinesGeo.dispose();
    this.warpLinesMat.dispose();
  }
}
