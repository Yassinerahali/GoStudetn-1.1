(function () {
  'use strict';

  const MAP_W = 500;
  const MAP_H = 460;
  const LAT_MIN = 20.5;
  const LAT_MAX = 36.5;
  const LON_MIN = -17.5;
  const LON_MAX = 0.5;
  const ANIMATION_MS = 4800;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const CITIES = [
    { name: 'Casablanca', lat: 33.57, lon: -7.59 },
    { name: 'Rabat', lat: 34.02, lon: -6.83 },
    { name: 'Marrakech', lat: 31.63, lon: -8.01 },
    { name: 'Fes', lat: 34.03, lon: -5.00, aliases: ['Fez'] },
    { name: 'Tanger', lat: 35.78, lon: -5.80, aliases: ['Tangier'] },
    { name: 'Agadir', lat: 30.43, lon: -9.59 },
    { name: 'Meknes', lat: 33.90, lon: -5.55 },
    { name: 'Oujda', lat: 34.69, lon: -1.91 },
    { name: 'Kenitra', lat: 34.26, lon: -6.58 },
    { name: 'El Jadida', lat: 33.23, lon: -8.51 },
    { name: 'Safi', lat: 32.29, lon: -9.24 },
    { name: 'Nador', lat: 35.17, lon: -2.93 },
    { name: 'Ouarzazate', lat: 30.92, lon: -6.89 },
    { name: 'Errachidia', lat: 31.93, lon: -4.43 },
    { name: 'Tetouan', lat: 35.58, lon: -5.37 },
    { name: 'Laayoune', lat: 27.16, lon: -13.20 },
    { name: 'Beni Mellal', lat: 32.34, lon: -6.36 },
    { name: 'Essaouira', lat: 31.51, lon: -9.76 },
    { name: 'Dakhla', lat: 23.71, lon: -15.94 },
  ];

  const OUTLINE = [
    [35.79, -5.92], [35.88, -5.35], [35.77, -4.85], [35.68, -4.63], [35.50, -4.10],
    [35.37, -3.69], [35.33, -3.09], [35.29, -2.95], [35.26, -2.62], [35.08, -2.22],
    [34.68, -2.21], [34.22, -2.21], [33.97, -2.22], [33.50, -2.35], [33.07, -2.50],
    [32.50, -2.50], [32.00, -2.65], [31.35, -2.85], [30.63, -3.00], [30.20, -3.30],
    [29.50, -4.00], [29.30, -5.10], [29.00, -6.30], [28.70, -7.70], [28.35, -8.50],
    [28.10, -8.70], [27.90, -9.00], [26.50, -9.00], [25.00, -9.50], [23.00, -12.50],
    [21.30, -13.20], [21.00, -17.00], [23.70, -15.93], [25.00, -14.80], [26.10, -14.50],
    [27.10, -13.18], [27.67, -13.18], [28.00, -12.20], [28.70, -11.10], [29.37, -10.30],
    [30.00, -9.87], [30.43, -9.59], [31.00, -9.82], [31.51, -9.76], [32.29, -9.24],
    [32.80, -8.90], [33.23, -8.51], [33.57, -7.59], [33.90, -7.25], [34.02, -6.83],
    [34.26, -6.58], [34.50, -6.30], [35.00, -6.10], [35.20, -6.05], [35.47, -5.98],
    [35.63, -5.94], [35.79, -5.92],
  ];

  const normalizeCity = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  const toXY = (lat, lon) => ({
    x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
  });

  const haversine = (lat1, lon1, lat2, lon2) => {
    const radius = 6371;
    const radians = (degrees) => degrees * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const bezier = (t, p1, pc, p2) => ({
    x: (1 - t) ** 2 * p1.x + 2 * (1 - t) * t * pc.x + t ** 2 * p2.x,
    y: (1 - t) ** 2 * p1.y + 2 * (1 - t) * t * pc.y + t ** 2 * p2.y,
  });

  const getAngle = (t, p1, pc, p2) => {
    const a = bezier(t, p1, pc, p2);
    const b = bezier(Math.min(t + 0.001, 1), p1, pc, p2);
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  };

  const getControlPoint = (p1, p2) => {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const bend = Math.min(len * 0.38, 75);
    return { x: mx + (-dy / len) * bend, y: my + (dx / len) * bend };
  };

  const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  const CITIES_POS = CITIES.map((city) => ({ ...city, ...toXY(city.lat, city.lon) }));
  const MOROCCO_PATH = OUTLINE.map(([lat, lon], index) => {
    const point = toXY(lat, lon);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(' ') + ' Z';

  const cityLookup = new Map();
  CITIES_POS.forEach((city) => {
    [city.name].concat(city.aliases || []).forEach((name) => {
      cityLookup.set(normalizeCity(name), city);
    });
  });

  const findCity = (name) => cityLookup.get(normalizeCity(name));

  const svgEl = (name, attrs = {}, text = '') => {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) element.setAttribute(key, String(value));
    });
    if (text) element.textContent = text;
    return element;
  };

  const html = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const injectStyles = () => {
    if (document.getElementById('morocco-map-styles')) return;
    const style = document.createElement('style');
    style.id = 'morocco-map-styles';
    style.textContent = `
      .morocco-map-shell {
        position: relative;
        overflow: hidden;
        margin: 1rem 0;
        padding: 1.1rem;
        border: 1px solid rgba(30, 64, 175, 0.42);
        border-radius: 8px;
        background: #050c1d;
        color: #dbeafe;
        font-family: "Space Grotesk", "Courier New", monospace;
        box-shadow: 0 20px 55px rgba(4, 10, 28, 0.28), inset 0 0 55px rgba(10, 20, 60, 0.44);
      }
      .morocco-map-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: linear-gradient(rgba(30, 64, 175, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30, 64, 175, 0.06) 1px, transparent 1px);
        background-size: 28px 28px;
      }
      .morocco-stars {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .morocco-star {
        position: absolute;
        width: 1px;
        height: 1px;
        border-radius: 50%;
        background: rgba(147, 197, 253, 0.38);
      }
      .morocco-map-inner {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 0.85rem;
        justify-items: center;
      }
      .morocco-map-header {
        text-align: center;
      }
      .morocco-map-kicker {
        color: #3b82f6;
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.42em;
      }
      .morocco-map-title {
        margin-top: 0.25rem;
        color: #fff;
        font-size: clamp(1.7rem, 5vw, 2.7rem);
        font-weight: 800;
        letter-spacing: 0.28em;
        text-shadow: 0 0 48px rgba(59, 130, 246, 0.55);
      }
      .morocco-map-subtitle {
        margin-top: 0.25rem;
        color: #60a5fa;
        font-size: 0.58rem;
        letter-spacing: 0.28em;
      }
      .morocco-map-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        justify-content: center;
        gap: 0.75rem;
        width: 100%;
      }
      .morocco-field {
        display: grid;
        gap: 0.3rem;
      }
      .morocco-field label {
        color: var(--accent);
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.22em;
      }
      .morocco-field select {
        min-width: 174px;
        border: 1px solid rgba(30, 64, 175, 0.42);
        border-radius: 4px;
        background: #03070f;
        color: #dbeafe;
        padding: 0.56rem 0.75rem;
        outline: none;
        box-shadow: none;
      }
      .morocco-field select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
      }
      .morocco-connector {
        display: flex;
        gap: 4px;
        padding-bottom: 0.72rem;
      }
      .morocco-connector span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #12336e;
        opacity: 0.35;
      }
      .morocco-connector.is-active span {
        background: #3b82f6;
        box-shadow: 0 0 6px #3b82f6;
      }
      .morocco-map-frame {
        position: relative;
        width: min(100%, 514px);
        padding: 6px;
        border: 1px solid rgba(30, 64, 175, 0.45);
        border-radius: 6px;
        background: rgba(3, 7, 20, 0.95);
        box-shadow: 0 20px 55px rgba(0, 0, 0, 0.42), inset 0 0 48px rgba(10, 20, 60, 0.48);
      }
      .morocco-map-frame svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .morocco-bracket {
        position: absolute;
        width: 12px;
        height: 12px;
        border-style: solid;
        border-color: rgba(96, 165, 250, 0.65);
      }
      .morocco-bracket.tl { top: 0; left: 0; border-width: 2px 0 0 2px; }
      .morocco-bracket.tr { top: 0; right: 0; border-width: 2px 2px 0 0; }
      .morocco-bracket.bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; }
      .morocco-bracket.br { bottom: 0; right: 0; border-width: 0 2px 2px 0; }
      .morocco-stats {
        display: none;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.8rem;
        width: min(100%, 514px);
        padding: 0.72rem 0.9rem;
        border: 1px solid rgba(30, 64, 175, 0.3);
        border-radius: 5px;
        background: rgba(3, 7, 20, 0.84);
      }
      .morocco-stats.is-visible {
        display: flex;
      }
      .morocco-stat {
        display: grid;
        gap: 0.16rem;
        min-width: 82px;
        text-align: center;
      }
      .morocco-stat span {
        color: #31518f;
        font-size: 0.56rem;
        font-weight: 800;
        letter-spacing: 0.18em;
      }
      .morocco-stat strong {
        color: var(--stat-color, #93c5fd);
        font-size: 0.86rem;
      }
      .morocco-progress {
        width: min(100%, 514px);
        height: 3px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(30, 64, 175, 0.16);
        opacity: 0;
      }
      .morocco-progress.is-visible {
        opacity: 1;
      }
      .morocco-progress span {
        display: block;
        width: 0;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #22c55e, #3b82f6, #93c5fd);
      }
      .morocco-prompt {
        color: rgba(147, 197, 253, 0.52);
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-align: center;
      }
      @media (max-width: 620px) {
        .morocco-map-shell {
          padding: 0.9rem 0.65rem;
        }
        .morocco-map-title {
          letter-spacing: 0.18em;
        }
        .morocco-field,
        .morocco-field select {
          width: 100%;
        }
        .morocco-connector {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  };

  class MoroccoTripMap {
    constructor(container, options = {}) {
      this.container = container;
      this.departure = options.departure || '';
      this.destination = options.destination || '';
      this.progress = 0;
      this.done = false;
      this.raf = null;
      this.startTime = null;
      this.elements = {};

      injectStyles();
      this.render();
      this.setRoute(this.departure, this.destination);
    }

    render() {
      this.container.innerHTML = '';
      this.shell = html('section', 'morocco-map-shell');
      this.shell.setAttribute('aria-label', 'Morocco trip route map');

      const stars = html('div', 'morocco-stars');
      Array.from({ length: 60 }).forEach((_, index) => {
        const star = html('span', 'morocco-star');
        star.style.left = `${(index * 37 + 11) % 100}%`;
        star.style.top = `${(index * 53 + 7) % 100}%`;
        if (index % 7 === 0) {
          star.style.width = '2px';
          star.style.height = '2px';
        }
        stars.appendChild(star);
      });

      const inner = html('div', 'morocco-map-inner');
      const header = html('header', 'morocco-map-header');
      header.append(
        html('div', 'morocco-map-kicker', 'NAVIGATION SYSTEM'),
        html('div', 'morocco-map-title', 'MAROC'),
        html('div', 'morocco-map-subtitle', 'ROAD TRIP PLANNER')
      );

      const controls = html('div', 'morocco-map-controls');
      this.departureSelect = this.createSelect('DEPARTURE', '#22c55e');
      this.destinationSelect = this.createSelect('DESTINATION', '#60a5fa');
      const connector = html('div', 'morocco-connector');
      Array.from({ length: 6 }).forEach(() => connector.appendChild(html('span')));
      this.elements.connector = connector;
      controls.append(this.departureSelect.wrap, connector, this.destinationSelect.wrap);

      const frame = html('div', 'morocco-map-frame');
      ['tl', 'tr', 'bl', 'br'].forEach((pos) => frame.appendChild(html('span', `morocco-bracket ${pos}`)));
      this.svg = this.createSvg();
      frame.appendChild(this.svg);

      this.stats = html('div', 'morocco-stats');
      this.progressBar = html('div', 'morocco-progress');
      this.progressFill = html('span');
      this.progressBar.appendChild(this.progressFill);
      this.prompt = html('p', 'morocco-prompt', 'SELECT CITIES TO BEGIN YOUR JOURNEY');

      inner.append(header, controls, frame, this.stats, this.progressBar, this.prompt);
      this.shell.append(stars, inner);
      this.container.appendChild(this.shell);

      this.departureSelect.select.addEventListener('change', () => {
        this.setRoute(this.departureSelect.select.value, this.destinationSelect.select.value);
      });
      this.destinationSelect.select.addEventListener('change', () => {
        this.setRoute(this.departureSelect.select.value, this.destinationSelect.select.value);
      });
    }

    createSelect(label, accent) {
      const wrap = html('div', 'morocco-field');
      wrap.style.setProperty('--accent', accent);
      const labelEl = html('label', '', label);
      const select = document.createElement('select');
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Select city';
      select.appendChild(empty);
      CITIES_POS.forEach((city) => {
        const option = document.createElement('option');
        option.value = city.name;
        option.textContent = city.name;
        select.appendChild(option);
      });
      wrap.append(labelEl, select);
      return { wrap, select };
    }

    createSvg() {
      const svg = svgEl('svg', { viewBox: `0 0 ${MAP_W} ${MAP_H}`, role: 'img' });
      svg.appendChild(svgEl('title', {}, 'Animated Morocco route map'));

      const defs = svgEl('defs');
      defs.innerHTML = `
        <filter id="moroccoGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="moroccoTrailGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="moroccoCarGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="moroccoMapMask"><path d="${MOROCCO_PATH}"/></clipPath>
      `;
      svg.appendChild(defs);

      svg.appendChild(svgEl('rect', { x: 0, y: 0, width: MAP_W, height: MAP_H, fill: '#02050f' }));
      svg.appendChild(svgEl('path', { d: MOROCCO_PATH, fill: '#0b1a40' }));

      const scanLines = svgEl('g', { 'clip-path': 'url(#moroccoMapMask)', opacity: 0.12 });
      Array.from({ length: 23 }).forEach((_, index) => {
        scanLines.appendChild(svgEl('line', {
          x1: 0,
          y1: 20 + index * 20,
          x2: MAP_W,
          y2: 20 + index * 20,
          stroke: '#3b82f6',
          'stroke-width': 0.5,
        }));
      });
      svg.appendChild(scanLines);

      svg.appendChild(svgEl('path', { d: MOROCCO_PATH, fill: 'none', stroke: '#1e3a8a', 'stroke-width': 1.5 }));
      svg.appendChild(svgEl('path', { d: MOROCCO_PATH, fill: 'none', stroke: 'rgba(96,165,250,0.35)', 'stroke-width': 0.6 }));

      this.routeGhost = svgEl('path', {
        fill: 'none',
        stroke: 'rgba(59,130,246,0.24)',
        'stroke-width': 2,
        'stroke-dasharray': '7 5',
      });
      this.trailGlow = svgEl('polyline', {
        fill: 'none',
        stroke: 'rgba(96,165,250,0.28)',
        'stroke-width': 10,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        filter: 'url(#moroccoTrailGlow)',
      });
      this.trailLine = svgEl('polyline', {
        fill: 'none',
        stroke: '#3b82f6',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      });
      this.trailCore = svgEl('polyline', {
        fill: 'none',
        stroke: 'rgba(147,197,253,0.6)',
        'stroke-width': 1,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      });
      svg.append(this.routeGhost, this.trailGlow, this.trailLine, this.trailCore);

      this.cityLayer = svgEl('g');
      svg.appendChild(this.cityLayer);

      this.carLayer = svgEl('g');
      svg.appendChild(this.carLayer);

      const compass = svgEl('g', { transform: `translate(${MAP_W - 30},${MAP_H - 30})`, opacity: 0.35 });
      compass.append(
        svgEl('circle', { r: 14, fill: 'none', stroke: '#1e40af', 'stroke-width': 0.8 }),
        svgEl('line', { x1: 0, y1: -11, x2: 0, y2: 11, stroke: '#1e40af', 'stroke-width': 0.8 }),
        svgEl('line', { x1: -11, y1: 0, x2: 11, y2: 0, stroke: '#1e40af', 'stroke-width': 0.8 }),
        svgEl('text', { x: 0, y: -13, 'text-anchor': 'middle', 'font-size': 7, fill: '#60a5fa' }, 'N')
      );
      svg.appendChild(compass);

      const scale = svgEl('g', { transform: 'translate(16,430)', opacity: 0.45 });
      scale.append(
        svgEl('line', { x1: 0, y1: 0, x2: 40, y2: 0, stroke: '#60a5fa', 'stroke-width': 1 }),
        svgEl('line', { x1: 0, y1: -4, x2: 0, y2: 4, stroke: '#60a5fa', 'stroke-width': 1 }),
        svgEl('line', { x1: 40, y1: -4, x2: 40, y2: 4, stroke: '#60a5fa', 'stroke-width': 1 }),
        svgEl('text', { x: 20, y: -7, 'text-anchor': 'middle', 'font-size': 7, fill: '#93c5fd' }, '~400 km')
      );
      svg.appendChild(scale);
      return svg;
    }

    setRoute(departure, destination) {
      const from = findCity(departure);
      const to = findCity(destination);
      this.departure = from ? from.name : '';
      this.destination = to ? to.name : '';
      this.departureSelect.select.value = this.departure;
      this.destinationSelect.select.value = this.destination;
      this.syncDisabledOptions();
      this.cancelAnimation();
      this.progress = 0;
      this.done = false;
      this.renderState();
      if (from && to && from.name !== to.name) this.startAnimation();
    }

    syncDisabledOptions() {
      Array.from(this.departureSelect.select.options).forEach((option) => {
        option.disabled = !!option.value && option.value === this.destination;
      });
      Array.from(this.destinationSelect.select.options).forEach((option) => {
        option.disabled = !!option.value && option.value === this.departure;
      });
    }

    startAnimation() {
      this.startTime = null;
      const step = (timestamp) => {
        if (!this.startTime) this.startTime = timestamp;
        const raw = Math.min((timestamp - this.startTime) / ANIMATION_MS, 1);
        this.progress = ease(raw);
        this.done = raw >= 1;
        this.renderState();
        if (raw < 1) this.raf = window.requestAnimationFrame(step);
      };
      this.raf = window.requestAnimationFrame(step);
    }

    cancelAnimation() {
      if (this.raf) window.cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    getRoute() {
      const from = findCity(this.departure);
      const to = findCity(this.destination);
      if (!from || !to || from.name === to.name) return null;
      const cp = getControlPoint(from, to);
      const path = `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${cp.x.toFixed(1)},${cp.y.toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`;
      const distance = haversine(from.lat, from.lon, to.lat, to.lon);
      return { from, to, cp, path, distance };
    }

    renderState() {
      const route = this.getRoute();
      this.elements.connector.classList.toggle('is-active', !!route);
      this.routeGhost.style.display = route ? '' : 'none';
      this.routeGhost.setAttribute('d', route ? route.path : '');

      const trailPoints = route ? this.getTrailPoints(route) : '';
      [this.trailGlow, this.trailLine, this.trailCore].forEach((line) => {
        line.style.display = trailPoints ? '' : 'none';
        line.setAttribute('points', trailPoints);
      });

      this.renderCities();
      this.renderCar(route);
      this.renderStats(route);

      this.progressBar.classList.toggle('is-visible', !!route);
      this.progressFill.style.width = `${this.progress * 100}%`;
      this.prompt.style.display = route ? 'none' : '';
    }

    getTrailPoints(route) {
      if (!route || this.progress <= 0.008) return '';
      const count = Math.max(2, Math.ceil(this.progress * 90));
      return Array.from({ length: count }, (_, index) => {
        const t = index === 0 ? 0 : (index / (count - 1)) * this.progress;
        const point = bezier(t, route.from, route.cp, route.to);
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      }).join(' ');
    }

    renderCities() {
      this.cityLayer.innerHTML = '';
      CITIES_POS.forEach((city) => {
        const isFrom = city.name === this.departure;
        const isDest = city.name === this.destination;
        const isActive = isFrom || isDest;
        const color = isFrom ? '#22c55e' : isDest ? '#60a5fa' : 'rgba(147,197,253,0.55)';
        const group = svgEl('g', isActive ? { filter: 'url(#moroccoGlow)' } : {});
        if (isActive) {
          group.append(
            svgEl('circle', {
              cx: city.x,
              cy: city.y,
              r: 15,
              fill: 'none',
              stroke: isFrom ? 'rgba(34,197,94,0.25)' : 'rgba(96,165,250,0.25)',
              'stroke-width': 1,
            }),
            svgEl('circle', {
              cx: city.x,
              cy: city.y,
              r: 10,
              fill: 'none',
              stroke: isFrom ? 'rgba(34,197,94,0.4)' : 'rgba(96,165,250,0.4)',
              'stroke-width': 1,
            })
          );
        }
        group.append(
          svgEl('circle', {
            cx: city.x,
            cy: city.y,
            r: isActive ? 5 : 3,
            fill: color,
            stroke: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(30,58,138,0.8)',
            'stroke-width': isActive ? 1.5 : 0.8,
          }),
          svgEl('text', {
            x: city.x + 7,
            y: city.y + 4,
            'font-size': 9.5,
            fill: isFrom ? '#4ade80' : isDest ? '#93c5fd' : 'rgba(147,197,253,0.65)',
            'font-family': '"Courier New", monospace',
            'font-weight': isActive ? 700 : 400,
          }, city.name)
        );
        this.cityLayer.appendChild(group);
      });
    }

    renderCar(route) {
      this.carLayer.innerHTML = '';
      if (!route || this.progress <= 0) return;

      const carPos = bezier(this.progress, route.from, route.cp, route.to);
      const carAngle = getAngle(this.progress, route.from, route.cp, route.to);
      this.carLayer.appendChild(svgEl('ellipse', {
        cx: carPos.x,
        cy: carPos.y,
        rx: 18,
        ry: 18,
        fill: 'rgba(59,130,246,0.18)',
        filter: 'url(#moroccoCarGlow)',
      }));

      const car = svgEl('g', {
        transform: `translate(${carPos.x.toFixed(1)},${carPos.y.toFixed(1)}) rotate(${carAngle.toFixed(1)})`,
      });
      car.append(
        svgEl('ellipse', { rx: 14, ry: 8, fill: 'rgba(0,0,0,0.45)', transform: 'translate(2,3)' }),
        svgEl('ellipse', { rx: 13, ry: 7.5, fill: '#1d4ed8', stroke: '#93c5fd', 'stroke-width': 1.2 }),
        svgEl('rect', { x: 0, y: -5.5, width: 10, height: 11, rx: 3, fill: '#2563eb', stroke: '#bfdbfe', 'stroke-width': 0.6, opacity: 0.85 }),
        svgEl('rect', { x: -11, y: -1.5, width: 22, height: 3, rx: 1, fill: 'rgba(147,197,253,0.2)' }),
        svgEl('circle', { cx: 12.5, cy: -4.5, r: 2.5, fill: '#fef9c3' }),
        svgEl('circle', { cx: 12.5, cy: 4.5, r: 2.5, fill: '#fef9c3' }),
        svgEl('circle', { cx: 14, cy: -4.5, r: 5, fill: '#fef08a', opacity: 0.3 }),
        svgEl('circle', { cx: 14, cy: 4.5, r: 5, fill: '#fef08a', opacity: 0.3 }),
        svgEl('circle', { cx: -12.5, cy: -4.5, r: 2, fill: '#ef4444', opacity: 0.9 }),
        svgEl('circle', { cx: -12.5, cy: 4.5, r: 2, fill: '#ef4444', opacity: 0.9 })
      );
      this.carLayer.appendChild(car);

      if (this.done) {
        this.carLayer.append(
          svgEl('circle', { cx: route.to.x, cy: route.to.y, r: 22, fill: 'none', stroke: 'rgba(96,165,250,0.6)', 'stroke-width': 2 }),
          svgEl('circle', { cx: route.to.x, cy: route.to.y, r: 30, fill: 'none', stroke: 'rgba(96,165,250,0.3)', 'stroke-width': 1 })
        );
      }
    }

    renderStats(route) {
      this.stats.innerHTML = '';
      this.stats.classList.toggle('is-visible', !!route);
      if (!route) return;

      const hours = Math.max(1, Math.round(route.distance / 80));
      const values = [
        ['FROM', route.from.name, '#4ade80'],
        ['TO', route.to.name, '#93c5fd'],
        ['DISTANCE', `~${route.distance} km`, '#60a5fa'],
        ['DRIVE', `~${hours}h`, '#60a5fa'],
      ];
      if (this.done) values.push(['STATUS', 'ARRIVED', '#4ade80']);

      values.forEach(([label, value, color]) => {
        const stat = html('div', 'morocco-stat');
        stat.style.setProperty('--stat-color', color);
        stat.append(html('span', '', label), html('strong', '', value));
        this.stats.appendChild(stat);
      });
    }
  }

  const initMoroccoTripMap = (options = {}) => {
    const container = document.getElementById(options.containerId || 'moroccoMapContainer');
    if (!container) return null;
    if (container.__moroccoTripMap) {
      if (options.departure || options.destination) {
        container.__moroccoTripMap.setRoute(options.departure, options.destination);
      }
      return container.__moroccoTripMap;
    }
    container.__moroccoTripMap = new MoroccoTripMap(container, options);
    return container.__moroccoTripMap;
  };

  window.MoroccoTripMap = {
    init: initMoroccoTripMap,
    setRoute(departure, destination) {
      return initMoroccoTripMap({ departure, destination });
    },
    cities: CITIES.map((city) => city.name),
  };

  document.addEventListener('DOMContentLoaded', () => {
    initMoroccoTripMap();
  });

  window.addEventListener('trip:loaded', (event) => {
    const trip = event.detail || {};
    initMoroccoTripMap({
      departure: trip.departureCity,
      destination: trip.destinationCity,
    });
  });
}());
