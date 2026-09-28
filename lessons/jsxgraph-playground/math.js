// Original lesson maths; rendering is provided by JSXGraph (MIT option).
export const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
export const determinant = (u,v) => u[0]*v[1]-u[1]*v[0];
export const transform = (p,u,v) => [p[0]*u[0]+p[1]*v[0],p[0]*u[1]+p[1]*v[1]];
export const reflect = (p,axis=0) => [2*axis-p[0],p[1]];
export const rotate = (p,degrees) => {const t=degrees*Math.PI/180;return [p[0]*Math.cos(t)-p[1]*Math.sin(t),p[0]*Math.sin(t)+p[1]*Math.cos(t)];};
export const triangleArea = (a,b,c) => Math.abs(determinant([b[0]-a[0],b[1]-a[1]],[c[0]-a[0],c[1]-a[1]]))/2;
export function triangleAngles(a,b,c){return [a,b,c].map((p,i,all)=>{const q=all[(i+1)%3],r=all[(i+2)%3];const u=[q[0]-p[0],q[1]-p[1]],v=[r[0]-p[0],r[1]-p[1]];const n=Math.hypot(...u)*Math.hypot(...v);return n<1e-10?null:Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/n)))*180/Math.PI;});}
export const near = (a,b,tolerance=.13) => a.every((v,i)=>Math.abs(v-b[i])<=tolerance);
