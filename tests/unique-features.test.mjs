import test from 'node:test';
import assert from 'node:assert/strict';
import {triangleArea, reflect, add, near} from '../lessons/jsxgraph-playground/math.js';

test('equal-base equal-height triangles retain area while the apex slides, including outside the base',()=>{
  for(const height of [.5,1,2,3,6])for(const x of [-8,-1,0,1,4,9]){
    assert.equal(triangleArea([0,0],[4,0],[x,height]),2*height);
  }
});
test('both visible mirror and vector targets are reachable with the existing quarter-grid controls',()=>{
  for(const target of [[3,2],[2,3]])for(const axis of [-2,0,2])assert.ok(near(reflect([2*axis-target[0],target[1]],axis),target));
  for(const target of [[4,3],[3,4]])assert.ok(near(add([2,1],[target[0]-2,target[1]-1]),target));
});
