import { AdSGravity } from "./adsGravity";
import { AdSTracers } from "./adsTracers";
let solver:AdSGravity|undefined;
let tracers:AdSTracers|undefined;
let midpointA:Float64Array|undefined,midpointV:Float64Array|undefined;
// Only one outstanding request; bounded chunks cannot accumulate a message queue.
self.onmessage=(event:MessageEvent<{target:number;initial?:Float64Array}>)=>{
  solver??=new AdSGravity();
  midpointA??=new Float64Array(solver.a.length);midpointV??=new Float64Array(solver.velocity.length);
  if(event.data.initial)tracers=new AdSTracers(event.data.initial);
  const target=Math.min(event.data.target,solver.time+.04);
  // Eight PDE steps per tracer step; midpoint metric from the SAME PDE clock.
  // No tracer-dependent forces are fed back into the Einstein constraints.
  while(solver.time<target&&solver.status==="running"){
    const start=solver.time;
    for(let i=0;i<4&&solver.time<target&&solver.status==="running";i++)solver.step();
    midpointA.set(solver.a);midpointV.set(solver.velocity);
    for(let i=0;i<4&&solver.time<target&&solver.status==="running";i++)solver.step();
    tracers?.step(solver.time-start,midpointA,midpointV);
  }
  const frame=solver.snapshot();
  if(tracers)frame.tracers=tracers.snapshot(solver.a,solver.velocity);
  const transfer=[frame.radius.buffer,frame.speed.buffer,frame.lapse.buffer];
  if(frame.tracers)transfer.push(frame.tracers.buffer);
  self.postMessage(frame,{transfer});
};
