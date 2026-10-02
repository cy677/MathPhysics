// Deliberately outside *.test.mjs. Only the failure-propagation probe runs this.
import test from 'node:test';
import assert from 'node:assert/strict';
test('intentional assertion failure for exit status verification',()=>assert.equal(1,2));
