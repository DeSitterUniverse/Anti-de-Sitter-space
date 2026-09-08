import { clamp, smooth, type Timeline, type Vec2 } from "./antiDeSitterGeometry";
import type { GravityFrame } from "./adsGravity";
/** Common radial display chart, magnifying the central region without moving
 * physical coordinates. Used by matter, null rays, mesh and compactness aperture.
 * This is an illustrative section of spherical symmetry, not a ray-traced sky. */
export const displayRadius=(q:number)=>q/(.18+.82*q);
export function fieldPoint(q:Vec2):Vec2 {
  const r=Math.hypot(q.x,q.y),f=r?displayRadius(r)/r:1;
  return {x:q.x*f,y:q.y*f};
}
export function sampleRadial(values:Float32Array,f:number):number{
  const x=clamp(f)*(values.length-1),i=Math.floor(x);
  return values[i]!+(values[Math.min(i+1,values.length-1)]!-values[i]!)*(x-i);
}
export function compactness(frame:GravityFrame){
  return smooth((1-frame.minA-.55)/.37);
}
export function apertureRadius(frame:GravityFrame){
  return displayRadius(Math.tan(frame.peakX/2))*compactness(frame);
}
export function liveTimeline(elapsed:number,frame:GravityFrame,endAge:number|undefined):Timeline{
  const returning=endAge!==undefined&&endAge>650;
  return {tau:frame.time,gather:smooth(elapsed/2200),exposure:smooth(elapsed/1300)*(1-smooth(((endAge??0)-850)/1200)),
    collapse:compactness(frame),phase:returning?"return":elapsed<350?"enter":"orbit",
    complete:endAge!==undefined&&endAge>=2050};
}
