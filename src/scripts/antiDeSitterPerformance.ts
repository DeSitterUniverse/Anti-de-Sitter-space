export type PerformanceTier = "current" | "reduced";

/** Deliberately conservative, per-run controller. No observers, probes, timers,
 * logging, allocations per sample, persistence, or assumptions about hardware.
 * 30fps is acceptable here: only sustained performance substantially below it
 * qualifies. A one-off stall discards the evidence instead of forcing a downgrade.
 * Reduced motion is a separate accessibility setting and bypasses this monitor.
 */
export function createPerformanceController(start:number){
  let tier:PerformanceTier="current";
  let previous=start, windowStart=start+3000;
  let samples=0,slow=0,total=0,badWindows=0;
  const reset=(now:number)=>{windowStart=now;samples=0;slow=0;total=0;};
  return {
    sample(now:number):PerformanceTier {
      if(tier==="reduced")return tier;
      const interval=now-previous;previous=now;
      if(now-start<3000)return tier;
      // Long tasks, debugger pauses and visibility interruptions are not proof
      // of weak hardware. Rebuild the full sustained evidence after any of them.
      if(interval<=0 || interval>100){badWindows=0;reset(now);return tier;}
      samples++;total+=interval;if(interval>36)slow++;
      if(now-windowStart<1500)return tier;
      const bad=samples>=20 && slow/samples>=.75 && total/samples>38;
      badWindows=bad?badWindows+1:0;
      reset(now);
      if(badWindows>=3)tier="reduced";
      return tier;
    },
  };
}
