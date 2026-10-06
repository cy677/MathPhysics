import React from 'react';
export default function Checkbox({id,checked,onChange,children}:{id:string;checked:boolean;onChange:(checked:boolean)=>void;children:React.ReactNode}){return <label className="sudoku-setting" htmlFor={id}><input id={id} type="checkbox" checked={checked} onChange={event=>{onChange(event.target.checked);event.target.blur();}}/><span>{children}</span></label>;}
