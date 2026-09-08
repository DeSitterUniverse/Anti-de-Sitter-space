/**
 * REFERENCE MATHEMATICS: analytic test orbits and the historical shell timeline
 * below are retained for regression tests. The active experience now uses
 * adsGravity.ts; it does not call sampleOrbit, shellRadius or timeline.
 *
 * Equatorial sector of universal-cover AdS4, L=c=1, ambient signature (--+++).
 * The unused third spatial embedding coordinate is zero throughout.
 * -U²-V²+X²+Y²=-1; U=A cos(tau), V=A sin(tau), A=sqrt(1+r²).
 * ds²=-(1+r²)dtau²+dr²/(1+r²)+r²dphi²; Lambda=-3.
 *
 * Every glyph is a test mass in ONE spatial Poincare disk
 * q=(X,Y)/(1+sqrt(1+X²+Y²)), with spatial curvature K=-1.
 * No self-gravity, radiation backreaction, drag, or invented forces.
 *
 * Initial data P=(a,0,x,y), T=(0,b,-k*y,k*x),
 * a=sqrt(1+r0²), b=sqrt(1+k²*r0²) satisfy P.P=T.T=-1, P.T=0.
 * Z(s)=P cos(s)+T sin(s) therefore solves Z''=-Z EXACTLY.
 * k is each letter's tangential launch condition, not a force. 0<|k|<1
 * produces bound eccentric motion without a singular pile-up at the origin.
 * All masses are at their antipodes at tau=pi and recur at tau=2pi.
 *
 * Time stays unwrapped. A fixed affine camera fits the spatial disk to the
 * viewport; its elliptical appearance does not change the intrinsic metric.
 * The recurring spatial positions do not imply closed physical time.
 */
export interface Vec2 { x: number; y: number }
export interface Embedding { u: number; v: number; x: number; y: number }
export interface Orbit {
  initial: Embedding;
  tangent: Embedding;
}
export const PERIOD = 2 * Math.PI;
export const LAUNCH = 0.34;
/** Deterministic per-marker initial angular momentum, not random forcing.
 * Neighbouring letters must not share a velocity field: that merely bends words
 * into ribbons. Each remains an exact, independently initialized AdS geodesic.
 */
export function letterLaunch(index:number):number {
  let h=Math.imul(index+1,0x45d9f3b);
  h=Math.imul(h^(h>>>16),0x45d9f3b);h^=h>>>16;
  const u=(h>>>0)/4294967296;
  return (u<0.15?-1:1)*(0.22+0.50*((u*7.731)%1));
}
/** Integral of a smooth acceleration/deceleration envelope. Only playback
 * changes: all trajectories still consume the same global coordinate time. */
export function playback(p:number):number {
  const r=.1, integral=(x:number)=>x**6-3*x**5+2.5*x**4;
  if(p<r)return r*integral(p/r)/(1-r);
  if(p>1-r)return 1-r*integral((1-p)/r)/(1-r);
  return (p-r/2)/(1-r);
}
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const smooth = (x: number) => { const t = clamp(x); return t*t*t*(10+t*(-15+6*t)); };
export const mix = (a: number, b: number, t: number) => a + (b-a)*t;
export const dot = (a: Embedding, b: Embedding) =>
  -a.u*b.u-a.v*b.v+a.x*b.x+a.y*b.y;

export function fromDisk(q: Vec2): Vec2 {
  const d = 1-q.x*q.x-q.y*q.y;
  if (d <= 0) throw new RangeError("Massive initial data must lie inside the conformal boundary.");
  return { x: 2*q.x/d, y: 2*q.y/d };
}
export function toDisk(p: Vec2): Vec2 {
  const d = 1+Math.hypot(1,p.x,p.y);
  return { x: p.x/d, y: p.y/d };
}
export function createOrbit(q: Vec2, k = LAUNCH): Orbit {
  const p = fromDisk(q);
  return {
    initial: { u: Math.hypot(1,p.x,p.y), v: 0, ...p },
    tangent: { u: 0, v: Math.hypot(1,k*p.x,k*p.y), x: -k*p.y, y: k*p.x },
  };
}
export function atProperTime(orbit: Orbit, s: number): Embedding {
  const c = Math.cos(s), n = Math.sin(s), p=orbit.initial, t=orbit.tangent;
  return { u:p.u*c+t.u*n, v:p.v*c+t.v*n, x:p.x*c+t.x*n, y:p.y*c+t.y*n };
}
export function properTime(orbit: Orbit, tau: number): number {
  const turns = Math.floor(tau/PERIOD);
  const phase = tau-turns*PERIOD;
  let s = Math.atan2(orbit.initial.u*Math.sin(phase), orbit.tangent.v*Math.cos(phase));
  if (s < 0) s += PERIOD;
  return s+turns*PERIOD;
}
export function sampleOrbit(orbit: Orbit, tau: number): Vec2 {
  // Exact recurrence endpoints avoid accumulated rounding in the DOM reset.
  if (tau === 0 || tau === PERIOD) return toDisk(orbit.initial);
  return toDisk(atProperTime(orbit, properTime(orbit,tau)));
}

/** Local area scale of this geodesic congruence in the displayed disk.
 * Glyphs are point markers, not a model of extended material. Scaling their
 * footprints with the map's Jacobian keeps them from covering their neighbors
 * at closest approach; this changes no mass position or worldline.
 */
export function orbitFootprint(orbit: Orbit, tau: number): number {
  const q=toDisk(orbit.initial), h=1e-5;
  const p=sampleOrbit(orbit,tau);
  const dx=sampleOrbit(createOrbit({x:q.x+h,y:q.y}),tau);
  const dy=sampleOrbit(createOrbit({x:q.x,y:q.y+h}),tau);
  const determinant=((dx.x-p.x)*(dy.y-p.y)-(dy.x-p.x)*(dx.y-p.y))/(h*h);
  return Math.sqrt(Math.abs(determinant));
}

/**
 * Radial null rays: chi=atan(r), dchi/dtau=+/-1.
 * Reflection is an explicitly chosen boundary condition at chi=+/-pi/2,
 * never a collision with the viewport. Disk radius=tan(chi/2) is finite
 * even at the exact boundary; there is no arbitrary cutoff or teleport.
 */
export function nullRadius(tau: number): number {
  const t = ((tau % PERIOD)+PERIOD)%PERIOD;
  const chi = t <= Math.PI/2 ? t
    : t <= 3*Math.PI/2 ? Math.PI-t : t-PERIOD;
  return Math.tan(chi/2);
}
export const LIGHT_ANGLE = -Math.PI/5;
export function sampleLight(tau: number, direction: number): Vec2 {
  const radius = nullRadius(tau)*direction;
  return { x: Math.cos(LIGHT_ANGLE)*radius, y: Math.sin(LIGHT_ANGLE)*radius };
}
/** AdS optical metric is a unit hemisphere: null projections are unit-speed
 * great circles. Reflect across its equator by folding z, not by screen bounce.
 * Stereographic projection returns to the SAME spatial Poincare chart as text.
 * Rays launched together refocus at the spatial antipode after pi and at their
 * source after 2pi. Global time remains unwrapped on the universal cover. */
export const PULSE_ORIGIN:Vec2={x:.22,y:-.12};
export const PULSE_RAYS=7;
function opticalRay(index:number){
  const q=PULSE_ORIGIN,d=1+q.x*q.x+q.y*q.y;
  const n={x:2*q.x/d,y:2*q.y/d,z:(1-q.x*q.x-q.y*q.y)/d};
  const r=Math.hypot(n.x,n.y),e={x:-n.y/r,y:n.x/r,z:0};
  const f={x:-n.z*e.y,y:n.z*e.x,z:n.x*e.y-n.y*e.x};
  const a=index*PERIOD/PULSE_RAYS+.18;
  return {n,v:{x:e.x*Math.cos(a)+f.x*Math.sin(a),y:e.y*Math.cos(a)+f.y*Math.sin(a),z:f.z*Math.sin(a)}};
}
export function samplePulse(tau:number,index:number):Vec2 {
  const {n,v}=opticalRay(index),c=Math.cos(tau),s=Math.sin(tau);
  const z=Math.abs(n.z*c+v.z*s),d=1+z;
  return {x:(n.x*c+v.x*s)/d,y:(n.y*c+v.y*s)/d};
}
export function pulseContact(index:number):number {
  const {n,v}=opticalRay(index);
  return (Math.atan2(-n.z,v.z)+Math.PI)%Math.PI;
}

export interface Timeline {
  tau: number;
  exposure: number;
  gather: number;
  collapse: number;
  phase: "enter" | "orbit" | "collapse" | "return" | "complete";
  complete: boolean;
}
export const DURATION = 18000;
export const RELEASE = 350;
export const ORBIT_DURATION = 10850;
export const HORIZON_RADIUS = 0.52;
export const BLACK_HOLE_MASS = (HORIZON_RADIUS+HORIZON_RADIUS**3)/2;
export const horizonDiskRadius = HORIZON_RADIUS/(1+Math.hypot(1,HORIZON_RADIUS));
export const schwarzschildLapse = (r:number) => 1+r*r-2*BLACK_HOLE_MASS/r;
/** Prescribed ingoing spherical null shell: pure AdS interior, Schwarzschild-
 * AdS exterior. chi=atan(r), dchi/dtau=-1. This final shell is a chosen
 * concentrating initial condition, NOT a simulation/proof of turbulent collapse.
 * Marker entrainment below is illustrative, not a self-gravitating N-body solver.
 */
export function shellRadius(progress:number):number {
  return Math.tan((1-clamp(progress))*2*Math.atan(0.96)/2);
}
/** Presentation envelopes shared by the shadow renderer and letter capture.
 * Surrounding emission precedes horizon formation; the shadow only develops
 * after shell crossing. These fades do not alter the physical shell radius. */
export function blackHoleFormation(progress:number){
  const shadow=smooth((horizonDiskRadius-shellRadius(progress))/horizonDiskRadius);
  return {
    emission:smooth(progress/.85),
    shadow,
    core:Math.pow(shadow,.7),
    settle:smooth((progress-.12)/.88),
  };
}
/** Observer-view marker treatment only: absorption is spatial, not a collective
 * opacity switch. The same circular aperture clips letters and drives the rim.
 * This does not pretend to solve self-gravitating trajectories or lensing. */
export function captureAtAperture(distance:number,radius:number,feather:number){
  if(radius<=0)return {opacity:1,edge:0};
  const x=(distance-radius)/feather;
  return {opacity:smooth((x+1)/2),edge:Math.exp(-x*x*1.5)};
}
/** Exact H2 geodesic: Mobius image of a diameter, orthogonal to |q|=1.
 * Spatial metric 4 dq.dq/(1-|q|²)² has Gaussian curvature -1.
 */
export function hyperbolicLine(a:number,t:number):Vec2 {
  const d=1+a*a*t*t;
  return {x:a*(1+t*t)/d,y:t*(1-a*a)/d};
}
export function timeline(ms: number, reduced = false): Timeline {
  // Easing changes only the camera and the wall-clock playback rate.
  // Geometry is always sampled at tau, never integrated with artificial drag.
  const time = reduced ? ms*DURATION/4800 : ms;
  const p = clamp((time-RELEASE)/ORBIT_DURATION);
  const collapse=playback(clamp((time-RELEASE-ORBIT_DURATION)/4400));
  const phaseTime=2*PERIOD*playback(p);
  // Linger around antipodal refocusing and recurrence, without altering paths.
  const tau = phaseTime-.225*Math.sin(2*phaseTime)+collapse*2*Math.atan(0.96);
  const gather = smooth((time-1000)/1700);
  const exposure = smooth(time/1500)*(1-smooth((time-16600)/1400));
  return { tau, gather, exposure, collapse, phase:time<RELEASE?"enter":p<1?"orbit":collapse<1?"collapse":time<DURATION?"return":"complete", complete:time>=DURATION };
}
