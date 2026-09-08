import test from "node:test";
import assert from "node:assert/strict";
import { AdSGravity } from "../../src/scripts/adsGravity.ts";
import { segmentDistance, accretionRadius, accretionAcceleration } from "../../src/scripts/adsPlayground.ts";

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
