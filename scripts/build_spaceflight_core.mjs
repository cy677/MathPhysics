// Convert the pinned, MIT-licensed Launch Atlas math into a dependency-free
// classic script. Keep the raw sources and full license alongside this build.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'vendor/launch-atlas');
const license=fs.readFileSync(path.join(source,'LICENSE'),'utf8');
const names=['flightMath.js','trajectory.js','playback.js'];
const parts=names.map(name=>{
  let code=fs.readFileSync(path.join(source,'src/simulation',name),'utf8');
  code=code.replace(/import\s*\{[\s\S]*?\}\s*from\s*'\.\/flightMath\.js';\s*/,'').replace(/\bexport\s+/g,'');
  if(name==='trajectory.js'){
    code=code.replace('const DT = 0.1;','const DT = 0.25; // Local teaching build: bounded RK4 step.');
    code=code.replace('const engineOn = thrustN > 1000;','const engineOn = thrustN > 0.01; // Teaching vehicle has a smaller arbitrary scale.');
  }
  return `// Upstream ${name}\n${code}`;
});
const exported=['EARTH_RADIUS_M','EARTH_MU','EARTH_RATE','add','scale','dot','length','unit','cross','asObject','rotateZ','atmosphereVelocity','gravity','integrateRK4','orbitalElements','buildTrajectory','sampleAtTime'];
const output=`/*\nLaunch Atlas, https://github.com/exiztinz/rocket-launch-simulator\nPinned commit b8b570cd2f25b0531724c776631160c48bba06fd\nLocal adaptations: classic-script factory, RK4 step 0.25 s, scale-independent engine flag.\n${license.trim()}\n*/\n(() => {\n'use strict';\nfunction createLaunchAtlasCore(){\n${parts.join('\n')}\nreturn {${exported.join(',')}};\n}\nglobalThis.LaunchAtlasCore=createLaunchAtlasCore();\nglobalThis.LaunchAtlasCore.workerSource=()=>\`const core = (\${createLaunchAtlasCore.toString()})();\`;\n})();\n`;
fs.writeFileSync(path.join(root,'lessons/spaceflight/flight-core.js'),output);
console.log(`Launch Atlas teaching core: ${Buffer.byteLength(output)} bytes`);
