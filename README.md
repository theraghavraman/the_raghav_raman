# the_raghav_raman

**A portfolio has to load fast and still work when scripts, WebGL or a CDN fail; this one is a single static page whose 3D layer is optional at every step.**

## Architecture

```mermaid
flowchart TD
    A[index.html: all content, inline styles and scripts] --> B[Readable page with no JavaScript]
    A --> C[assets/js/immersive.js]
    C --> D{WebGL available?}
    D -->|yes, CDN reachable| E[Three.js scene]
    D -->|yes, CDN blocked| F[Built-in WebGL renderer]
    D -->|no| G[Static SVG artwork stays]
    A --> H[fluid-cursor.js: loaded on demand]
    C --> I[assets/js/scramble.js: text effect, loaded separately]
    J[prefers-reduced-motion or Pause] -. switches off .-> C
    K[GitHub Actions] --> L[GitHub Pages]
```

There is no build step, framework or backend.

## Quickstart

View it: [theraghavraman.github.io/the_raghav_raman](https://theraghavraman.github.io/the_raghav_raman/).

Run it locally with Python 3:

```bash
git clone https://github.com/theraghavraman/the_raghav_raman.git
```

```bash
python3 -m http.server 8000 --directory the_raghav_raman
```

Then open `http://localhost:8000`. Edit `index.html` and reload; pushing to `main` publishes the site.

---

Personal portfolio website and interactive experience.
