import {levels} from './soma-model.js';
import {inspectChallenge,sanitizeSnapshot} from '../soma-native/state.js';
export {pieces,levels,cubeSolution,rotations,placementCells,checkPlacement,isSolved} from './soma-model.js';
export const game={id:'soma',title:'立体拼块',description:'在真正的三维空间里拖动、旋转拼块，拼出经典方块与原版题形。',levels};
const clone=value=>JSON.parse(JSON.stringify(value));
export function mount(container,level,{saved,onSave=()=>{},onFinish=()=>{}}={}){
  if(!document.querySelector('link[data-soma-native-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./soma.css',import.meta.url).href;style.dataset.somaNativeStyle='';document.head.append(style);}
  let state=saved?.version===1&&saved.levelId===level.id?clone(saved):{version:1,levelId:level.id,placed:{},moves:0,solved:false};
  let ready=false,destroyed=false,awarded=false,resetPending=false,view=null;
  container.classList.add('soma-native-host');
  const status=document.createElement('p');status.className='soma-native-loading';status.role='status';status.textContent='正在准备三维拼块…';
  const frame=document.createElement('iframe');frame.className='soma-native-frame';frame.title='原版索玛三维拼块';frame.allow='fullscreen';frame.src=new URL('../soma-native/index.html',import.meta.url).href;
  const send=message=>{if(!destroyed)frame.contentWindow?.postMessage(message,location.origin);};
  function receive(event){
    if(destroyed||event.source!==frame.contentWindow||event.origin!==location.origin)return;
    const data=event.data;
    if(data?.type==='soma-native-ready'){send({type:'soma-native-init',levelId:level.id,saved:state});return;}
    if(data?.type==='soma-native-error'){status.hidden=false;status.textContent='三维场景未能加载，请重新打开本关。';return;}
    if(data?.type!=='soma-native-state'||data.levelId!==level.id)return;
    const native=sanitizeSnapshot(level,data.native);if(!native)return;
    const inspected=inspectChallenge(level,native.challenge.poses);if(!inspected)return;
    ready=true;status.hidden=true;view=data.view||null;
    state={version:1,levelId:level.id,native,placed:inspected.placed,solved:inspected.solved,moves:Number.isInteger(data.moves)&&data.moves>=0?data.moves:state.moves||0,phase:native.mode!=='challenge'?'exploring':inspected.solved?'complete':'playing'};
    onSave(clone(state));
    if(resetPending){resetPending=false;send({type:'soma-native-reset'});return;}
    // Reconstruct the complete target from real mesh transforms in this realm.
    if(native.mode==='challenge'&&data.action==='commit'&&inspected.solved&&!awarded){awarded=true;onFinish({quality:1,moves:state.moves,filled:level.target.length});}
  }
  window.addEventListener('message',receive);
  container.replaceChildren(status,frame);
  return {
    getState(){return {...clone(state),ready,loading:!ready,mode:state.native?.mode||'challenge',scoring:(state.native?.mode||'challenge')==='challenge',target:clone(level.target),view:clone(view),coordinates:'原生世界 x 向右、y 向上、z 向前；拖动吸附到整数格，原存档坐标经目标平移映射保持不变'};},
    reset(){awarded=false;if(ready)send({type:'soma-native-reset'});else resetPending=true;},
    advanceTime(){return this.getState();},
    destroy(){send({type:'soma-native-destroy'});destroyed=true;window.removeEventListener('message',receive);frame.remove();status.remove();container.classList.remove('soma-native-host');}
  };
}
