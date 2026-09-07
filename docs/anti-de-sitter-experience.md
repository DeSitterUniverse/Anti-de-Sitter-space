# AdS: recurrence and a chosen collapse branch

The last sidebar link starts a dormant, 18-second experience. There is no AdS
theme, ambient activity, explanatory overlay, or external artwork.

## What is exact, and what is illustrative

AdS instability is **not** a theorem that every nonzero perturbation inevitably
forms a black hole. Rigorous results concern specified matter models, symmetry,
boundary conditions and families of initial data; stable families also exist.
This experience chooses a collapse outcome. It does not solve the nonlinear
Einstein equations or derive a turbulent energy cascade from the page content.

The first stage uses exact timelike test geodesics and reflected radial null
geodesics of global AdS. The final stage illustrates a prescribed concentrating
null shell with a Schwarzschild–AdS exterior. Entrainment of letter markers by
that shell is visual storytelling, **not exact massive geodesic evolution through
a self-gravitating collapse**. The two stages are not a single matched numerical
Einstein/matter solution. No fictitious damping is attributed to pure AdS.

## Shared geometry

We use an equatorial sector of universal-cover AdS4, L=c=G=1, embedded in
signature (--+++). The third spatial embedding coordinate is zero, leaving

```text
-U² - V² + X² + Y² = -1
U = sqrt(1+r²) cos(tau), V = sqrt(1+r²) sin(tau)
ds² = -(1+r²) dtau² + dr²/(1+r²) + r² dphi²
Lambda = -3; four-dimensional scalar curvature R = -12
q = (X,Y)/(1+sqrt(1+X²+Y²))
(X,Y) = 2q/(1-|q|²)
```

The spatial section has metric `4 dq.dq/(1-|q|²)²`, Gaussian curvature -1.
The procedural mesh consists of exact hyperbolic geodesics: Möbius images of
diameters, hence circles orthogonal to the unit boundary. This is the geometric
representation, instead of a separate decorative hyperboloid. An affine camera
fits the disk to the viewport as an ellipse; it does not change the metric.
The boundary is intrinsic infinity, not the viewport rectangle.

Time tau is unwrapped. Periodic spatial motion is not a closed timelike curve.
AdS4 is used rather than AdS3 to avoid implying arbitrarily small BTZ black holes
above the global-AdS3 vacuum: that setting has a mass-gap distinction.

## Massive and null trajectories

Every grapheme has its own deterministic launch parameter, .22 <= |k| < .72,
with a minority counter-rotating. This is initial angular-momentum dispersion,
not stochastic forcing. Adjacent letters separate instead of remaining ribbons:

```text
P = (sqrt(1+x²+y²), 0, x, y)
T = (0, sqrt(1+k²(x²+y²)), -ky, kx)
P.P = T.T = -1, P.T = 0
Z(s) = P cos(s) + T sin(s)
s = unwrapped atan2(P.u sin(tau), T.v cos(tau))
```

These solve the embedding geodesic equation `Z''=-Z` analytically, with conserved
energy and angular momentum. Positions are antipodal at pi and recur at 2pi.
Marker sizes remain readable rather than following a common area Jacobian;
orientations remain screen aligned. Neither is an extended-body material model.
Six short histories belong to actual
letters, not decorative paths.

Seven light rays launch from q=(.22,-.12), with evenly spaced directions in the
optical tangent plane. The AdS optical metric is a unit hemisphere:
`dchi² + sin²(chi) dphi²`, chi=atan(r). Its great circles
`N(tau)=N0 cos(tau)+V0 sin(tau)` give exact null projections. Folding the third
coordinate across zero imposes reflective boundary conditions at the equator.
The map `q=(Nx,Ny)/(1+|Nz|)` returns each ray to the same spatial disk as the letters.
Rays contact infinity at different analytically computed times, refocus at the
source's spatial antipode at pi, and return to the source at 2pi. Short tapered
trails and local edge flashes reveal these events without adding particles.
The radial special-case solver remains as a regression reference. Neither solver
uses screen collisions, teleports or arbitrary path curves.

## Collapse representation

After two recurrences, a prescribed ingoing shell moves from q=.96 toward the
center with `chi=2atan(.96)-deltaTau`, `q=tan(chi/2)`. This is its trajectory in
the pure-AdS interior time chart. Exterior static Schwarzschild time is not
identified with that chart across the horizon.

The exterior lapse is `f(r)=1+r²-2M/r`. Choosing r_h=.52 fixes
`M=(r_h+r_h³)/2`; the displayed disk radius is r_h/(1+sqrt(1+r_h²)). When the shell
crosses r_h, an apparent-horizon section is shown and engulfed markers disappear.
The observer-view finale is a typographic aperture, not an accretion-disk image.
After shell crossing the dark region grows continuously. Each letter's distance
from the same screen-space aperture controls its soft capture; letters do not
share a collective opacity switch. Letters near the edge contribute to 96 angular
illumination bins, which decay with a .32-second time constant. This makes the
rim respond to the actual content being absorbed, without decorative particles,
an assumed accretion flow, or an unrelated luminous disk. A faint asymmetric rim
remains during the quiet hold. The outer geometry fades out during concentration.
This is an artistic observer-view handoff, not calculated optics, shadow radius,
energy transfer, or an event-horizon location. Reset is not evaporation.

## Sequence and lifecycle

- 0–1s: letters begin separating near their original words before camera pullback.
- 1–2.7s: gather the whole document; reveal the mesh, then dim it behind motion.
- .35–11.2s: two exact AdS recurrences, with a shared clock slowing at refocusing.
- 11.2–15.6s: a longer concentration and progressive typographic capture.
- 15.6–16.6s: quiet horizon hold; restore original content behind the opaque veil.
- 16.6–18s: fade back to the original portfolio, without an explosion or reversal.

Mesh emphasis follows actual boundary contact times. The light layer is drawn
above the glyph markers so the refocusing pulse remains visible through dense
text. This is composition, not a claim that light causes the prescribed collapse.

All document text in the navigation, main content, contact area and theme controls
is segmented by grapheme, not just currently visible text. Closed disclosures are
not opened: otherwise unobservable initial glyph positions are assigned near
their semantic ancestor and fade in during gathering. SVGs, images and colour
swatches are individual small DOM markers. Layout containers, backgrounds and
the escape control are infrastructure, not additional giant bodies.

DOM Ranges measure text before mutation; custom inline wrappers retain original
Text nodes and wrapping. Aria-hidden DOM glyph markers preserve measured fonts.
No screenshots, canvas text or innerHTML rewriting is used. Original text nodes
and captured attributes are restored, with no accumulated transforms or listeners.

Native scrolling stays enabled. Resize, page hiding, theme change, Escape, exit,
Astro navigation and teardown cancel through one cleanup path. The current theme
is preserved; Galaxy is paused only during the sequence. Canvas2D needs no WebGPU.
DPR is capped at 1.75. Normal motion follows every requestAnimationFrame rather
than a 45Hz gate that skips alternating frames on 60Hz displays. A smooth playback
envelope removes abrupt release/arrest, and horizon visibility fades in rather
than popping. These are presentation choices; all geometry shares one tau.
There is no idle simulation work.
Reduced-motion mode omits all letter travel and shortens the geometric presentation
to 4.8 seconds. The exit control remains available throughout.

## Verification and references

`npm run test:ads` checks embedding constraints, tangent normalization, geodesic
equations, conserved quantities, unwrapped time, recurrence, null norm and return
times, boundary-orthogonal mesh arcs, shell null propagation, horizon lapse and
timeline cleanup. Browser checks cover full-document capture and reset.

- [Moschidis: Einstein–massless Vlasov instability](https://arxiv.org/abs/1812.04268).
- [Moschidis: null dust with an inner mirror](https://arxiv.org/abs/1704.08681).
- [Bizon: instability, turbulence and stability discussion](https://arxiv.org/abs/1312.5544).
- [AdS stability islands](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.121.021103).
- [Embedding-space timelike geodesics](https://arxiv.org/abs/1602.07111).
