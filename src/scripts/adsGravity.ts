/** Live spherical Einstein–massless-scalar evolution in AdS4 (L=1, 8piG=2).
 * ds²=sec²x[-A exp(-2δ)dt²+A^-1 dx²+sin²x dΩ²], x∈[0,pi/2].
 * Φ_t=(vΠ)_x; Π_t=tan^-2(x)(tan²(x)vΦ)_x; v=A exp(-δ).
 * m_x=tan²(x) A(Φ²+Π²); A=1-m cos³(x)/sin(x).
 * δ_x=-sin(x)cos(x)(Φ²+Π²), δ(boundary)=0 (boundary clock).
 * Sources: arxiv.org/abs/1308.1235, equations 8–13 (their m=2GM).
 * Second-order centered space, RK4 time; midpoint exponential integration of
 * the linear mass constraint preserves positive A for resolved data. Regular
 * origin parity and normalizable reflecting AdS boundary; no dissipative force.
 * The unwrapped time is on the universal cover. Stop BEFORE a coordinate
 * horizon; A<0.08 is a near-horizon diagnostic, never an exact horizon claim.
 */
export interface GravityFrame {
  tracers?:Float32Array;
  time:number; mass:number; minA:number; peakX:number;
  radius:Float32Array; speed:Float32Array; lapse:Float32Array;
  status:"running"|"concentrated"|"limit"|"invalid";
}
export class AdSGravity {
  readonly n:number; readonly dx:number;
  readonly phi:Float64Array; readonly pi:Float64Array;
  readonly a:Float64Array; readonly delta:Float64Array;
  readonly mass:Float64Array; readonly velocity:Float64Array;
  private readonly sin:Float64Array; private readonly cos:Float64Array;
  private readonly midSC:Float64Array; private readonly midTan2:Float64Array;
  private readonly tan2:Float64Array; private readonly divergence:Float64Array;
  private readonly work:Float64Array[];
  time=0; initialMass=0; minA=1; peakX=0;
  status:GravityFrame["status"]="running";
  constructor(n=384, amplitude=8, width=.3) {
    this.n=n;this.dx=Math.PI/(2*n);
    const alloc=()=>new Float64Array(n+1);
    this.phi=alloc();this.pi=alloc();this.a=alloc();this.delta=alloc();
    this.mass=alloc();this.velocity=alloc();this.sin=alloc();this.cos=alloc();
    this.midSC=alloc();this.midTan2=alloc();this.tan2=alloc();this.divergence=alloc();
    this.work=Array.from({length:10},alloc);
    for(let i=0;i<=n;i++){
      const x=i*this.dx,s=Math.sin(x),c=Math.cos(x);
      this.sin[i]=s;this.cos[i]=c;
      this.pi[i]=amplitude*Math.exp(-((Math.tan(x)/width)**2))*c**3;
      const ms=Math.sin((i-.5)*this.dx),mc=Math.cos((i-.5)*this.dx);
      this.midSC[i]=ms*mc;this.midTan2[i]=(ms/mc)**2;
      this.tan2[i]=(s/c)*(s/c);
    }
    for(let i=1;i<n;i++){
      const lo=this.sin[i-1]!/this.cos[i-1]!,hi=this.sin[i+1]!/this.cos[i+1]!;
      this.divergence[i]=(hi**3-lo**3)*this.cos[i]!**2;
    }
    this.metric(this.phi,this.pi);this.initialMass=this.mass[n]!;
  }
  private metric(p:Float64Array,q:Float64Array){
    const {n,dx}=this;this.mass[0]=0;this.delta[0]=0;this.a[0]=1;
    for(let i=1;i<=n;i++){
      const energy=((p[i-1]!**2+q[i-1]!**2)+(p[i]!**2+q[i]!**2))*.5;
      const k=this.midSC[i]!*energy,b=this.midTan2[i]!*energy;
      const z=k*dx,decay=Math.exp(-z);
      this.mass[i]=this.mass[i-1]!*decay+(k>1e-12?b*(-Math.expm1(-z))/k:b*dx);
      this.delta[i]=this.delta[i-1]!-k*dx;
      this.a[i]=i===n?1:1-this.mass[i]!*this.cos[i]!**3/this.sin[i]!;
    }
    const boundary=this.delta[n]!;
    this.minA=1;
    for(let i=0;i<=n;i++){
      this.delta[i]=this.delta[i]!-boundary;
      this.velocity[i]=this.a[i]!*Math.exp(-this.delta[i]!);
      if(this.a[i]!<this.minA){this.minA=this.a[i]!;this.peakX=i*dx;}
    }
  }
  private rhs(p:Float64Array,q:Float64Array,dp:Float64Array,dq:Float64Array){
    this.metric(p,q);const {n,dx,velocity:v}=this;
    dp[0]=0;dq[0]=3*v[1]!*p[1]!/dx;
    for(let i=1;i<n;i++){
      dp[i]=(v[i+1]!*q[i+1]!-v[i-1]!*q[i-1]!)/(2*dx);
      // Differentiate flux against tan³x near the regular origin. This avoids
      // the unstable discrete cancellation of Φ_x+2Φ/x at the first nodes.
      // At the last interior point use normalizable boundary asymptotics.
      dq[i]=i<n-1?3*(this.tan2[i+1]!*v[i+1]!*p[i+1]!-this.tan2[i-1]!*v[i-1]!*p[i-1]!)/this.divergence[i]!
        :(v[i+1]!*p[i+1]!-v[i-1]!*p[i-1]!)/(2*dx)+2*v[i]!*p[i]!/(this.sin[i]!*this.cos[i]!);
    }
    dp[n]=0;dq[n]=0;
  }
  step(){
    if(this.status!=="running")return;
    const dt=.15*this.dx,w=this.work,p=this.phi,q=this.pi;
    this.rhs(p,q,w[0]!,w[1]!);
    for(let stage=1;stage<=3;stage++){
      const f=stage===3?dt:dt/2,previous=2*(stage-1);
      for(let i=0;i<=this.n;i++){
        w[8]![i]=p[i]!+f*w[previous]![i]!;
        w[9]![i]=q[i]!+f*w[previous+1]![i]!;
      }
      this.rhs(w[8]!,w[9]!,w[2*stage]!,w[2*stage+1]!);
    }
    for(let i=0;i<=this.n;i++){
      p[i]=p[i]!+dt/6*(w[0]![i]!+2*w[2]![i]!+2*w[4]![i]!+w[6]![i]!);
      q[i]=q[i]!+dt/6*(w[1]![i]!+2*w[3]![i]!+2*w[5]![i]!+w[7]![i]!);
    }
    this.time+=dt;this.metric(p,q);
    const drift=this.initialMass>0?Math.abs(this.mass[this.n]!/this.initialMass-1):Math.abs(this.mass[this.n]!);
    if(!Number.isFinite(drift)||drift>.05||this.minA<=0)this.status="invalid";
    else if(this.minA<.08)this.status="concentrated";
    else if(this.time>=12)this.status="limit";
  }
  advance(target:number){while(this.time<target&&this.status==="running")this.step();}
  snapshot(count=256):GravityFrame {
    // Equal enclosed-energy quantiles for the renderer's faint matter contours.
    // Portfolio letters are separate geodesic tracers supplied by the worker.
    const radius=new Float32Array(count),speed=new Float32Array(this.n+1),lapse=new Float32Array(this.a);
    const total=this.mass[this.n]!;let j=1;
    for(let i=0;i<count;i++){
      const goal=total*(i+.5)/count;
      while(j<this.n&&this.mass[j]!<goal)j++;
      const f=(goal-this.mass[j-1]!)/Math.max(1e-20,this.mass[j]!-this.mass[j-1]!);
      radius[i]=Math.tan((j-1+f)*this.dx/2);
    }
    speed.set(this.velocity);
    return {time:this.time,mass:total,minA:this.minA,peakX:this.peakX,radius,speed,lapse,status:this.status};
  }
}
