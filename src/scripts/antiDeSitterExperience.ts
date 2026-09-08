import { mix, captureAtAperture, type Vec2 } from "./antiDeSitterGeometry";
import type { GravityFrame } from "./adsGravity";
import { apertureRadius, displayRadius, liveTimeline, sampleRadial } from "./adsLiveState";
import { createAntiDeSitterRenderer, createScene, screenPoint, type Scene } from "./antiDeSitterRenderer";
import { getActiveTheme, THEME_CHANGE_EVENT } from "./themeController";
import { createPerformanceController } from "./antiDeSitterPerformance";
import { startPlayground } from "./adsPlayground";

interface Glyph {
  element: HTMLElement;
  home: Vec2;
  fixed: boolean;
  latent?: boolean;
  lastOpacity?: string;
  quantile?:number;
  angle?:number;
  position?:Vec2;
}
interface Source { text: Text; wrapper: HTMLElement }
interface Run {
  start: number;
  raf: number;
  scroll: number;
  scene: Scene;
  reduced: boolean;
  renderer: ReturnType<typeof createAntiDeSitterRenderer>;
  glyphs: Glyph[];
  sources: Source[];
  attributes: { element: Element; name: string; value: string|null }[];
  abort: AbortController;
  lastFrame: number;
  worker?:Worker;
  playgroundCleanup?:()=>void;
}
const EXCLUDE = "script,style,noscript,svg,input,select,textarea,option,[data-enter-spacetime],.galaxy-settings";
const ROOTS = ".editorial-rail, main, #connect,.theme-selector,.text-tone-selector";
const segmenter = typeof Intl.Segmenter==="function"
  ? new Intl.Segmenter(undefined,{granularity:"grapheme"}) : undefined;
function segments(text:string):{segment:string;index:number}[] {
  if(segmenter)return Array.from(segmenter.segment(text));
  let index=0;
  return Array.from(text,segment=>{const part={segment,index};index+=segment.length;return part;});
}

/**
 * Measure actual glyph bounds BEFORE any DOM changes, retaining kerning and
 * current wrapping. Original Text nodes stay inside transparent inline source
 * wrappers, keeping semantics, selection positions and document flow intact.
 * Temporary aria-hidden DOM glyphs use the measured font and advance. No
 * screenshots, canvas text, innerHTML rewriting, or destructive text splitting.
 */
function capture(run:Run, doc:Document, host:HTMLElement) {
  const win=doc.defaultView!;
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
  const plans:{text:Text;style:CSSStyleDeclaration;fixed:boolean;pieces:{text:string;rect:DOMRect;latent:boolean}[]}[]=[];
  let latentIndex=0;
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    const text=node as Text, parent=text.parentElement;
    if(!parent || !/\S/u.test(text.data) || !parent.closest(ROOTS) || parent.closest(EXCLUDE))continue;
    const style=win.getComputedStyle(parent);
    let fixed=false;
    for(let ancestor:Element|null=parent;ancestor;ancestor=ancestor.parentElement){
      const position=win.getComputedStyle(ancestor).position;
      if(position==="fixed" || position==="sticky"){fixed=true;break;}
    }
    const pieces:{text:string;rect:DOMRect;latent:boolean}[]=[];
    const range=doc.createRange();
    for(const part of segments(text.data)){
      if(!/\S/u.test(part.segment))continue;
      range.setStart(text,part.index);range.setEnd(text,part.index+part.segment.length);
      let rect=range.getBoundingClientRect();
      const latent=rect.width===0 || rect.height===0 || style.visibility!=="visible" || style.display==="none";
      if(latent){
        // Closed disclosures still participate, without opening them or changing
        // document layout. Their unobservable initial positions are assigned near
        // their semantic parent; they only appear once the camera has gathered.
        let anchor:Element|null=parent;
        while(anchor && !anchor.getBoundingClientRect().height)anchor=anchor.parentElement;
        const r=anchor?.getBoundingClientRect()??doc.body.getBoundingClientRect();
        const n=latentIndex++;
        rect=new DOMRect(r.left+Math.min(r.width*0.8,(n%48)*7),r.top+(Math.floor(n/48)%8)*15,7,14);
      }
      pieces.push({text:part.segment,rect,latent});
    }
    if(pieces.length)plans.push({text,style,fixed,pieces});
  }
  const fragment=doc.createDocumentFragment();
  for(const plan of plans){
    // Use a custom inline element to avoid broad existing "li span" selectors.
    const wrapper=doc.createElement("ads-source");
    plan.text.before(wrapper);wrapper.append(plan.text);
    run.sources.push({text:plan.text,wrapper});
    for(const piece of plan.pieces){
      const rect=piece.rect, home={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
      const element=doc.createElement("span");
      element.className="ads-glyph";
      element.textContent=piece.text;
      element.style.font=plan.style.font;
      element.style.fontKerning=plan.style.fontKerning;
      element.style.fontVariationSettings=plan.style.fontVariationSettings;
      element.style.letterSpacing=plan.style.letterSpacing;
      element.style.textTransform=plan.style.textTransform;
      element.style.color=plan.style.color;
      element.style.width=rect.width+"px";element.style.height=rect.height+"px";
      element.style.lineHeight=rect.height+"px";
      element.style.left=-rect.width/2+"px";element.style.top=-rect.height/2+"px";
      element.style.transform="translate("+home.x+"px,"+home.y+"px)";
      fragment.append(element);
      run.glyphs.push({element,home,fixed:plan.fixed,latent:piece.latent});
    }
  }
  host.append(fragment);
  // Small non-text objects stay individual markers, rather than whole cards.
  for(const original of doc.querySelectorAll<HTMLElement>(`${ROOTS.split(",").map(root=>root.trim()+" svg,"+root.trim()+" img,"+root.trim()+" .tone-dot,"+root.trim()+" .dark-theme-dot").join(",")}`)){
    if(original.closest(".galaxy-settings"))continue;
    const rect=original.getBoundingClientRect();if(!rect.width || !rect.height)continue;
    const home={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const element=doc.createElement("span");element.className="ads-glyph";
    const clone=original.cloneNode(true) as Element;
    clone.removeAttribute("id");clone.querySelectorAll("[id]").forEach(node=>node.removeAttribute("id"));
    element.append(clone);element.style.cssText=`width:${rect.width}px;height:${rect.height}px;left:${-rect.width/2}px;top:${-rect.height/2}px;color:${win.getComputedStyle(original).color};`;
    run.attributes.push({element:original,name:"style",value:original.getAttribute("style")});
    original.style.visibility="hidden";
    host.append(element);run.glyphs.push({element,home,fixed:!!original.closest(".editorial-rail,.theme-selector,.text-tone-selector")});
  }
}

export function initializeAntiDeSitterExperience(doc:Document=document, win:Window=window) {
  const button=doc.querySelector<HTMLElement>("[data-enter-spacetime]");
  const exit=doc.querySelector<HTMLButtonElement>("[data-exit-spacetime]");
  const stage=doc.querySelector<HTMLElement>("[data-ads-stage]");
  const canvas=doc.querySelector<HTMLCanvasElement>("#spacetime-experience-canvas");
  const host=doc.querySelector<HTMLElement>("[data-ads-glyphs]");
  const status=doc.querySelector<HTMLElement>("[data-spacetime-status]");
  if(!button || !stage || !canvas || !host || !status)return ()=>{};
  let run:Run|undefined;
  let preparing=false;
  let disposed=false;
  let generation=0;
  const initialButton=button.textContent??"Enter Anti-de Sitter space";
  const initialStatus=status.textContent??"";
  const motion=win.matchMedia("(prefers-reduced-motion: reduce)");

  const remember=(r:Run,element:Element,name:string)=>{
    r.attributes.push({element,name,value:element.getAttribute(name)});
  };
  const finish=()=>{
    const restoreFocus=doc.activeElement===exit||doc.activeElement?.classList.contains("ads-drag-hole");
    generation++;
    const ending=run;run=undefined;preparing=false;
    if(ending){
      win.cancelAnimationFrame(ending.raf);
      ending.abort.abort();
      ending.worker?.terminate();
      ending.playgroundCleanup?.();
      for(const source of ending.sources)source.wrapper.replaceWith(source.text);
      host.replaceChildren();
      ending.renderer.destroy();
      for(const item of ending.attributes.reverse()){
        if(item.value===null)item.element.removeAttribute(item.name);
        else item.element.setAttribute(item.name,item.value);
      }
      stage.hidden=true;
      if(exit){exit.hidden=true;exit.removeAttribute("data-playground");}
      stage.removeAttribute("data-phase");stage.removeAttribute("data-tau");stage.removeAttribute("data-glyph-count");
      win.dispatchEvent(new CustomEvent("galaxy:visibility",{detail:{visible:getActiveTheme(doc)==="galaxy"}}));
    }
    button.textContent=initialButton;button.removeAttribute("aria-busy");
    status.textContent=initialStatus;
    if(restoreFocus)button.focus({preventScroll:true});
  };

  const begin=async()=>{
    if(run||preparing){finish();return;}
    const ticket=++generation;
    preparing=true;button.setAttribute("aria-busy","true");
    // Font geometry must be stable, but a blocked remote font must not hang entry.
    let timeout=0;
    await Promise.race([doc.fonts.ready,new Promise<void>(resolve=>{timeout=win.setTimeout(resolve,1200);})]);
    win.clearTimeout(timeout);
    if(disposed || ticket!==generation)return;
    preparing=false;
    if(doc.hidden){finish();return;}
    try {
      const scene=createScene(win.innerWidth,win.innerHeight,Math.max(doc.documentElement.scrollHeight,win.innerHeight),win.scrollY);
      const attributes=[{element:canvas,name:"width",value:canvas.getAttribute("width")},{element:canvas,name:"height",value:canvas.getAttribute("height")}];
      const renderer=createAntiDeSitterRenderer(canvas,scene);
      const current:Run={start:0,raf:0,scroll:win.scrollY,scene,reduced:motion.matches,renderer,glyphs:[],sources:[],attributes,abort:new AbortController(),lastFrame:-Infinity};
      run=current;
      remember(current,doc.documentElement,"data-spacetime-active");
      remember(current,stage,"style");
      // Keep the original semantic content accessible in reduced-motion mode.
      if(!current.reduced)capture(current,doc,host);
      for(const target of doc.querySelectorAll<HTMLElement>(".editorial-rail,main,#connect,.theme-selector,.text-tone-selector")){
        remember(current,target,"inert");target.inert=true;
      }
      doc.documentElement.setAttribute("data-spacetime-active","true");
      stage.hidden=false;
      if(exit){exit.hidden=false;exit.focus({preventScroll:true});}
      // The sidebar is part of the inert simulation; the separate fixed exit
      // stays readable and interactive above the canvas throughout every phase.
      button.removeAttribute("aria-busy");
      status.textContent="Anti-de Sitter experience started. Press Escape or Return to portfolio to exit.";
      win.dispatchEvent(new CustomEvent("galaxy:visibility",{detail:{visible:false}}));
      const stop=()=>finish();
      win.addEventListener("resize",stop,{signal:current.abort.signal});
      win.addEventListener(THEME_CHANGE_EVENT,stop,{signal:current.abort.signal});
      win.addEventListener("keydown",(event)=>{if(event.key==="Escape")finish();},{signal:current.abort.signal});
      doc.addEventListener("visibilitychange",()=>{if(doc.hidden)finish();},{signal:current.abort.signal});
      motion.addEventListener("change",stop,{signal:current.abort.signal});
      // Every glyph is an equal-energy sample with a fixed angular label.
      // Hash the rank to separate neighboring letters without inventing forces.
      for(let i=0;i<current.glyphs.length;i++){
        const g=current.glyphs[i]!;
        g.quantile=((i*.6180339887498949)%1);
        g.angle=2*Math.PI*((i*.7548776662466927)%1);
      }
      current.start=win.performance.now();
      const worker=new Worker(new URL("./adsGravity.worker.ts",import.meta.url),{type:"module"});
      current.worker=worker;
      let latest:GravityFrame|undefined,previous:GravityFrame|undefined,view:GravityFrame|undefined;
      let received=current.start,pending=true,endAt:number|undefined;
      worker.onmessage=(event:MessageEvent<GravityFrame>)=>{
        if(run!==current)return;
        previous=view?{...view,radius:view.radius.slice(),speed:view.speed.slice(),lapse:view.lapse.slice()}:event.data;
        latest=event.data;
        view??={...latest,radius:latest.radius.slice(),speed:latest.speed.slice(),lapse:latest.lapse.slice()};
        pending=false;received=win.performance.now();
        if(latest.status!=="running")endAt??=received+100;
      };
      worker.onerror=()=>finish();
      worker.postMessage({target:0});
      const performanceController=createPerformanceController(current.start);
      const flux=new Float32Array(96);
      const frame=(now:number)=>{
        if(run!==current)return;
        try {
          const elapsed=now-current.start;
          if(!latest||!previous||!view){
            if(elapsed>5000){finish();return;}
            current.raf=win.requestAnimationFrame(frame);return;
          }
          const blend=Math.min(1,(now-received)/80);
          for(const key of ["radius","speed","lapse"] as const){
            for(let i=0;i<view[key].length;i++)view[key][i]=mix(previous[key][i]!,latest[key][i]!,blend);
          }
          view.time=mix(previous.time,latest.time,blend);
          view.minA=mix(previous.minA,latest.minA,blend);
          view.peakX=mix(previous.peakX,latest.peakX,blend);
          view.mass=latest.mass;view.status=latest.status;
          if(!pending&&latest.status==="running"&&now-received>=80){
            pending=true;worker.postMessage({target:Math.max(0,(elapsed-1800)*.36)});
          }
          // Wall-time budget is a clean exit, never a forced physical collapse.
          if(elapsed>35000)endAt??=now;
          if(current.reduced&&elapsed>2800)endAt??=now;
          const t=liveTimeline(elapsed,view,endAt===undefined?undefined:Math.max(0,now-endAt));
          const performanceTier=current.reduced?"current":performanceController.sample(now);
          if(!current.reduced&&latest.status==="concentrated"&&endAt!==undefined&&now-endAt>400){
            // The PDE ends here. The optional absorption toy retains its final
            // composition but does not pretend to evolve post-horizon gravity.
            worker.terminate();
            stage.dataset.phase="playground";exit?.setAttribute("data-playground","");
            const frozen={...t,phase:"orbit" as const,exposure:1,gather:1,complete:false};
            current.playgroundCleanup=startPlayground(doc,win,current.glyphs.map(g=>({
              element:g.element,x:g.position?.x??g.home.x,y:g.position?.y??g.home.y,opacity:Number(g.lastOpacity??1)
            })),Math.min(scene.scale.x,scene.scale.y)*apertureRadius(view),scene.center,
            (center,light)=>renderer.render(frozen,[],false,light,performanceTier,view,center));
            return; // No idle rAF or worker; input wakes a bounded rim fade.
          }
          if(t.complete){finish();return;}
          if(t.phase==="return" && current.sources.length){
            // Reset behind the opaque veil, then reveal the original document.
            for(const source of current.sources.splice(0))source.wrapper.replaceWith(source.text);
            host.replaceChildren();current.glyphs.length=0;
            for(const item of current.attributes){
              if(item.name!=="style" || item.element===stage)continue;
              if(item.value===null)item.element.removeAttribute(item.name);
              else item.element.setAttribute(item.name,item.value);
            }
          }
          // Interpolated solver snapshots drive every visual on one clock.
          if(!current.reduced || now-current.lastFrame>=80){
            current.lastFrame=now;
            stage.dataset.phase=t.phase;stage.dataset.tau=t.tau.toFixed(5);stage.dataset.glyphCount=String(current.glyphs.length);
            stage.style.setProperty("--ads-veil",String(t.exposure));
            const cameraScale=Math.sqrt(
              mix(1,scene.scale.x/scene.homeScale.x,t.gather)*
              mix(1,scene.scale.y/scene.homeScale.y,t.gather)
            );
            const scrollDelta=win.scrollY-current.scroll;
            const coreRadius=Math.min(scene.scale.x,scene.scale.y)*apertureRadius(view);
            flux.fill(0);
            const scale=mix(1,Math.max(.52,cameraScale),t.gather);
            for(const glyph of current.glyphs){
              const radius=displayRadius(sampleRadial(view.radius,glyph.quantile!));
              const target=screenPoint({x:radius*Math.cos(glyph.angle!),y:radius*Math.sin(glyph.angle!)},scene);
              const p={x:mix(glyph.home.x,target.x,t.gather),y:mix(glyph.home.y,target.y,t.gather)};
              // Fixed readable marker footprints: the old shared Jacobian made
              // entire paragraphs breathe as sheets and shrank letters to dust.
              const dx=p.x-scene.center.x,dy=p.y-scene.center.y;
              const capture=captureAtAperture(Math.hypot(dx,dy),coreRadius,9);
              if(capture.edge>0){
                const bin=Math.floor((Math.atan2(dy,dx)+Math.PI)*96/(2*Math.PI))%96;
                flux[bin]=(flux[bin]??0)+capture.edge*(glyph.latent?.45:1);
              }
              const opacity=String(capture.opacity*(glyph.latent?t.gather*.45:1));
              if(opacity!==glyph.lastOpacity){glyph.element.style.opacity=opacity;glyph.lastOpacity=opacity;}
              // Scrolling moves the camera's home frame, not the AdS state.
              const y=p.y-(glyph.fixed?0:scrollDelta)*(1-t.gather);
              glyph.position={x:p.x,y};
              glyph.element.style.transform="translate("+p.x.toFixed(3)+"px,"+y.toFixed(3)+"px) scale("+scale.toFixed(4)+")";
            }
            renderer.render(t,[],current.reduced,flux,performanceTier,view);
          }
          current.raf=win.requestAnimationFrame(frame);
        } catch(error){finish();console.error("AdS experience restored after rendering error",error);}
      };
      current.raf=win.requestAnimationFrame(frame);
    }catch(error){
      finish();
      status.textContent="The experience could not start in this browser. The portfolio has been restored.";
      console.error("AdS experience could not start",error);
    }
  };
  const activate=(event:Event)=>{event.preventDefault();void begin();};
  const leave=()=>{finish();button.focus({preventScroll:true});};
  button.addEventListener("click",activate);
  exit?.addEventListener("click",leave);
  return ()=>{disposed=true;button.removeEventListener("click",activate);exit?.removeEventListener("click",leave);finish();};
}
