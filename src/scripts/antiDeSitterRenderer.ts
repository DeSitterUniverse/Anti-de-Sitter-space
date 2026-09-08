import { clamp, mix, smooth, PERIOD, hyperbolicLine, type Orbit, type Timeline, type Vec2 } from "./antiDeSitterGeometry";
import { apertureRadius, fieldPoint, sampleRadial } from "./adsLiveState";
import type { GravityFrame } from "./adsGravity";
import type { PerformanceTier } from "./antiDeSitterPerformance";

export interface Scene {
  width:number; height:number; home:Vec2; homeScale:Vec2; center:Vec2; scale:Vec2;
}
export function createScene(width:number,height:number,documentHeight=height,scroll=0):Scene {
  return {width,height,home:{x:width/2,y:documentHeight/2-scroll},
    homeScale:{x:width*.84,y:documentHeight*.84},center:{x:width/2,y:height*.49},
    scale:{x:width*.485,y:height*.465}};
}
export function screenPoint(q:Vec2,scene:Scene,gather=1):Vec2 {
  return {x:mix(scene.home.x,scene.center.x,gather)+q.x*mix(scene.homeScale.x,scene.scale.x,gather),
    y:mix(scene.home.y,scene.center.y,gather)+q.y*mix(scene.homeScale.y,scene.scale.y,gather)};
}
export function createAntiDeSitterRenderer(canvas:HTMLCanvasElement,scene:Scene){
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)throw new Error("Canvas 2D unavailable");
  const dpr=Math.min(window.devicePixelRatio||1,1.75);
  canvas.width=Math.round(scene.width*dpr);canvas.height=Math.round(scene.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const ice="#a6e9ec",amber="#dfc6a4";
  const mesh=new Path2D();
  for(const a of [-.78,-.56,-.3,0,.3,.56,.78])for(const rotate of [false,true]){
    for(let i=0;i<=80;i++){
      const q=hyperbolicLine(a,-1+2*i/80),p=screenPoint(fieldPoint(rotate?{x:q.y,y:q.x}:q),scene);
      if(i===0)mesh.moveTo(p.x,p.y);else mesh.lineTo(p.x,p.y);
    }
  }
  // Signed radial null characteristics dx/dt=±A exp(-δ). They pass through
  // the regular centre and reflect at intrinsic infinity, not screen edges.
  const rays=Array.from({length:5},(_,i)=>({x:.12+i*.055,direction:1,angle:i*PERIOD/5+.3,hit:-10,trail:[] as Vec2[]}));
  const rim=new Float32Array(96);
  let lastTau=0,lastRender=performance.now(),reducedSince:number|undefined;
  function render(t:Timeline,_representatives:readonly Orbit[],reduced:boolean,flux?:Float32Array,tier:PerformanceTier="current",field?:GravityFrame,playCenter?:Vec2 & {radius:number}){
    if(!ctx||!field)return;
    const now=performance.now(),dt=Math.min(.1,(now-lastRender)/1000);lastRender=now;
    if(tier==="reduced")reducedSince??=now;
    const economy=reducedSince===undefined?0:smooth((now-reducedSince)/1000),blur=mix(1,.8,economy);
    const alpha=t.exposure*clamp(t.gather*1.5);
    ctx.clearRect(0,0,scene.width,scene.height);ctx.save();
    // Pure H2 reference geometry yields to the backreacting matter profile;
    // it is NOT an exact embedding of the evolving self-gravitating space.
    ctx.strokeStyle=ice;ctx.lineWidth=.65;
    ctx.globalAlpha=playCenter?0:alpha*.23*(1-smooth(t.tau/1.2));ctx.stroke(mesh);
    if(!reduced&&!playCenter){
      // Sparse equal-energy contours, not independent decorative waves.
      for(const quantile of [.15,.4,.65,.9]){
        const q=fieldPoint({x:sampleRadial(field.radius,quantile),y:0}).x;
        ctx.beginPath();ctx.ellipse(scene.center.x,scene.center.y,scene.scale.x*q,scene.scale.y*q,0,0,PERIOD);
        ctx.globalAlpha=alpha*.07*(1-t.collapse);ctx.strokeStyle=amber;ctx.lineWidth=.6;ctx.stroke();
      }
    }
    const advance=Math.max(0,t.tau-lastTau);lastTau=t.tau;
    for(const ray of playCenter?[]:rays){
      let remaining=advance;
      while(remaining>1e-8){
        const h=Math.min(.003,remaining),speed=(x:number)=>sampleRadial(field.speed,Math.abs(x)*2/Math.PI);
        const mid=ray.x+.5*h*ray.direction*speed(ray.x);
        ray.x+=h*ray.direction*speed(mid);remaining-=h;
        if(Math.abs(ray.x)>Math.PI/2){
          const sign=Math.sign(ray.x);ray.x=sign*(Math.PI-Math.abs(ray.x));ray.direction*=-1;ray.hit=t.tau;
        }
      }
      const q=fieldPoint({x:Math.tan(ray.x/2)*Math.cos(ray.angle),y:Math.tan(ray.x/2)*Math.sin(ray.angle)});
      const p=screenPoint(q,scene);
      if(advance>0){ray.trail.push(p);if(ray.trail.length>24)ray.trail.shift();}
      if(reduced)continue;
      ctx.strokeStyle=ice;ctx.lineCap="round";
      const stride=economy>.5?2:1;
      for(let i=stride;i<ray.trail.length;i+=stride){
        const a=ray.trail[i-stride]!,b=ray.trail[i]!;
        const strength=alpha*(i/ray.trail.length)**1.5*(1-t.collapse*.75);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=ice;ctx.globalAlpha=strength*.16;ctx.lineWidth=7*blur;ctx.stroke();
        ctx.globalAlpha=strength*.8;ctx.lineWidth=1.9;ctx.stroke();
        ctx.strokeStyle="#edffff";ctx.globalAlpha=strength*.85;ctx.lineWidth=.65;ctx.stroke();
      }
      ctx.globalAlpha=alpha*(1-t.collapse*.8);ctx.fillStyle=ice;ctx.shadowColor=ice;ctx.shadowBlur=13*blur;
      ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,PERIOD);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle="#f4ffff";ctx.beginPath();ctx.arc(p.x,p.y,1.2,0,PERIOD);ctx.fill();
      const age=t.tau-ray.hit;
      if(age<.12){
        const angle=ray.angle+(ray.x<0?Math.PI:0);
        ctx.beginPath();ctx.ellipse(scene.center.x,scene.center.y,scene.scale.x,scene.scale.y,0,angle-.045,angle+.045);
        ctx.strokeStyle=ice;ctx.lineWidth=2;ctx.shadowColor=ice;ctx.shadowBlur=9*blur;
        ctx.globalAlpha=alpha*(1-smooth(age/.12));ctx.stroke();ctx.shadowBlur=0;
      }
    }
    // Continuous compactness aperture, NOT an exact ray-traced horizon/shadow.
    // No Schwarzschild switch or wall-time radius growth is integrated here.
    const r=playCenter?.radius??Math.min(scene.scale.x,scene.scale.y)*apertureRadius(field);
    if(r>.01){
      ctx.save();ctx.translate(playCenter?.x??scene.center.x,playCenter?.y??scene.center.y);
      const gradient=ctx.createRadialGradient(0,0,Math.max(0,r-8),0,0,r+8);
      gradient.addColorStop(0,"#000");gradient.addColorStop(.5,"rgba(0,0,0,.9)");gradient.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalAlpha=alpha;ctx.fillStyle=gradient;ctx.fillRect(-r-9,-r-9,2*r+18,2*r+18);
      const fade=Math.exp(-dt/.32);
      for(let i=0;i<96;i++){
        rim[i]=rim[i]!*fade+(flux?.[i]??0)*.07*(1-fade);
        const strength=1-Math.exp(-rim[i]!),angle=i*PERIOD/96;
        ctx.strokeStyle=ice;ctx.lineWidth=.6+strength;
        ctx.globalAlpha=alpha*t.collapse*(.05+strength*.7);ctx.shadowColor=ice;ctx.shadowBlur=(2+strength*6)*blur;
        ctx.beginPath();ctx.arc(0,0,r+1,angle,angle+PERIOD/96+.006);ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  return {render,destroy:()=>{ctx.clearRect(0,0,scene.width,scene.height);canvas.width=1;canvas.height=1;}};
}
