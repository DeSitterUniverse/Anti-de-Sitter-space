import { clamp, mix, smooth, PERIOD, samplePulse, pulseContact, PULSE_RAYS, sampleOrbit, hyperbolicLine, shellRadius, horizonDiskRadius, blackHoleFormation, type Orbit, type Timeline, type Vec2 } from "./antiDeSitterGeometry";

export interface Scene {
  width: number; height: number;
  home: Vec2; homeScale: Vec2;
  center: Vec2; scale: Vec2;
}
export function createScene(width: number, height: number, documentHeight=height, scroll=0): Scene {
  return {
    width, height,
    home: { x:width/2, y:documentHeight/2-scroll },
    homeScale: { x:width*0.84, y:documentHeight*0.84 },
    center: { x:width/2, y:height*0.49 },
    scale: { x:width*0.485, y:height*0.465 },
  };
}
/** Fixed affine display chart of the Poincare disk, shared by all objects.
 * The screen ellipse is a camera choice, not a new metric or a physical wall.
 */
export function screenPoint(q: Vec2, scene: Scene, gather = 1): Vec2 {
  return {
    x:mix(scene.home.x,scene.center.x,gather)+q.x*mix(scene.homeScale.x,scene.scale.x,gather),
    y:mix(scene.home.y,scene.center.y,gather)+q.y*mix(scene.homeScale.y,scene.scale.y,gather),
  };
}

export function createAntiDeSitterRenderer(canvas: HTMLCanvasElement, scene: Scene) {
  const ctx = canvas.getContext("2d", { alpha:true });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const dpr = Math.min(window.devicePixelRatio||1,1.75);
  canvas.width = Math.round(scene.width*dpr);
  canvas.height = Math.round(scene.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const amber = "#dfc6a4", ice = "#a6e9ec";
  const path = (points: Vec2[]) => {
    ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  };
  const edge = (start:number,end:number) => {
    ctx.beginPath();
    ctx.ellipse(scene.center.x,scene.center.y,scene.scale.x,scene.scale.y,0,start,end);
  };
  const glow = (p:Vec2,r:number,color:string,alpha:number) => {
    ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=r*3;
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,PERIOD);ctx.fill();ctx.shadowBlur=0;
  };
  // An editorial aperture, not a stock accretion-disk illustration or ray tracer.
  // Each angular highlight is driven by real letter markers crossing the edge.
  const rimMemory=new Float32Array(96);
  let lastRender=performance.now();
  const blackHole = (opacity:number,progress:number,flux:Float32Array|undefined,dt:number) => {
    const formation=blackHoleFormation(progress);
    const r=Math.min(scene.scale.x,scene.scale.y)*horizonDiskRadius*formation.core;
    if(r<.01)return;
    ctx.save();ctx.translate(scene.center.x,scene.center.y);
    // A soft-edged aperture reveals negative space rather than painting a disk
    // over the matter in one frame. The DOM uses precisely this same edge.
    const shade=ctx.createRadialGradient(0,0,Math.max(0,r-6),0,0,r+6);
    shade.addColorStop(0,"#000");shade.addColorStop(.5,"rgba(0,0,0,.9)");shade.addColorStop(1,"rgba(0,0,0,0)");
    ctx.globalAlpha=opacity;ctx.fillStyle=shade;
    ctx.fillRect(-r-7,-r-7,2*r+14,2*r+14);
    const fade=Math.exp(-dt/.32);
    for(let i=0;i<96;i++){
      const incoming=(flux?.[i]??0)*.07;
      rimMemory[i]=(rimMemory[i]??0)*fade+incoming*(1-fade);
      const strength=1-Math.exp(-(rimMemory[i]??0));
      const angle=i*PERIOD/96;
      // Quiet residual rim is illumination convention, not light from the hole.
      const residual=.045+.09*Math.pow((1+Math.cos(angle+2.1))/2,4);
      ctx.strokeStyle=ice;ctx.lineWidth=.6+strength*1.1;
      ctx.globalAlpha=opacity*formation.shadow*(residual+strength*.8);
      ctx.shadowColor=ice;ctx.shadowBlur=2+strength*7;
      ctx.beginPath();ctx.arc(0,0,r+1,angle,angle+PERIOD/96+.006);ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.restore();
  };
  function render(t: Timeline, representatives: readonly Orbit[], reduced:boolean,flux?:Float32Array) {
    if(!ctx) return;
    ctx.clearRect(0,0,scene.width,scene.height);
    ctx.save();
    const now=performance.now(),dt=Math.min(.1,(now-lastRender)/1000);lastRender=now;
    const alpha=t.exposure*clamp(t.gather*1.5);
    const tau=t.tau;
    const contacts=Array.from({length:PULSE_RAYS},(_,i)=>pulseContact(i));
    const boundaryStrength=Math.max(...contacts.map(contact=>{
      const age=((tau-contact)%Math.PI+Math.PI)%Math.PI;
      return 1-smooth(age/.28);
    }));

    // Intrinsic hyperbolic geometry, not a disconnected embedding illustration.
    // Every mesh curve is an exact spatial geodesic in the glyphs' own chart.
    for(const a of [-0.78,-0.56,-0.3,0,0.3,0.56,0.78]){
      for(const rotate of [false,true]){
        path(Array.from({length:81},(_,i)=>{
          const q=hyperbolicLine(a,-1+2*i/80);
          return screenPoint(rotate?{x:q.y,y:q.x}:q,scene);
        }));
        ctx.strokeStyle=ice;ctx.lineWidth=0.65;
        ctx.globalAlpha=alpha*(.065+.19*(1-smooth(tau/.7))+.07*boundaryStrength)*(1-t.collapse);
        ctx.stroke();
      }
    }

    // A nearly invisible spatial boundary; light contact gives it significance.
    edge(0,PERIOD);ctx.strokeStyle=amber;ctx.globalAlpha=alpha*0.075*(1-smooth(t.collapse/.7));ctx.lineWidth=0.7;ctx.stroke();

    // Only six short histories, each belonging to an actual portfolio letter.
    if(t.phase==="orbit" && !reduced){
      for(const orbit of representatives){
        const start=Math.max(0,tau-0.55);
        path(Array.from({length:28},(_,i)=>screenPoint(sampleOrbit(orbit,mix(start,tau,i/27)),scene)));
        ctx.globalAlpha=alpha*0.22;ctx.strokeStyle=amber;ctx.lineWidth=0.8;ctx.stroke();
      }
    }
    if(t.phase==="orbit" && !reduced){
      for(let ray=0;ray<PULSE_RAYS;ray++){
        if(!reduced){
          const start=Math.max(0,tau-0.22);
          // Separate fading segments make histories taper instead of blunt rods.
          for(let segment=0;segment<4;segment++){
            path(Array.from({length:9},(_,i)=>screenPoint(samplePulse(mix(start,tau,(segment+i/8)/4),ray),scene)));
            ctx.strokeStyle=ice;ctx.globalAlpha=alpha*(segment+1)*.13;ctx.lineWidth=1.15;ctx.stroke();
          }
        }
        glow(screenPoint(samplePulse(tau,ray),scene),1.6,ice,alpha*.8);
        // Contact occurs at intrinsic infinity, not at a viewport rectangle.
        for(const contact of [0,1,2,3].map(turn=>pulseContact(ray)+turn*Math.PI)){
          const age=tau-contact;
          if(age>=0 && age<0.34){
            const hit=samplePulse(contact,ray), angle=Math.atan2(hit.y,hit.x);
            edge(angle-0.06,angle+0.06);
            ctx.strokeStyle=ice;ctx.globalAlpha=alpha*(1-age/0.34);
            ctx.lineWidth=2;ctx.shadowColor=ice;ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0;
          }
        }
      }
      const focusAge=tau%Math.PI;
      if(tau>.1 && focusAge<.18){
        glow(screenPoint(samplePulse(tau-focusAge,0),scene),3,ice,alpha*(1-smooth(focusAge/.18))*.65);
      }
    }
    if(t.collapse>0){
      const radius=shellRadius(t.collapse);
      // Section of an ingoing null shell, not a click ripple or a screen bounce.
      ctx.beginPath();ctx.ellipse(scene.center.x,scene.center.y,scene.scale.x*radius,scene.scale.y*radius,0,0,PERIOD);
      const formation=blackHoleFormation(t.collapse);
      ctx.strokeStyle=ice;ctx.globalAlpha=reduced?0:alpha*0.8*(1-t.collapse)*(1-formation.emission);
      ctx.lineWidth=1.5;ctx.shadowColor=ice;ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;
      blackHole(alpha,t.collapse,flux,dt);
    }
    ctx.restore();
  }
  return { render, destroy:()=>{ctx.clearRect(0,0,scene.width,scene.height);canvas.width=1;canvas.height=1;} };
}
