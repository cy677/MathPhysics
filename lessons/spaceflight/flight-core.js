/*
Launch Atlas, https://github.com/exiztinz/rocket-launch-simulator
Pinned commit b8b570cd2f25b0531724c776631160c48bba06fd
Local adaptations: classic-script factory, RK4 step 0.25 s, scale-independent engine flag.
MIT License

Copyright (c) 2025 Joseph Tascona

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
(() => {
'use strict';
function createLaunchAtlasCore(){
// Upstream flightMath.js
// SI units; Earth-centered inertial (ECI), with +Z through the north pole.
const EARTH_RADIUS_M = 6371000;
const EARTH_MU = 3.986004418e14;
const EARTH_RATE = 7.2921159e-5;
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (v, k) => v.map((x) => x * k);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const length = (v) => Math.hypot(...v);
const unit = (v) => scale(v, 1 / (length(v) || 1));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const asObject = ([x, y, z]) => ({ x, y, z });
const rotateZ = ([x, y, z], a) => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
  z
];
const atmosphereVelocity = ([x, y]) => [-EARTH_RATE * y, EARTH_RATE * x, 0];
const gravity = (r) => scale(r, -EARTH_MU / length(r) ** 3);

// Fourth-order integration avoids the energy drift of Euler orbital coasting.
function integrateRK4(r, v, dt, acceleration) {
  const a1 = acceleration(r, v);
  const v2 = add(v, scale(a1, dt / 2));
  const a2 = acceleration(add(r, scale(v, dt / 2)), v2);
  const v3 = add(v, scale(a2, dt / 2));
  const a3 = acceleration(add(r, scale(v2, dt / 2)), v3);
  const v4 = add(v, scale(a3, dt));
  const a4 = acceleration(add(r, scale(v3, dt)), v4);
  const weighted = (a, b, c, d) => scale(add(add(a, scale(b, 2)), add(scale(c, 2), d)), dt / 6);
  return { r: add(r, weighted(v, v2, v3, v4)), v: add(v, weighted(a1, a2, a3, a4)) };
}

function orbitalElements(r, v) {
  const radius = length(r);
  const energy = dot(v, v) / 2 - EARTH_MU / radius;
  const h = cross(r, v);
  const eccentricity = length(add(scale(cross(v, h), 1 / EARTH_MU), scale(r, -1 / radius)));
  const p = dot(h, h) / EARTH_MU;
  return {
    specificEnergy: energy,
    perigeeM: p / (1 + eccentricity) - EARTH_RADIUS_M,
    apogeeM: energy < 0 ? p / Math.max(1e-12, 1 - eccentricity) - EARTH_RADIUS_M : Infinity,
    inclinationDeg: (Math.acos(Math.max(-1, Math.min(1, h[2] / (length(h) || 1)))) * 180) / Math.PI
  };
}

// Upstream trajectory.js
const DT = 0.25; // Local teaching build: bounded RK4 step.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const atmosphereDensity = (h) => 1.225 * Math.exp(-Math.max(0, h) / 8500);

function buildTimeline(stages) {
  let time = 0;
  return stages.map((stage, index) => {
    const startSec = time;
    const endSec = startSec + stage.burnTimeSec;
    // Separation may occur a few seconds after engine cutoff.
    const separation = (stage.events || []).filter((e) => /sep/i.test(e.label));
    time = Math.max(endSec, ...separation.map((e) => startSec + e.timeSec));
    return { ...stage, index, startSec, endSec, separationSec: time };
  });
}

function normalizeStagesForSimulation(rawStages) {
  const stages = rawStages.map((stage) => ({ ...stage }));

  return stages.map((stage) => {
    const startMassKg = Math.max(1, stage.startMassKg);
    const endMassKg = clamp(stage.endMassKg, 1, startMassKg);
    const burnTimeSec = Math.max(0.001, stage.burnTimeSec);
    return {
      ...stage,
      startMassKg,
      endMassKg,
      burnTimeSec,
      thrustProfileNormalized: normalizeProfile(stage.thrustProfile),
      massFlowProfileNormalized: normalizeProfile(stage.massFlowProfile)
    };
  });
}

function normalizeProfile(profile) {
  if (!Array.isArray(profile) || profile.length === 0) return null;
  const sorted = [...profile]
    .filter(
      (entry) =>
        Number.isFinite(entry.untilSec) &&
        Number.isFinite(entry.scale) &&
        entry.untilSec > 0 &&
        entry.scale > 0
    )
    .sort((a, b) => a.untilSec - b.untilSec);
  return sorted.length > 0 ? sorted : null;
}

function scaleFromProfile(profile, elapsedSec, defaultScale = 1) {
  if (!profile) return defaultScale;
  for (const entry of profile) {
    if (elapsedSec <= entry.untilSec) {
      return entry.scale;
    }
  }
  return profile[profile.length - 1].scale;
}

function weightedBurnProgress(profile, elapsedSec, burnTimeSec) {
  if (!profile) {
    return clamp(elapsedSec / burnTimeSec, 0, 1);
  }

  const clampedElapsed = clamp(elapsedSec, 0, burnTimeSec);
  let totalWeighted = 0;
  let consumedWeighted = 0;
  let startSec = 0;

  for (const entry of profile) {
    const endSec = clamp(entry.untilSec, startSec, burnTimeSec);
    const segmentDuration = Math.max(0, endSec - startSec);
    const weightedDuration = segmentDuration * entry.scale;
    totalWeighted += weightedDuration;

    const consumedEnd = clamp(clampedElapsed, startSec, endSec);
    const consumedDuration = Math.max(0, consumedEnd - startSec);
    consumedWeighted += consumedDuration * entry.scale;

    startSec = endSec;
    if (startSec >= burnTimeSec) break;
  }

  if (startSec < burnTimeSec) {
    const tailDuration = burnTimeSec - startSec;
    const tailScale = profile.at(-1).scale;
    totalWeighted += tailDuration * tailScale;
    const consumedTail = Math.max(0, clampedElapsed - startSec);
    consumedWeighted += consumedTail * tailScale;
  }

  if (totalWeighted <= 0) return 0;
  return clamp(consumedWeighted / totalWeighted, 0, 1);
}

function lookupStage(timeline, tSec) {
  return timeline.find((stage) => tSec >= stage.startSec && tSec < stage.endSec) || null;
}

function stageMassAt(stage, tSec) {
  if (!stage) return 0;
  const localTimeSec = tSec - stage.startSec;
  const stageProgress = weightedBurnProgress(
    stage.massFlowProfileNormalized,
    localTimeSec,
    stage.burnTimeSec
  );
  return lerp(stage.startMassKg, stage.endMassKg, stageProgress);
}

function fuelMassRemainingKg(timeline, tSec) {
  let remainingKg = 0;
  for (const stage of timeline) {
    const propMassKg = Math.max(0, stage.startMassKg - stage.endMassKg);
    if (tSec <= stage.startSec) {
      remainingKg += propMassKg;
      continue;
    }
    if (tSec >= stage.endSec) {
      continue;
    }
    const currentMassKg = stageMassAt(stage, tSec);
    remainingKg += Math.max(0, currentMassKg - stage.endMassKg);
  }
  return remainingKg;
}

// Historical thrust and mass profiles are retained. Guidance is approximate;
// position, velocity, attitude and the displayed ground track share one state.
function buildTrajectory(preset) {
  const hints = preset.modelHints || {};
  const stages = buildTimeline(normalizeStagesForSimulation(preset.stages));
  const lastStage = stages.at(-1);
  const burnoutSec = lastStage.endSec;
  const maxDurationSec = burnoutSec + (hints.coastDurationSec ?? 900);
  const lat = ((preset.location?.lat || 0) * Math.PI) / 180;
  const lon = ((preset.location?.lon || 0) * Math.PI) / 180;
  const inclination =
    hints.targetInclinationDeg ??
    (preset.id.includes('apollo') ? 32.5 : preset.id.includes('shuttle') ? 40.3 : 53);
  const azimuth =
    ((hints.launchAzimuthDeg ??
      (Math.asin(clamp(Math.cos((inclination * Math.PI) / 180) / Math.cos(lat), -1, 1)) * 180) /
        Math.PI) *
      Math.PI) /
    180;
  const radial0 = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const east = [-Math.sin(lon), Math.cos(lon), 0];
  const north = unit(cross(radial0, east));
  const launchTangent = add(scale(north, Math.cos(azimuth)), scale(east, Math.sin(azimuth)));
  const planeNormal = unit(cross(radial0, launchTangent));
  let r = scale(radial0, EARTH_RADIUS_M);
  let v = atmosphereVelocity(r);
  let liftedOff = false;
  let impacted = false;
  let downrangeRad = 0;
  let previousRadial = radial0;
  let lastAttitude = radial0;
  let commandedPitch = 0;
  const propellantUsedKg = stages.map(() => 0);
  const samples = [];
  const events = stages.flatMap((stage) =>
    (stage.events || []).map((event) => ({ ...event, timeSec: stage.startSec + event.timeSec }))
  );
  // No invented deorbit force or automatic 'landing': this is an ascent/coast replay.
  events.push({ timeSec: burnoutSec, label: 'Unpowered coast' });

  for (let step = 0; step <= Math.round(maxDurationSec / DT); step += 1) {
    const tSec = step * DT;
    const stage = lookupStage(stages, tSec);
    const carriedStage = stage || stages.find((s) => tSec < s.startSec) || lastStage;
    const activeStack =
      stage || (tSec >= burnoutSec ? lastStage : stages[Math.max(0, carriedStage.index - 1)]);
    const massKg = activeStack.startMassKg - propellantUsedKg[activeStack.index];
    const altitudeM = Math.max(0, length(r) - EARTH_RADIUS_M);
    const radial = unit(r);
    const vr = dot(v, radial);
    const vtVector = add(v, scale(radial, -vr));
    const vt = length(vtVector);
    const airVelocity = add(v, scale(atmosphereVelocity(r), -1));
    const airspeed = length(airVelocity);
    let thrustN = stage
      ? stage.avgThrustN *
        scaleFromProfile(stage.thrustProfileNormalized, tSec - stage.startSec) *
        smoothstep(0, 1.1, tSec) *
        (1 + 0.04 * smoothstep(35000, 75000, altitudeM))
      : 0;
    const availableThrustAccel = thrustN / massKg;
    const g = EARTH_MU / length(r) ** 2;
    const programPitch =
      (clamp((tSec - (hints.pitchProgramSec ?? 12)) / 220, 0, 1) *
        (hints.maxPitchDeg ?? 80) *
        Math.PI) /
      180;
    // Upper-stage altitude/vertical-speed feedback. Forces steer the trajectory;
    // the target never overwrites position or adds velocity without thrust.
    const targetAltitude =
      hints.historicalMilestones?.orbitInsertionAltitudeM ?? hints.targetPerigeeM ?? 200000;
    const guidanceEndSec = stage && stage.index > 0 ? stage.endSec : burnoutSec;
    const timeToGo = Math.max(5, guidanceEndSec - tSec);
    const requestedRadialAccel = clamp(
      (6 * (targetAltitude - altitudeM)) / timeToGo ** 2 - (4 * vr) / timeToGo,
      -8,
      8
    );
    const radialThrustAccel = requestedRadialAccel + g - (vt * vt) / length(r);
    let guidedPitch = Math.acos(
      clamp(radialThrustAccel / Math.max(0.01, availableThrustAccel), -0.5, 1)
    );
    let guidanceThrottle = 1;
    const targetApoapsis = Math.max(targetAltitude, hints.targetApogeeM ?? targetAltitude);
    const targetSemimajorAxis = EARTH_RADIUS_M + (targetAltitude + targetApoapsis) / 2;
    const targetOrbitalSpeed = Math.sqrt(
      EARTH_MU * (2 / (EARTH_RADIUS_M + targetAltitude) - 1 / targetSemimajorAxis)
    );
    // Some historical MECO speeds describe a suborbital state before a later
    // insertion burn. Use a viable orbit floor for this single-burn abstraction.
    const insertionSpeed = Math.max(
      hints.historicalMilestones?.orbitInsertionVelocityMps ?? 0,
      targetOrbitalSpeed
    );
    // Reserve acceleration for later stages instead of spreading the current
    // stage's speed gain over the entire ascent and starving the final stage.
    const remainingDeltaV = stages.reduce((sum, next) => {
      if (!stage || next.index <= stage.index) return sum;
      const propellant = next.startMassKg - next.endMassKg;
      return (
        sum +
        (propellant > 0
          ? ((next.avgThrustN * next.burnTimeSec) / propellant) *
            Math.log(next.startMassKg / next.endMassKg)
          : 0)
      );
    }, 0);
    // Leave margin for steering losses and throttle during the remaining burns.
    const targetSpeed = insertionSpeed - remainingDeltaV * 0.7;
    if (stage && stage.index > 0 && vt > targetSpeed * 0.65) {
      // Approach insertion speed using less thrust, retaining unused propellant.
      // This prevents full-duration preset burns from overshooting into a much
      // higher orbit. Throttle changes force AND mass flow, never velocity itself.
      const horizontalThrustAccel = Math.max(
        0,
        (targetSpeed - vt) / timeToGo + (vr * vt) / length(r)
      );
      const requiredThrustAccel = Math.hypot(radialThrustAccel, horizontalThrustAccel);
      guidanceThrottle = clamp(requiredThrustAccel / Math.max(0.01, availableThrustAccel), 0, 1);
      if (guidanceThrottle < 1)
        guidedPitch = clamp(
          Math.atan2(horizontalThrustAccel, radialThrustAccel),
          0,
          (Math.PI * 2) / 3
        );
      thrustN *= guidanceThrottle;
    }
    const thrustAccel = thrustN / massKg;
    const guidanceBlend = smoothstep(140, 240, tSec);
    const desiredPitch = lerp(programPitch, guidedPitch, guidanceBlend);
    // Finite pitch rate prevents attitude jumps at throttle and staging boundaries.
    if (stage)
      commandedPitch += clamp(
        desiredPitch - commandedPitch,
        (-DT * Math.PI) / 150,
        (DT * Math.PI) / 150
      );
    const pitch = commandedPitch;
    const tangent = unit(cross(planeNormal, radial));
    const thrustDirection = unit(
      add(scale(radial, Math.cos(pitch)), scale(tangent, Math.sin(pitch)))
    );
    const holdDown =
      !liftedOff &&
      thrustAccel * Math.cos(pitch) <= g - length(atmosphereVelocity(r)) ** 2 / length(r);
    if (!holdDown) liftedOff = true;
    const acceleration = (position, velocity) => {
      const h = Math.max(0, length(position) - EARTH_RADIUS_M);
      const relative = add(velocity, scale(atmosphereVelocity(position), -1));
      const speed = length(relative);
      const mach = speed / Math.max(250, 340 - Math.min(120, h / 1000) * 0.6);
      const cd =
        (stage?.cd ?? lastStage.cd) * (1 + 0.22 * Math.exp(-Math.pow((mach - 1.05) / 0.22, 2)));
      const dragScale =
        (-0.5 * atmosphereDensity(h) * cd * (stage?.areaM2 ?? lastStage.areaM2) * speed) / massKg;
      return add(
        add(gravity(position), scale(relative, dragScale)),
        scale(thrustDirection, thrustAccel)
      );
    };
    const inertialAccel = acceleration(r, v);
    const posEcefArray = rotateZ(r, -EARTH_RATE * tSec);
    const velEcefArray = rotateZ(airVelocity, -EARTH_RATE * tSec);
    const engineOn = thrustN > 0.01; // Teaching vehicle has a smaller arbitrary scale.
    // Powered attitude follows thrust; after cutoff hold the instantaneous attitude
    // and smoothly acquire prograde over 12 simulation seconds.
    let attitude = thrustDirection;
    if (!stage && liftedOff) {
      attitude = unit(
        add(
          scale(lastAttitude, 1 - smoothstep(burnoutSec, burnoutSec + 12, tSec)),
          scale(unit(v), smoothstep(burnoutSec, burnoutSec + 12, tSec))
        )
      );
    } else if (stage) lastAttitude = thrustDirection;
    if (holdDown) attitude = radial;
    if (liftedOff) downrangeRad += Math.acos(clamp(dot(previousRadial, radial), -1, 1));
    previousRadial = radial;
    const orbit = orbitalElements(r, v);
    const speed = length(v);
    const sample = {
      tSec,
      altitudeM,
      velocityMps: speed,
      airspeedMps: holdDown ? 0 : airspeed,
      accelerationMps2: holdDown ? 0 : dot(inertialAccel, radial) + (vt * vt) / length(r),
      totalAccelerationMps2: holdDown ? 0 : length(inertialAccel),
      properAccelerationMps2: holdDown ? g : length(add(inertialAccel, scale(gravity(r), -1))),
      fuelMassKg: stages.reduce(
        (sum, entry) =>
          sum +
          (entry.index < activeStack.index
            ? 0
            : Math.max(0, entry.startMassKg - entry.endMassKg - propellantUsedKg[entry.index])),
        0
      ),
      massKg,
      dynamicPressurePa: 0.5 * atmosphereDensity(altitudeM) * airspeed ** 2,
      x: Math.sin(downrangeRad) * length(r),
      y: Math.cos(downrangeRad) * length(r),
      vx: vr * Math.sin(downrangeRad) + vt * Math.cos(downrangeRad),
      vy: vr * Math.cos(downrangeRad) - vt * Math.sin(downrangeRad),
      latDeg: (Math.asin(clamp(posEcefArray[2] / length(r), -1, 1)) * 180) / Math.PI,
      lonDeg: (Math.atan2(posEcefArray[1], posEcefArray[0]) * 180) / Math.PI,
      downrangeRad,
      launchAzimuthDeg: (azimuth * 180) / Math.PI,
      targetInclinationDeg: inclination,
      posEci: asObject(r),
      velEci: asObject(v),
      posEcef: asObject(posEcefArray),
      velEcef: asObject(velEcefArray),
      attitudeEci: asObject(unit(attitude)),
      pitchDeg: (pitch * 180) / Math.PI,
      thrustRatio: engineOn ? clamp(thrustN / stage.avgThrustN, 0, 1) : 0,
      stageIndex:
        stage?.index ?? (tSec < burnoutSec ? Math.max(0, carriedStage.index - 1) : lastStage.index),
      stageName: stage?.name ?? (tSec < burnoutSec ? 'Stage separation' : 'Coast'),
      engineOn,
      landed: false,
      impacted: false,
      perigeeM: orbit.perigeeM,
      apogeeM: orbit.apogeeM,
      inclinationDeg: orbit.inclinationDeg
    };
    if (impacted) {
      Object.assign(sample, {
        altitudeM: 0,
        engineOn: false,
        thrustRatio: 0,
        impacted: true,
        stageName: 'Surface impact'
      });
    }
    samples.push(sample);
    if (impacted) break;
    if (stage) {
      const scheduledFlow =
        stageMassAt(stage, tSec) - stageMassAt(stage, Math.min(tSec + DT, stage.endSec));
      propellantUsedKg[stage.index] += Math.max(0, scheduledFlow) * guidanceThrottle;
    }
    if (holdDown) {
      r = rotateZ(scale(radial0, EARTH_RADIUS_M), EARTH_RATE * (tSec + DT));
      v = atmosphereVelocity(r);
    } else {
      const next = integrateRK4(r, v, DT, acceleration);
      r = next.r;
      v = next.v;
      if (length(r) < EARTH_RADIUS_M) {
        r = scale(unit(r), EARTH_RADIUS_M);
        impacted = true;
      }
    }
  }
  const durationSec = samples.at(-1).tSec;
  const maxQ = samples.reduce(
    (best, s) => (s.dynamicPressurePa > best.dynamicPressurePa ? s : best),
    samples[0]
  );
  const timelineEvents = events.filter((e) => e.timeSec <= durationSec && !/max-q/i.test(e.label));
  timelineEvents.push({ timeSec: maxQ.tSec, label: 'Max-Q (modeled)' });
  if (impacted) timelineEvents.push({ timeSec: durationSec, label: 'Surface impact' });
  return {
    samples,
    events: timelineEvents.sort((a, b) => a.timeSec - b.timeSec),
    stages,
    stats: {
      apogeeM: samples.reduce((m, s) => Math.max(m, s.altitudeM), 0),
      durationSec,
      burnoutSec,
      targetApogeeM: hints.targetApogeeM,
      targetPerigeeM: hints.targetPerigeeM
    }
  };
}

// Upstream playback.js
// Binary lookup keeps scrubbing and playback independent of mission length.
function sampleAtTime(samples, timeSec) {
  if (!samples.length) return null;
  if (timeSec <= samples[0].tSec) return samples[0];
  if (timeSec >= samples.at(-1).tSec) return samples.at(-1);
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].tSec <= timeSec) lo = mid;
    else hi = mid;
  }
  const a = samples[lo],
    b = samples[hi],
    f = (timeSec - a.tSec) / (b.tSec - a.tSec);
  const result = { ...a, tSec: timeSec };
  const discrete = new Set(['stageIndex', 'engineOn', 'landed', 'impacted']);
  for (const key of Object.keys(a)) {
    if (discrete.has(key)) continue;
    if (typeof a[key] === 'number' && Number.isFinite(a[key]) && Number.isFinite(b[key])) {
      const delta = key === 'lonDeg' ? ((b[key] - a[key] + 540) % 360) - 180 : b[key] - a[key];
      result[key] = a[key] + delta * f;
      if (key === 'lonDeg') result[key] = ((result[key] + 540) % 360) - 180;
    } else if (a[key] && typeof a[key] === 'object' && 'x' in a[key]) {
      result[key] = Object.fromEntries(
        ['x', 'y', 'z'].map((axis) => [axis, a[key][axis] + (b[key][axis] - a[key][axis]) * f])
      );
    }
  }
  // An engine cutoff is a discrete event, not a half-sample blend.
  if (a.engineOn !== b.engineOn) result.thrustRatio = a.thrustRatio;
  return result;
}

return {EARTH_RADIUS_M,EARTH_MU,EARTH_RATE,add,scale,dot,length,unit,cross,asObject,rotateZ,atmosphereVelocity,gravity,integrateRK4,orbitalElements,buildTrajectory,sampleAtTime};
}
globalThis.LaunchAtlasCore=createLaunchAtlasCore();
globalThis.LaunchAtlasCore.workerSource=()=>`const core = (${createLaunchAtlasCore.toString()})();`;
})();
