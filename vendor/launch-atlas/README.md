# Launch Atlas selected calculation modules

Source: https://github.com/exiztinz/rocket-launch-simulator

Pinned commit: `b8b570cd2f25b0531724c776631160c48bba06fd`.

MIT, Copyright (c) 2025 Joseph Tascona. The complete original license is in LICENSE and is also embedded in the generated flight-core.js and the standalone classroom. SOURCE.json records original sizes and SHA-256 hashes. The three original source files are unchanged.

MathPhysics's local build converts these ES modules to a classic-script factory, changes the RK4 timestep from 0.1 to 0.25 seconds, and changes the absolute 1000 N engine-on threshold to 0.01 N because the teaching vehicle uses arbitrary small-scale parameters. Run `node scripts/build_spaceflight_core.mjs` to regenerate the runtime script.

The state-events-v1 adapter uses upstream gravity, RK4, orbital elements and binary playback, not the upstream time-scheduled buildTrajectory. Original MathPhysics code calculates state-triggered two/three-stage mission types and a separate simplified first-stage recovery body in an offline Blob Worker. All performance parameters are arbitrary teaching values. User cutoff preserves motion; recovery keeps its own fuel, velocity and controls. Payload descent stops at the teaching boundary. The ideal orbit experiment reuses the same math.

No upstream preset performance figures are used for Falcon/Dragon, Long March or Shenzhou. No textures, models, Three/Chart/Cesium dependencies, fonts, live catalogues, or upstream build scripts are included. Local recovery is a simplified teaching proxy with explicit limits, not real telemetry, precision prediction or flight control. There is no thermal or rotational dynamics model.
