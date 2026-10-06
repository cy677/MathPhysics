/* Storage is local to this activity, with an in-memory fallback. MIT. */
const prefix='mathphysics.sudoku.';
const memory=new Map<string,string>();
let available=true;
function notify(success:boolean){if(available===success)return;available=success;window.dispatchEvent(new CustomEvent('mp-sudoku-storage',{detail:{available}}));}
function keys(){let list:string[]=[];try{for(let i=0;i<window.localStorage.length;i++){const key=window.localStorage.key(i);if(key?.startsWith(prefix))list.push(key);}}catch{notify(false);}return [...new Set([...list,...memory.keys()])];}
const methods={
 getItem(key:string){if(!key.startsWith(prefix))return null;try{const value=window.localStorage.getItem(key);if(value!==null)memory.set(key,value);return value??memory.get(key)??null;}catch{notify(false);return memory.get(key)??null;}},
 setItem(key:string,value:string){if(!key.startsWith(prefix))throw new Error('Sudoku storage key is not scoped');memory.set(key,String(value));try{window.localStorage.setItem(key,String(value));notify(true);}catch{notify(false);}},
 removeItem(key:string){if(!key.startsWith(prefix))return;memory.delete(key);try{window.localStorage.removeItem(key);}catch{notify(false);}},
 clear(){for(const key of keys())methods.removeItem(key);},
 key(index:number){return keys()[index]??null;},
};
export const sudokuStorage=new Proxy({} as Storage,{
 get(_target,key){if(key==='length')return keys().length;if(key in methods)return methods[key as keyof typeof methods];return typeof key==='string'?methods.getItem(key):undefined;},
 ownKeys:()=>keys(),
 getOwnPropertyDescriptor(_target,key){if(typeof key==='string'&&keys().includes(key))return {configurable:true,enumerable:true,value:methods.getItem(key),writable:false};},
});
export const getStorageStatus=()=>available;
