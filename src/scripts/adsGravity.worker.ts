import { AdSGravity } from "./adsGravity";
let solver:AdSGravity|undefined;
// Only one outstanding request; bounded chunks cannot accumulate a message queue.
self.onmessage=(event:MessageEvent<{target:number}>)=>{
  solver??=new AdSGravity();
  solver.advance(Math.min(event.data.target,solver.time+.04));
  const frame=solver.snapshot();
  self.postMessage(frame,{transfer:[frame.radius.buffer,frame.speed.buffer,frame.lapse.buffer]});
};
