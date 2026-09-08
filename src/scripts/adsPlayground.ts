/** Post-solver Newtonian-limit AdS accretion sandbox, not numerical GR.
 * V=-M/|q-hole|+|q|²/2 (L=G=1). The second term is the negative-Lambda
 * confining potential, centred on the scene, not the dragged hole. Velocity
 * Verlet preserves inertia; no velocity damping or screen-edge reflections.
 * The absorbing radius obeys r_h+r_h³=2M (Schwarzschild-AdS). Using this radius
 * with Newtonian trajectories is an explicit strong-field approximation.
 * Pointer control supplies external work; neither dragging nor capture is a
 * conservative relativistic evolution. Markers have equal finite mass.
 */
export function accretionRadius(mass:number){
  let r=Math.min(2*mass,Math.cbrt(2*mass));
  for(let i=0;i<10;i++)r-=(r+r*r*r-2*mass)/(1+3*r*r);
  return r;
}
export function accretionAcceleration(x:number,y:number,hx:number,hy:number,mass:number){
  const dx=hx-x,dy=hy-y,d=Math.max(1e-6,Math.hypot(dx,dy)),f=mass/(d*d*d);
  return {x:dx*f-x,y:dy*f-y};
}
export function segmentDistance(px:number,py:number,ax:number,ay:number,bx:number,by:number){
  const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy;
  const t=d?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/d)):0;
  return Math.hypot(px-ax-t*dx,py-ay-t*dy);
}
export interface PlaygroundMarker {element:HTMLElement;x:number;y:number;opacity:number;vx?:number;vy?:number;scale?:string;}
export function preparePlayground(doc:Document,markers:PlaygroundMarker[]){
  const control=doc.createElement("button");
  control.type="button";control.className="ads-drag-hole";control.hidden=true;
  control.setAttribute("aria-label","Move black hole. Drag or use arrow keys to attract matter.");
  doc.body.append(control);
  return {control,flux:new Float32Array(96),remaining:markers.map(m=>({source:m,element:m.element,
    x:0,y:0,opacity:1,qx:0,qy:0,vx:0,vy:0,transform:"",scale:"scale(1)"}))};
}
export function startPlayground(doc:Document,win:Window,markers:PlaygroundMarker[],radius:number,
  initial:{x:number;y:number},paint:(center:{x:number;y:number;radius:number},flux:Float32Array)=>void,
  reducedAt:(now:number)=>boolean=()=>false,prepared=preparePlayground(doc,markers)){
  const abort=new AbortController(),{control,flux,remaining}=prepared;
  control.hidden=false;
  control.style.width=control.style.height=Math.max(44,radius*2)+"px";
  let x=initial.x,y=initial.y,targetX=x,targetY=y,raf=0,settleUntil=0,pointer:number|undefined,offsetX=0,offsetY=0;
  const unit=Math.min(win.innerWidth,win.innerHeight)*.45,initialR=radius/unit;
  let mass=(initialR+initialR**3)/2,last=win.performance.now(),accumulator=0;
  const initialMass=mass;
  let controlX=NaN,controlY=NaN,controlSize=NaN,lastPaint=-Infinity;
  const position=()=>{
    if(controlX!==x){control.style.left=x+"px";controlX=x;}
    if(controlY!==y){control.style.top=y+"px";controlY=y;}
    const size=Math.max(44,radius*2);
    if(controlSize!==size){control.style.width=control.style.height=size+"px";controlSize=size;}
  };position();
  // Visibility is not physical capture. Every tracer enters the sandbox; only
  // its absorbing-boundary integration below removes it and transfers its mass.
  // Obscured exterior tracers recover their base opacity over a short fade.
  for(let i=0;i<remaining.length;i++){
    const state=remaining[i]!,m=state.source;
    const qx=(m.x-initial.x)/unit,qy=(m.y-initial.y)/unit,r=Math.max(initialR,Math.hypot(qx,qy));
    // A distribution of sub-circular angular momenta produces plunges and
    // eccentric passes, not an imposed spiral. This is new sandbox initial data.
    const speed=m.vx===undefined||m.vy===undefined?Math.sqrt(mass/r+r*r)*(.25+.65*((i*.61803398875)%1)):0;
    const sign=i%7===0?-1:1;
    // Tracer handoff supplies projected px/wall-second velocities. Convert to
    // sandbox units; only standalone fixtures use the old launch fallback.
    state.x=m.x;state.y=m.y;state.opacity=m.opacity;state.qx=qx;state.qy=qy;
    state.vx=m.vx===undefined?-qy/r*speed*sign-.04*qx:m.vx/(unit*.42);
    state.vy=m.vy===undefined?qx/r*speed*sign-.04*qy:m.vy/(unit*.42);
    state.transform=m.element.style.transform;
    state.scale=m.scale??m.element.style.transform.match(/scale\([^)]*\)/)?.[0]??"scale(1)";
    if(r>initialR&&m.element.style.opacity!==String(m.opacity)){
      m.element.style.transition="opacity 180ms ease-out";m.element.style.opacity=String(m.opacity);
    }
  }
  const markerMass=initialMass/Math.max(1,remaining.length);
  const draw=(now:number)=>{
    raf=0;
    const reduced=reducedAt(now);
    const wall=Math.min(.05,(now-last)/1000);last=now;
    const oldX=x,oldY=y,follow=1-Math.exp(-wall/0.10);
    x+=(targetX-x)*follow;y+=(targetY-y)*follow;
    accumulator+=wall*.42;
    const h=1/120,hx=(x-initial.x)/unit,hy=(y-initial.y)/unit;
    while(accumulator>=h){
      accumulator-=h;
      for(let i=remaining.length-1;i>=0;i--){
        const m=remaining[i]!;
        let dx=hx-m.qx,dy=hy-m.qy,d=Math.max(1e-6,Math.hypot(dx,dy)),f=mass/(d*d*d);
        const ox=m.qx,oy=m.qy;
        // Already-interior tracers are absorbed before evaluating a singular
        // force. They contribute mass once, without flashing back into view.
        if(d>=radius/unit){
          m.vx+=(dx*f-m.qx)*h/2;m.vy+=(dy*f-m.qy)*h/2;
          m.qx+=m.vx*h;m.qy+=m.vy*h;
        }
        const captured=segmentDistance(hx,hy,ox,oy,m.qx,m.qy)<radius/unit;
        if(captured){
          mass+=markerMass;radius=unit*accretionRadius(mass);
          const bin=Math.floor((Math.atan2(m.qy-hy,m.qx-hx)+Math.PI)*96/(2*Math.PI))%96;
          flux[bin]=flux[bin]!+m.opacity*8;
          m.element.style.transition="opacity 140ms ease-out";m.element.style.opacity="0";
          // Removal order is irrelevant: swap-pop avoids quadratic shifts when
          // many central tracers are absorbed together at the first step.
          remaining[i]=remaining[remaining.length-1]!;remaining.pop();settleUntil=now+1100;continue;
        }
        dx=hx-m.qx;dy=hy-m.qy;d=Math.max(1e-6,Math.hypot(dx,dy));f=mass/(d*d*d);
        m.vx+=(dx*f-m.qx)*h/2;m.vy+=(dy*f-m.qy)*h/2;
      }
    }
    for(const m of remaining){
      m.x=initial.x+m.qx*unit;m.y=initial.y+m.qy*unit;
      const transform=`translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px) ${m.scale}`;
      if(transform!==m.transform){m.element.style.transform=transform;m.transform=transform;}
    }
    position();
    // Only the soft Canvas aperture is rate-limited. Matter integration, DOM
    // letters and pointer response retain their original cadence in both tiers.
    if(!reduced||pointer!==undefined||now-lastPaint>=1000/30-1){
      paint({x,y,radius},flux);flux.fill(0);lastPaint=now;
    }
    if(remaining.length||now<settleUntil||Math.hypot(x-targetX,y-targetY)>.1||Math.hypot(x-oldX,y-oldY)>.1)raf=win.requestAnimationFrame(draw);
  };
  const wake=()=>{settleUntil=win.performance.now()+1100;if(!raf){last=win.performance.now();raf=win.requestAnimationFrame(draw);}};
  const move=(nx:number,ny:number)=>{
    nx=Math.max(radius,Math.min(win.innerWidth-radius,nx));ny=Math.max(radius,Math.min(win.innerHeight-radius,ny));
    targetX=nx;targetY=ny;wake();
  };
  control.addEventListener("pointerdown",event=>{
    if(pointer!==undefined||event.button!==0)return;
    pointer=event.pointerId;offsetX=x-event.clientX;offsetY=y-event.clientY;
    control.setPointerCapture(pointer);control.focus({preventScroll:true});
  },{signal:abort.signal});
  control.addEventListener("pointermove",event=>{if(event.pointerId===pointer)move(event.clientX+offsetX,event.clientY+offsetY);},{signal:abort.signal});
  const release=()=>{pointer=undefined;};
  control.addEventListener("pointerup",release,{signal:abort.signal});
  control.addEventListener("pointercancel",release,{signal:abort.signal});
  control.addEventListener("lostpointercapture",release,{signal:abort.signal});
  control.addEventListener("keydown",event=>{
    const step=event.shiftKey?48:18;
    const dx=event.key==="ArrowLeft"?-step:event.key==="ArrowRight"?step:0;
    const dy=event.key==="ArrowUp"?-step:event.key==="ArrowDown"?step:0;
    if(dx||dy){event.preventDefault();move(targetX+dx,targetY+dy);}
  },{signal:abort.signal});
  wake();
  return ()=>{abort.abort();win.cancelAnimationFrame(raf);control.remove();};
}
