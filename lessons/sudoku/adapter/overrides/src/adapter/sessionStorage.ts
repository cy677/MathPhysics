/** The router reads session storage during module initialization. Keep its scroll
 * cache scoped here and usable when the browser denies access to storage. */
let native:Storage|undefined;
try{native=window.sessionStorage;}catch{/* Memory fallback below. */}
const prefix='mathphysics.sudoku.session.';
const values=new Map<string,string>();
const storage={
 getItem(key:string){try{const value=native?.getItem(prefix+key);if(value!=null)values.set(key,value);return value??values.get(key)??null;}catch{return values.get(key)??null;}},
 setItem(key:string,value:string){values.set(key,String(value));try{native?.setItem(prefix+key,String(value));}catch{/* The current page remains usable. */}},
 removeItem(key:string){values.delete(key);try{native?.removeItem(prefix+key);}catch{/* Memory was removed. */}},
 key(index:number){return [...values.keys()][index]??null;},
 clear(){for(const key of values.keys())storage.removeItem(key);},
 get length(){return values.size;},
};
Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
