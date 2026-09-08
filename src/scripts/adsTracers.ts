/** Timelike Hamiltonian test tracers, L=c=rest mass=1, unwrapped boundary time.
 * For the solved spherical metric F=A(1+r²), N=sqrt(F)exp(-δ),
 * H=N sqrt(1+p.p+(F-1)(p.n)²), n=q/r. Hamilton's equations below
 * are the geodesic equations, NOT an attraction/quantile prescription.
 * Cartesian areal coordinates avoid the polar singularity at centre crossings.
 * Tracers do not backreact. The metric is linearly interpolated in compact x,
 * with even interpolation in the first cell. Midpoint time stepping and metric
 * sampling are numerical approximations, not exact analytic trajectories.
 */
/** Deterministic test-particle initial data, independent of scalar-field mass.
 * One third starts farther out with larger angular momentum: an exterior
 * population, not protected survivors. All still obey the same Hamiltonian.
 */
export function tracerInitialData(index:number,x:number,y:number){
  const length=Math.hypot(x,y),exterior=index%3===0;
  const radius=Math.min(.88,Math.max(exterior?.66+.1*((index*.41421356237)%1):.03,length));
  const q=.18*radius/(1-.82*radius),r=2*q/(1-q*q);
  const nx=length?x/length:1,ny=length?y/length:0;
  const tangential=(index%7===0?-1:1)*((exterior?.7:.12)+(exterior?.3:.5)*((index*.61803398875)%1));
  const radial=exterior?.06+.1*((index*.7548776662)%1):.16*(2*((index*.7548776662)%1)-1);
  return [nx*r,ny*r,nx*radial-ny*tangential,ny*radial+nx*tangential];
}
export class AdSTracers {
  readonly state:Float64Array;
  private readonly rate=new Float64Array(4);
  private readonly mid=new Float64Array(4);
  constructor(initial:Float64Array){this.state=initial.slice();}
  derivative(q:ArrayLike<number>,offset:number,a:Float64Array,v:Float64Array,out:Float64Array){
    const x=q[offset]!,y=q[offset+1]!,px=q[offset+2]!,py=q[offset+3]!;
    const r=Math.hypot(x,y),compact=Math.atan(r),dx=Math.PI/(2*(a.length-1));
    const cell=Math.min(a.length-2,Math.floor(compact/dx)),u=(compact-cell*dx)/dx;
    const f=cell===0?u*u:u,df=cell===0?2*u/dx:1/dx;
    const A=a[cell]!+(a[cell+1]!-a[cell]!)*f,V=v[cell]!+(v[cell+1]!-v[cell]!)*f;
    const Ax=(a[cell+1]!-a[cell]!)*df,Vx=(v[cell+1]!-v[cell]!)*df;
    const nx=r?x/r:0,ny=r?y/r:0,pr=px*nx+py*ny,b=1+r*r,F=A*b;
    const N=Math.sqrt(b/A)*V,Nr=N*(r+Vx/V-.5*Ax/A)/b,Fr=2*r*A+Ax;
    const W=Math.sqrt(1+px*px+py*py+(F-1)*pr*pr),factor=N/W;
    out[0]=factor*(px+(F-1)*pr*nx);out[1]=factor*(py+(F-1)*pr*ny);
    const radial=-Nr*W-factor*.5*Fr*pr*pr;
    const angular=r?-factor*(F-1)*pr/r:0;
    out[2]=radial*nx+angular*(px-pr*nx);out[3]=radial*ny+angular*(py-pr*ny);
  }
  step(dt:number,a:Float64Array,v:Float64Array){
    const s=this.state;
    for(let i=0;i<s.length;i+=4){
      this.derivative(s,i,a,v,this.rate);
      for(let j=0;j<4;j++)this.mid[j]=s[i+j]!+dt*.5*this.rate[j]!;
      this.derivative(this.mid,0,a,v,this.rate);
      for(let j=0;j<4;j++)s[i+j]=s[i+j]!+dt*this.rate[j]!;
    }
  }
  /** Display positions AND their derivatives per boundary-time unit. The
   * radial chart is the existing q/(.18+.82q), q=r/(1+sqrt(1+r²)). */
  snapshot(a:Float64Array,v:Float64Array):Float32Array{
    const result=new Float32Array(this.state.length);
    for(let i=0;i<this.state.length;i+=4){
      const x=this.state[i]!,y=this.state[i+1]!,r=Math.hypot(x,y),root=Math.hypot(1,r);
      const q=r/(1+root),den=.18+.82*q,R=q/den;
      const scale=r?R/r:1/.36;
      this.derivative(this.state,i,a,v,this.rate);
      const vr=r?(x*this.rate[0]!+y*this.rate[1]!)/r:0;
      const dR=.18/(den*den*root*(1+root));
      const extra=r?(dR-scale)*vr/r:0;
      result[i]=x*scale;result[i+1]=y*scale;
      result[i+2]=scale*this.rate[0]!+extra*x;result[i+3]=scale*this.rate[1]!+extra*y;
    }
    return result;
  }
}
