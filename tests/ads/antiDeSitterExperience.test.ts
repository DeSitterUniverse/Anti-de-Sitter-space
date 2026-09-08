import test from "node:test";
import assert from "node:assert/strict";
import { AdSGravity } from "../../src/scripts/adsGravity.ts";
import { AdSTracers, tracerInitialData } from "../../src/scripts/adsTracers.ts";
import { preparePlayground, startPlayground } from "../../src/scripts/adsPlayground.ts";

test("exterior initial data leaves more tracers outside the same solved concentration",()=>{
  const previous=new Float64Array(600*4),next=previous.slice();
  for(let i=0;i<600;i++){
    const angle=i*2.39996323,R=.03+.85*((i*.7548776662)%1),nx=Math.cos(angle),ny=Math.sin(angle);
    const q=.18*R/(1-.82*R),r=2*q/(1-q*q);
    const pt=(i%7===0?-1:1)*(.12+.5*((i*.61803398875)%1)),pr=.16*(2*((i*.7548776662)%1)-1);
    previous.set([nx*r,ny*r,nx*pr-ny*pt,ny*pr+nx*pt],i*4);
    next.set(tracerInitialData(i,nx*R,ny*R),i*4);
    if(i%3!==0)for(let j=0;j<4;j++)assert.ok(Math.abs(previous[i*4+j]!-next[i*4+j]!)<1e-12);
  }
  const solver=new AdSGravity(),before=new AdSTracers(previous),after=new AdSTracers(next);
  const a=solver.a.slice(),v=solver.velocity.slice();
  while(solver.status==="running"){
    const start=solver.time;
    for(let j=0;j<4&&solver.status==="running";j++)solver.step();
    a.set(solver.a);v.set(solver.velocity);
    for(let j=0;j<4&&solver.status==="running";j++)solver.step();
    before.step(solver.time-start,a,v);after.step(solver.time-start,a,v);
  }
  assert.equal(solver.status,"concentrated");
  // At minA < .08 the aperture compactness is saturated; use its display chart.
  const q=Math.tan(solver.peakX/2),radius=q/(.18+.82*q);
  const count=(tracers:AdSTracers)=>{
    const s=tracers.snapshot(solver.a,solver.velocity);let n=0;
    assert.ok(s.every(Number.isFinite));
    for(let i=0;i<s.length;i+=4)if(Math.hypot(s[i]!,s[i+1]!)>radius)n++;
    return n;
  };
  assert.ok(count(after)>count(before),`${count(before)} -> ${count(after)} exterior tracers`);
});

test("handoff retains invisible exterior tracers and counts interior mass exactly once",()=>{
  const element=()=>({style:{transform:"scale(1)",opacity:"0",transition:""},hidden:false,
    setAttribute(){},addEventListener(){},remove(){this.hidden=true;}});
  const doc={createElement:element,body:{append(){}}} as unknown as Document;
  let callback:FrameRequestCallback=()=>{},radius=0;
  const win={innerWidth:1000,innerHeight:1000,performance:{now:()=>0},
    requestAnimationFrame:(cb:FrameRequestCallback)=>{callback=cb;return 1;},cancelAnimationFrame(){}} as unknown as Window;
  const outside=element(),inside=element();
  const markers=[{element:outside as unknown as HTMLElement,x:850,y:500,opacity:1,vx:0,vy:0},
    {element:inside as unknown as HTMLElement,x:500,y:500,opacity:1,vx:0,vy:0}];
  const prepared=preparePlayground(doc,markers);assert.equal(prepared.control.hidden,true);
  const cleanup=startPlayground(doc,win,markers,40,{x:500,y:500},c=>{radius=c.radius;},()=>false,prepared);
  assert.equal(outside.style.opacity,"1");assert.equal(inside.style.opacity,"0");
  callback(30);assert.equal(prepared.remaining.length,1);assert.ok(radius>40);
  const grown=radius;callback(60);assert.equal(radius,grown);
  assert.equal(prepared.remaining[0]!.element,outside);
  cleanup();assert.equal(prepared.control.hidden,true);
});

test("Hamiltonian tracers match pure-AdS geodesics and conserve angular momentum",()=>{
  const a=new Float64Array(385).fill(1),v=a.slice();
  const orbit=createOrbit({x:1/(1+Math.sqrt(2)),y:0},.3);
  for(const dt of [.004,.002]){
    const tracers=new AdSTracers(new Float64Array([1,0,0,.3]));
    let t=0;
    while(t<2*Math.PI){const h=Math.min(dt,2*Math.PI-t);tracers.step(h,a,v);t+=h;}
    const s=tracers.state,expected=fromDisk(sampleOrbit(orbit,t));
    assert.ok(Math.hypot(s[0]!-expected.x,s[1]!-expected.y)<.001);
    assert.ok(Math.abs(s[0]!*s[3]!-s[1]!*s[2]!-.3)<.00002);
  }
});
test("tracers cross the regular centre and remain timelike",()=>{
  const a=new Float64Array(385).fill(1),v=a.slice(),rate=new Float64Array(4);
  const tracer=new AdSTracers(new Float64Array([.2,0,-.1,0]));
  let crossed=false;
  for(let i=0;i<1000;i++){
    tracer.step(.002,a,v);const s=tracer.state;
    crossed ||= s[0]!<0;
    tracer.derivative(s,0,a,v,rate);
    const r=Math.hypot(s[0]!,s[1]!),F=1+r*r,vr=r?(s[0]!*rate[0]!+s[1]!*rate[1]!)/r:0;
    assert.ok(-F+rate[0]!**2+rate[1]!**2+(1/F-1)*vr*vr<0);
    assert.ok(s.every(Number.isFinite));
  }
  assert.ok(crossed);
});
test("tracer display velocities agree with projected motion for handoff",()=>{
  const a=new Float64Array(385).fill(1),v=a.slice();
  const t=new AdSTracers(new Float64Array([.8,.3,-.1,.4]));
  const before=t.snapshot(a,v);t.step(.0001,a,v);const after=t.snapshot(a,v);
  assert.ok(Math.abs((after[0]!-before[0]!)/.0001-before[2]!)<.001);
  assert.ok(Math.abs((after[1]!-before[1]!)/.0001-before[3]!)<.001);
});
import { segmentDistance, accretionRadius, accretionAcceleration } from "../../src/scripts/adsPlayground.ts";
test("very slow sustained frames can enter reduced mode without classifying one pause",()=>{
  const c=createPerformanceController(0);
  for(let t=125;t<9000;t+=125)c.sample(t);
  assert.equal(c.sample(9000),"reduced");
  const fresh=createPerformanceController(0);
  for(let t=16;t<5000;t+=16)fresh.sample(t);
  assert.equal(fresh.sample(5200),"current");
  for(let t=5216;t<10000;t+=16)assert.equal(fresh.sample(t),"current");
});

test("accretion radius follows Schwarzschild-AdS mass rather than time",()=>{
  for(const mass of [.001,.05,.2,1,10]){
    const r=accretionRadius(mass);
    assert.ok(Math.abs(r+r**3-2*mass)<1e-9);
    assert.ok(accretionRadius(mass*2)>r);
  }
});
test("sandbox force attracts matter and retains AdS vacuum confinement",()=>{
  const vacuum=accretionAcceleration(1,2,0,0,0);
  assert.deepEqual(vacuum,{x:-1,y:-2});
  const gravity=accretionAcceleration(1,0,0,0,.2);
  assert.equal(gravity.x,-1.2);assert.equal(gravity.y,0);
});

test("playground swept capture does not skip letters during fast drags",()=>{
  assert.equal(segmentDistance(50,0,0,0,100,0),0);
  assert.equal(segmentDistance(50,20,0,0,100,0),20);
  assert.equal(segmentDistance(110,0,0,0,100,0),10);
  assert.equal(segmentDistance(3,4,0,0,0,0),5);
});

test("live gravity preserves vacuum and the weak-field AdS normal mode",()=>{
  const vacuum=new AdSGravity(96,0);vacuum.advance(1);
  assert.equal(vacuum.status,"running");assert.equal(vacuum.minA,1);
  const errors:number[]=[];
  for(const n of [96,192]){
    const s=new AdSGravity(n,.0001,Infinity);s.advance(.8);
    let error=0;
    for(let i=0;i<n;i++){
      const x=i*s.dx,expected=.0001*Math.cos(x)**3*Math.cos(3*s.time);
      error+=(s.pi[i]!-expected)**2*s.dx;
    }
    errors.push(Math.sqrt(error));
    assert.equal(s.status,"running");
  }
  assert.ok(errors[1]!<errors[0]!*.4,`${errors}`);
});
test("live collapse is resolution-consistent, conserves mass, and depends on initial data",()=>{
  const outcomes=[];
  for(const n of [384,768]){
    const s=new AdSGravity(n);s.advance(7);
    assert.equal(s.status,"concentrated");
    assert.ok(Math.abs(s.mass[n]!/s.initialMass-1)<.001);
    assert.ok(s.time>Math.PI); // Not immediate collapse: returning field.
    const frame=s.snapshot();
    for(let i=1;i<frame.radius.length;i++)assert.ok(frame.radius[i]!>=frame.radius[i-1]!);
    outcomes.push(s.time);
  }
  assert.ok(Math.abs(outcomes[0]!-outcomes[1]!)/outcomes[1]!<.01);
  const weak=new AdSGravity(192,2);weak.advance(6);
  assert.equal(weak.status,"running");assert.ok(weak.minA>.9);
});
import { createPerformanceController } from "../../src/scripts/antiDeSitterPerformance.ts";
import { letterLaunch, playback, samplePulse, pulseContact, PULSE_ORIGIN, PULSE_RAYS, blackHoleFormation, captureAtAperture } from "../../src/scripts/antiDeSitterGeometry.ts";
import { atProperTime, createOrbit, dot, DURATION, fromDisk, LAUNCH, nullRadius, ORBIT_DURATION, PERIOD, properTime, RELEASE, sampleLight, sampleOrbit, timeline, toDisk, hyperbolicLine, shellRadius, schwarzschildLapse, HORIZON_RADIUS, horizonDiskRadius } from "../../src/scripts/antiDeSitterGeometry.ts";
const near=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const seeds=[{x:0,y:0},{x:.02,y:-.7},{x:.65,y:.6},{x:-.4,y:.2}];
test("performance tier ignores startup, healthy 30/60/120Hz and isolated stalls",()=>{
  for(const interval of [1000/120,1000/60,1000/30]){
    const c=createPerformanceController(0);
    for(let now=interval;now<18000;now+=interval)assert.equal(c.sample(now),"current");
  }
  const c=createPerformanceController(0);let now=0;
  for(;now<2900;now+=50)assert.equal(c.sample(now),"current");
  for(;now<18000;now+=16.67){
    if(now>8000 && now<8020)now+=400;
    assert.equal(c.sample(now),"current");
  }
});
test("performance tier requires sustained bad windows, never upgrades during a run",()=>{
  const c=createPerformanceController(0);
  for(let now=50;now<7500;now+=50)assert.equal(c.sample(now),"current");
  assert.equal(c.sample(7500),"reduced");
  for(let now=7516;now<18000;now+=16)assert.equal(c.sample(now),"reduced");
  assert.equal(createPerformanceController(18000).sample(18016),"current");
});
test("short bursts and a long stall break consecutive downgrade evidence",()=>{
  const c=createPerformanceController(0);let now=0;
  for(;now<6000;now+=50)assert.equal(c.sample(now),"current");
  now+=300;assert.equal(c.sample(now),"current");
  for(let end=now+2500;now<end;now+=50)assert.equal(c.sample(now),"current");
  for(;now<18000;now+=16.67)assert.equal(c.sample(now),"current");
});
test("aperture captures individual distances continuously and illuminates only its edge",()=>{
  near(captureAtAperture(0,0,9).opacity,1);
  near(captureAtAperture(70,100,9).opacity,0);
  near(captureAtAperture(130,100,9).opacity,1);
  near(captureAtAperture(100,100,9).opacity,.5);
  near(captureAtAperture(100,100,9).edge,1);
  assert.ok(captureAtAperture(99,100,9).opacity<captureAtAperture(101,100,9).opacity);
  assert.ok(captureAtAperture(130,100,9).edge<.001);
});
test("formation emits light before a smooth post-crossing shadow",()=>{
  near(blackHoleFormation(0).emission,0);near(blackHoleFormation(0).shadow,0);
  near(blackHoleFormation(1).shadow,1);
  let previous=0;
  for(let p=0;p<=1;p+=.001){
    const f=blackHoleFormation(p);
    assert.ok(f.shadow>=previous && f.shadow-previous<.02);
    if(shellRadius(p)>horizonDiskRadius)near(f.shadow,0);
    previous=f.shadow;
  }
  assert.ok(blackHoleFormation(.4).emission>.3);
});
test("off-centre pulse is null, reflects at infinity and refocuses coherently",()=>{
  const contacts=new Set<number>();
  for(let ray=0;ray<PULSE_RAYS;ray++){
    const contact=pulseContact(ray);contacts.add(contact);
    near(Math.hypot(...Object.values(samplePulse(contact,ray))),1);
    for(const tau of [0,Math.PI,PERIOD]){
      const p=samplePulse(tau,ray),sign=tau===Math.PI?-1:1;
      near(p.x,sign*PULSE_ORIGIN.x);near(p.y,sign*PULSE_ORIGIN.y);
    }
    for(let tau=.01;tau<2*PERIOD;tau+=.037){
      if(Math.abs(Math.sin(tau-contact))<.001)continue;
      const h=1e-6,q=samplePulse(tau,ray),a=samplePulse(tau-h,ray),b=samplePulse(tau+h,ray);
      const speed2=((b.x-a.x)**2+(b.y-a.y)**2)/(4*h*h),r2=q.x*q.x+q.y*q.y;
      near(4*speed2-(1+r2)**2,0,1e-7);
      assert.ok(r2<=1+1e-10);
    }
  }
  assert.equal(contacts.size,PULSE_RAYS);
});
test("short sequence releases before gathering and reserves a quiet ending",()=>{
  assert.equal(DURATION,18000);
  assert.ok(timeline(900).tau>0);near(timeline(900).gather,0);
  assert.equal(timeline(16000).phase,"return");near(timeline(16000).exposure,1);
});
test("neighbouring letters have independent normalized recurring geodesics",()=>{
  const velocities=new Set<number>();
  for(let i=0;i<200;i++){
    const k=letterLaunch(i);velocities.add(k);near(k,letterLaunch(i));
    assert.ok(Math.abs(k)<1 && Math.abs(k)>.1);
    const q={x:.3,y:.4},o=createOrbit(q,k);
    near(dot(o.tangent,o.tangent),-1);near(dot(o.initial,o.tangent),0);
    const end=sampleOrbit(o,PERIOD);near(end.x,q.x);near(end.y,q.y);
  }
  assert.equal(velocities.size,200);
  const a=sampleOrbit(createOrbit(seeds[2],letterLaunch(0)),.8);
  const b=sampleOrbit(createOrbit(seeds[2],letterLaunch(1)),.8);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>.01);
});
test("playback release and arrest are smooth and monotone",()=>{
  near(playback(0),0);near(playback(1),1);
  assert.ok(playback(.0001)/.0001<.001);
  let last=-1;for(let p=0;p<=1;p+=.001){assert.ok(playback(p)>=last);last=playback(p);}
});

test("equatorial AdS4 embedding and normalized future-directed timelike tangent",()=>{
  for(const q of seeds){
    const o=createOrbit(q);
    near(dot(o.initial,o.initial),-1);near(dot(o.tangent,o.tangent),-1);near(dot(o.initial,o.tangent),0);
    assert.ok(o.tangent.v>0);
    for(let s=0;s<PERIOD;s+=.07)near(dot(atProperTime(o,s),atProperTime(o,s)),-1,1e-8);
  }
});
test("exact geodesic solves Z''=-Z with conserved energy and angular momentum",()=>{
  for(const q of seeds){
    const o=createOrbit(q), h=1e-4;
    for(let s=.2;s<PERIOD;s+=.17){
      const z=atProperTime(o,s), before=atProperTime(o,s-h), after=atProperTime(o,s+h);
      for(const k of ["u","v","x","y"] as const)near((after[k]-2*z[k]+before[k])/(h*h),-z[k],1e-5);
      // T(s)=-P sin(s)+T cos(s) is Z(s+pi/2).
      const v=atProperTime(o,s+Math.PI/2);
      near(dot(v,v),-1,1e-8);near(dot(z,v),0,1e-8);
      near(z.u*v.v-z.v*v.u,o.initial.u*o.tangent.v,1e-8);
      near(z.x*v.y-z.y*v.x,LAUNCH*(o.initial.x**2+o.initial.y**2),1e-8);
    }
  }
});
test("all letters occupy the same global-time slice on the universal cover",()=>{
  for(const q of seeds){
    const o=createOrbit(q);let previous=-1;
    for(let tau=0;tau<PERIOD*3;tau+=.031){
      const s=properTime(o,tau);assert.ok(s>previous);previous=s;
      const p=atProperTime(o,s), time=Math.atan2(p.v,p.u);
      near(Math.sin(time),Math.sin(tau));near(Math.cos(time),Math.cos(tau));
    }
  }
});
test("Poincare projection is invertible and massive orbits stay bounded",()=>{
  for(const q of seeds){
    const restored=toDisk(fromDisk(q));near(q.x,restored.x);near(q.y,restored.y);
    const o=createOrbit(q), start=Math.hypot(q.x,q.y);
    for(let tau=0;tau<PERIOD;tau+=.04){
      const p=sampleOrbit(o,tau);assert.ok(Math.hypot(p.x,p.y)<=start+1e-10);
    }
    const anti=sampleOrbit(o,Math.PI), end=sampleOrbit(o,PERIOD);
    near(anti.x,-q.x);near(anti.y,-q.y);near(end.x,q.x);near(end.y,q.y);
  }
  assert.throws(()=>fromDisk({x:1,y:0}),RangeError);
});
test("radial null signals have zero metric norm and exact boundary return times",()=>{
  near(nullRadius(0),0);near(nullRadius(Math.PI/2),1);near(nullRadius(Math.PI),0);
  near(nullRadius(3*Math.PI/2),-1);near(nullRadius(PERIOD),0);
  for(const tau of [.1,.7,1.2,2,2.8,3.6,4.2,5.3,6]){
    const h=1e-5, q=nullRadius(tau), speed=(nullRadius(tau+h)-nullRadius(tau-h))/(2*h);
    // The conformal factor cancels; this equals ds²/dtau² times (1-q²)².
    near(-((1+q*q)**2)+4*speed*speed,0,1e-7);
    const a=sampleLight(tau,1), b=sampleLight(tau,-1);near(a.x,-b.x);near(a.y,-b.y);
  }
});
test("two recurrences precede collapse and the reset veil fades completely",()=>{
  near(timeline(0).tau,0);near(timeline(RELEASE).tau,0);
  near(timeline(RELEASE+ORBIT_DURATION).tau,2*PERIOD);
  near(timeline(RELEASE+ORBIT_DURATION).gather,1);
  near(timeline(DURATION).exposure,0);
  assert.equal(timeline(DURATION).complete,true);
  let previous=-1;
  for(let ms=0;ms<DURATION;ms+=17){
    const t=timeline(ms);assert.ok(t.tau>=previous);previous=t.tau;
  }
  near(timeline(4800,true).collapse,1);assert.equal(timeline(4800,true).complete,true);
});
test("hyperbolic mesh arcs lie on boundary-orthogonal circles",()=>{
  for(const a of [-.78,-.3,.3,.78]){
    const center=(1+a*a)/(2*a), radius=Math.abs((1-a*a)/(2*a));
    near(center*center-radius*radius,1);
    for(let t=-1;t<=1;t+=.025){
      const q=hyperbolicLine(a,t);near((q.x-center)**2+q.y*q.y,radius*radius);
    }
    const end=hyperbolicLine(a,1);near(Math.hypot(end.x,end.y),1);
  }
});
test("ingoing shell is null in its AdS interior and crosses the SAdS horizon",()=>{
  near(schwarzschildLapse(HORIZON_RADIUS),0);
  near(toDisk({x:HORIZON_RADIUS,y:0}).x,horizonDiskRadius);
  near(shellRadius(0),.96);near(shellRadius(1),0);
  const duration=2*Math.atan(.96), h=1e-5;
  for(let p=.05;p<.95;p+=.05){
    const q=shellRadius(p), speed=(shellRadius(p+h)-shellRadius(p-h))/(2*h*duration);
    near(-((1+q*q)**2)+4*speed*speed,0,1e-7);
  }
  assert.ok(schwarzschildLapse(HORIZON_RADIUS*.9)<0);
  assert.ok(schwarzschildLapse(HORIZON_RADIUS*1.1)>0);
});
