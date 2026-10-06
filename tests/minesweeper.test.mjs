import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeMessage} from '../lessons/minesweeper/messages.js';
import {installTapSurface} from '../lessons/minesweeper/pointer.js';

test('ordinary solver messages point to the real Chinese control and keep full numerical details',()=>{
  assert.equal(localizeMessage("The solver is not running. Press the 'Analyse' button to see the solver's suggested move."),'可以自己继续推理；需要帮助时，展开“高级玩法与求解”，点“分析当前局面”。');
  assert.equal(localizeMessage('Found 3 safe tiles. 1,240 possible solutions remain.'),'找到了 3 个确定安全的格子。 仍有 1,240 种可能布局。');
  assert.equal(localizeMessage('Tile (2,4) has a 48.50% chance to win the game. 20 possible solutions remain.'),'选择格 第 5 行、第 3 列 的计算通关概率为 48.50%。 仍有 20 种可能布局。');
  assert.equal(localizeMessage('The game has been won. 3BV: 12/12,  Actions: 18,  Efficiency: 66.67%'),'成功通关。3BV：12/12，操作 18 次，效率 66.67%。');
});

test('tap surface commits one release and discards compatibility clicks',()=>{
  const surface = new EventTarget(), commits=[];
  const dispose = installTapSurface(surface,(event,button,origin)=>commits.push({button,x:event.clientX,origin:origin.x}));
  const send=(type,props={})=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:1,pointerType:'touch',button:0,clientX:20,clientY:20,...props});surface.dispatchEvent(event);return event;};
  send('pointerdown');send('pointerup');const click=send('click');
  assert.deepEqual(commits,[{button:0,x:20,origin:20}]);assert.equal(click.defaultPrevented,true);
  send('pointerdown');send('pointermove',{clientX:32});send('pointerup',{clientX:32});
  send('pointerdown');send('pointercancel');send('pointerup');
  send('pointerdown');send('pointerdown',{pointerId:2});send('pointerup',{pointerId:2});send('pointerup');
  assert.equal(commits.length,1);dispose();send('pointerdown');send('pointerup');assert.equal(commits.length,1);
});
