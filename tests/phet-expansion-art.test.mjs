import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'src/phet/assets/expansion');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
test('replacement art preserves all raster extents and the pinned source expressions',()=>{
  for(const [sim,pin] of Object.entries(manifest.sources)){
    const source=fs.readFileSync(path.join(root,'vendor/phet',sim+'.html'),'utf8');
    assert.equal(sha(source),pin,sim);
    const images=[...source.matchAll(/data:image\/(?:png|jpeg|svg\+xml|x-icon);base64,[A-Za-z0-9+/=]+/g)].map(m=>m[0]);
    for(const asset of manifest.images.filter(a=>a.sim===sim)){
      const data=fs.readFileSync(path.join(dir,asset.file));
      assert.equal(data.readUInt32BE(16),Math.round(asset.width*(asset.type==='svg'?2:1)),asset.role);
      assert.equal(data.readUInt32BE(20),Math.round(asset.height*(asset.type==='svg'?2:1)),asset.role);
      if(asset.type==='png')assert.equal(sha(Buffer.from(images[asset.index].split(',')[1],'base64')),asset.sourceSHA256,asset.role);
    }
  }
});
test('every expansion screen has a self-contained menu illustration',()=>{
  const additions=JSON.parse(fs.readFileSync(path.join(root,'modules/phet/manifest.json'),'utf8')).additions;
  for(const activity of additions){
    assert.equal(manifest.menus[activity.id].length,activity.screenCount);
    const source=fs.readFileSync(path.join(root,'src/phet/generated',activity.id+'.html'),'utf8');
    const config=JSON.parse(source.match(/<script id="mp-expansion-art" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.equal(config.sim,activity.id);
    assert.equal(config.icons.length,activity.screenCount);
    for(const url of config.icons)assert.ok(url.startsWith('data:image/png;base64,'));
  }
});
