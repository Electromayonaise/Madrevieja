// El paisaje de la madrevieja, dibujado con código.
//
// Un solo número, s (0 = deteriorada, 1 = recuperada), decide todo:
// el color del cielo y del agua, cuántos árboles del bosque seco tienen
// hojas, cuánta basura flota, si dan vueltas los gallinazos o vuelven
// las garzas, el coquito, los pericos y las iguanas. Cada elemento tiene
// su propio umbral, así que el cambio es gradual y no un salto entre tres
// imágenes.

import { ANCHO as W, ALTO as H } from './config.js';

// ---------------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------------
function aleatorio(semilla) {
  return function () {
    semilla |= 0;
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const paso = (a, b, v) => {
  const x = lim((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mezcla = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const P = (d, t, r) => [hex(d), hex(t), hex(r)];
const color = (pal, s) => (s < 0.5 ? mezcla(pal[0], pal[1], s / 0.5) : mezcla(pal[1], pal[2], (s - 0.5) / 0.5));

const PAL = {
  cieloArriba: P('#77746c', '#8db1c6', '#5b9bd4'),
  cieloHorizonte: P('#c3b597', '#dfe2d4', '#e8f2ef'),
  sol: P('#e9dcbc', '#fff0c4', '#fff4d0'),
  nube: P('#a69780', '#e9e6df', '#ffffff'),
  montanaLejos: P('#9a9381', '#90a3a5', '#7f9db3'),
  montanaCerca: P('#8a826c', '#7c9580', '#5d8b72'),
  llanura: P('#a4987a', '#a1ad79', '#8aae62'),
  llanuraCerca: P('#8d8160', '#86985d', '#6a9846'),
  aguaLejos: P('#8b836e', '#8fb0ad', '#a5d2e2'),
  aguaCerca: P('#524c3a', '#4b7779', '#2a77a0'),
  orilla: P('#6c5e48', '#6c6846', '#526d38'),
  isla: P('#9b8f6c', '#93a46a', '#77a451'),
  tronco: P('#5c4b3c', '#584535', '#523e2e'),
  hoja: P('#8f8a57', '#6f9649', '#438d3e'),
  hojaOscura: P('#716b45', '#547b38', '#2e6c2f'),
  junco: P('#a69868', '#8ca05a', '#5e9a44'),
  suelo: P('#7b694c', '#747848', '#5a7d38'),
  sueloOscuro: P('#5f513b', '#5b5f38', '#45652b'),
  pasto: P('#9c8f5e', '#7f9a4a', '#4f8f36'),
};

// ---------------------------------------------------------------------
// geometría (se genera una vez, siempre igual gracias a la semilla)
// ---------------------------------------------------------------------
const LAGO = { cx: 980, cy: 790, rx: 760, ry: 175 };
const ISLA = { cx: 1010, cy: 715, rx: 470, ry: 78 };
const HORIZONTE = 520;

function poligonoElipse(r, e, n, ruido) {
  const pts = [];
  const f1 = r() * 6.28;
  const f2 = r() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + ruido * (0.6 * Math.sin(a * 3 + f1) + 0.4 * Math.sin(a * 7 + f2));
    pts.push([e.cx + Math.cos(a) * e.rx * k, e.cy + Math.sin(a) * e.ry * k]);
  }
  return pts;
}

function aPath(pts) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

function dentro(e, x, y, margen = 1) {
  const dx = (x - e.cx) / e.rx;
  const dy = (y - e.cy) / e.ry;
  return dx * dx + dy * dy < margen;
}

function generarArbol(r, { x, y, escala, umbral, flor = false }) {
  const segmentos = [];
  const copas = [];
  function rama(x1, y1, ang, largo, ancho, nivel) {
    const x2 = x1 + Math.cos(ang) * largo;
    const y2 = y1 + Math.sin(ang) * largo;
    segmentos.push({ x1, y1, x2, y2, w: ancho, nivel });
    if (nivel === 0) {
      copas.push({ x: x2, y: y2, r: (24 + r() * 16) * escala });
      return;
    }
    const n = nivel >= 3 ? 2 : r() < 0.55 ? 2 : 3;
    // Copa ancha, como la de un samán del bosque seco.
    const abertura = 0.5 + r() * 0.3 + (4 - nivel) * 0.08;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * abertura + (r() - 0.5) * 0.35;
      rama(x2, y2, a, largo * (0.66 + r() * 0.14), ancho * 0.66, nivel - 1);
    }
  }
  rama(x, y, -Math.PI / 2 + (r() - 0.5) * 0.12, 105 * escala, 13 * escala, 4);
  return { segmentos, copas, umbral, flor, x, y, escala };
}

function generar() {
  const r = aleatorio(1967);
  const g = {};

  g.montanaLejos = [];
  g.montanaCerca = [];
  const fa = [r() * 6, r() * 6, r() * 6];
  for (let x = -20; x <= W + 20; x += 24) {
    // Los Farallones, más altos hacia el occidente (izquierda).
    const y =
      395 - 85 * (1 - x / W) - 45 * Math.sin(x * 0.0032 + fa[0]) - 22 * Math.sin(x * 0.011 + fa[1]) - 8 * Math.sin(x * 0.045 + fa[2]);
    g.montanaLejos.push([x, y]);
    const y2 = 488 - 22 * Math.sin(x * 0.0045 + fa[1]) - 10 * Math.sin(x * 0.017 + fa[2]) - 5 * Math.sin(x * 0.06 + fa[0]);
    g.montanaCerca.push([x, y2]);
  }

  g.nubes = Array.from({ length: 6 }, (_, i) => {
    const cx = 120 + i * 320 + r() * 120;
    const cy = 120 + r() * 170;
    const e = 0.7 + r() * 0.6;
    return { burbujas: Array.from({ length: 6 }, () => ({ x: cx + (r() - 0.5) * 220 * e, y: cy + (r() - 0.5) * 34 * e, r: (30 + r() * 38) * e })) };
  });

  g.lago = poligonoElipse(r, LAGO, 120, 0.035);
  g.isla = poligonoElipse(r, ISLA, 90, 0.06);
  g.pathLago = aPath(g.lago);
  g.pathIsla = aPath(g.isla);
  g.pathAgua = new Path2D();
  g.pathAgua.addPath(g.pathLago);
  g.pathAgua.addPath(g.pathIsla);

  // Árboles: fila del fondo, sobre la isla del meandro y dos grandes al frente.
  g.arbolesFondo = [];
  for (let i = 0; i < 17; i++) {
    const x = 40 + i * 112 + (r() - 0.5) * 60;
    g.arbolesFondo.push(
      generarArbol(r, { x, y: HORIZONTE + 2 + r() * 28, escala: 0.3 + r() * 0.17, umbral: r() * 0.7, flor: i === 3 || i === 9 || i === 14 }),
    );
  }
  g.arbolesFondo.sort((a, b) => a.y - b.y);
  g.arbolesIsla = [660, 820, 1010, 1190, 1350].map((x, i) =>
    generarArbol(r, { x: x + (r() - 0.5) * 40, y: 712 + r() * 14, escala: 0.42 + r() * 0.18, umbral: 0.1 + r() * 0.6, flor: i === 2 }),
  );
  g.arbolesFrente = [
    generarArbol(r, { x: 150, y: 1085, escala: 1.4, umbral: 0.35 }),
    generarArbol(r, { x: 1800, y: 1085, escala: 1.2, umbral: 0.5, flor: true }),
  ];

  // Basura que flota en el agua.
  const tipos = ['botella', 'lata', 'vaso', 'paquete', 'bolsa'];
  g.basura = [];
  while (g.basura.length < 46) {
    const x = LAGO.cx + (r() - 0.5) * 2 * LAGO.rx * 0.9;
    const y = LAGO.cy + (r() - 0.5) * 2 * LAGO.ry * 0.9;
    if (!dentro(LAGO, x, y, 0.8) || dentro(ISLA, x, y, 1.25)) continue;
    g.basura.push({ x, y, tipo: tipos[Math.floor(r() * tipos.length)], rot: r() * 6.28, umbral: 0.08 + r() * 0.8, fase: r() * 6.28 });
  }

  g.aceite = Array.from({ length: 8 }, () => {
    let x, y;
    do {
      x = LAGO.cx + (r() - 0.5) * 2 * LAGO.rx * 0.8;
      y = LAGO.cy + (r() - 0.5) * 2 * LAGO.ry * 0.8;
    } while (!dentro(LAGO, x, y, 0.7) || dentro(ISLA, x, y, 1.2));
    return { x, y, rx: 60 + r() * 90, ry: 10 + r() * 14, tono: r() };
  });

  g.brillos = [];
  while (g.brillos.length < 70) {
    const x = LAGO.cx + (r() - 0.5) * 2 * LAGO.rx;
    const y = LAGO.cy + (r() - 0.5) * 2 * LAGO.ry;
    if (!dentro(LAGO, x, y, 0.92) || dentro(ISLA, x, y, 1.1)) continue;
    g.brillos.push({ x, y, largo: 14 + r() * 40, fase: r() * 6.28 });
  }

  // Juncos en las orillas del lago y de la isla.
  g.juncos = [];
  const bordes = [...g.lago.filter((_, i) => i % 1 === 0), ...g.isla];
  for (const [bx, by] of bordes) {
    for (let k = 0; k < 2; k++) {
      g.juncos.push({ x: bx + (r() - 0.5) * 18, y: by + (r() - 0.3) * 8, h: 18 + r() * 40, ang: (r() - 0.5) * 0.5, umbral: r() });
    }
  }
  g.juncos.sort((a, b) => a.y - b.y);

  g.garzas = [
    { x: 560, y: 838, e: 1.0, dir: 1, umbral: 0.4 },
    { x: 1340, y: 848, e: 1.05, dir: -1, umbral: 0.52 },
    { x: 900, y: 912, e: 1.18, dir: 1, umbral: 0.63 },
    { x: 1610, y: 772, e: 0.82, dir: -1, umbral: 0.74 },
    { x: 380, y: 782, e: 0.8, dir: 1, umbral: 0.86 },
  ].map((gz) => ({ ...gz, fase: r() * 6.28 }));

  g.gallinazos = Array.from({ length: 6 }, (_, i) => ({
    cx: 480 + r() * 160,
    cy: 210 + r() * 60,
    rx: 120 + r() * 160,
    ry: 40 + r() * 50,
    vel: (0.18 + r() * 0.16) * (i % 2 ? 1 : -1),
    fase: r() * 6.28,
    umbral: 0.18 + i * 0.05,
    e: 0.75 + r() * 0.4,
  }));

  g.garzasVuelo = Array.from({ length: 7 }, (_, i) => ({
    y: 140 + r() * 210,
    vel: 22 + r() * 22,
    desfase: r() * (W + 400),
    fase: r() * 6.28,
    umbral: 0.45 + i * 0.075,
    e: 0.55 + r() * 0.4,
  }));

  g.coquitos = [
    { x: 720, y: 772, e: 0.9, dir: 1, umbral: 0.7 },
    { x: 1280, y: 776, e: 0.85, dir: -1, umbral: 0.82 },
  ];

  g.iguanas = [
    { x: 1560, y: 1012, e: 1.0, dir: -1, umbral: 0.6 },
    { x: 330, y: 1032, e: 0.85, dir: 1, umbral: 0.88 },
  ];

  const copasIzq = g.arbolesFrente[0].copas;
  g.pericos = [0.2, 0.5, 0.8].map((f, i) => {
    const c = copasIzq[Math.floor(f * (copasIzq.length - 1))];
    return { x: c.x, y: c.y - 8, umbral: 0.84 + i * 0.05, dir: i % 2 ? -1 : 1 };
  });

  // Montículo de basura al frente: el eco de Navarro.
  g.monticulo = Array.from({ length: 90 }, () => {
    const u = r();
    const v = Math.pow(r(), 0.7);
    return { u, v, tipo: [...tipos, 'bolsaNegra', 'bolsaNegra'][Math.floor(r() * 7)], rot: r() * 6.28, umbral: r() };
  });

  g.pastos = Array.from({ length: 140 }, () => ({ x: r() * W, y: 1000 + r() * 80, h: 10 + r() * 22, umbral: r() * 0.9 }));
  g.flores = Array.from({ length: 50 }, () => ({
    x: r() * W,
    y: 1010 + r() * 65,
    c: ['#f4f1e6', '#f2c230', '#e06c8a', '#f0a03c'][Math.floor(r() * 4)],
    umbral: 0.7 + r() * 0.28,
  }));
  g.sueloFrente = [];
  for (let x = -20; x <= W + 20; x += 40) g.sueloFrente.push([x, 1002 + 10 * Math.sin(x * 0.006) + 6 * Math.sin(x * 0.021 + 1)]);

  return g;
}

// ---------------------------------------------------------------------
// figuras
// ---------------------------------------------------------------------
function dibujarObjetoBasura(ctx, x, y, tipo, rot, esc, alfa) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(esc, esc);
  ctx.globalAlpha *= alfa;
  switch (tipo) {
    case 'botella':
      ctx.fillStyle = 'rgba(150,200,225,0.95)';
      ctx.beginPath();
      ctx.roundRect(-13, -4.5, 22, 9, 4);
      ctx.fill();
      ctx.fillStyle = '#2f6fb3';
      ctx.fillRect(9, -2.5, 5, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(-9, -3, 12, 1.6);
      break;
    case 'lata':
      ctx.fillStyle = '#c8352c';
      ctx.beginPath();
      ctx.roundRect(-6, -9, 12, 18, 2);
      ctx.fill();
      ctx.fillStyle = '#d9d9d9';
      ctx.fillRect(-6, -9, 12, 2.5);
      break;
    case 'vaso':
      ctx.fillStyle = '#f3efe6';
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, -8);
      ctx.lineTo(5.5, 8);
      ctx.lineTo(-5.5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7b4a2b';
      ctx.fillRect(-6.5, -2, 13, 4);
      break;
    case 'paquete':
      ctx.fillStyle = '#d4d1c8';
      ctx.beginPath();
      ctx.moveTo(-10, -7);
      ctx.lineTo(9, -8);
      ctx.lineTo(11, 6);
      ctx.lineTo(-9, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8b22a';
      ctx.fillRect(-6, -3, 12, 6);
      break;
    case 'bolsaNegra':
      ctx.fillStyle = '#222220';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3a36';
      ctx.beginPath();
      ctx.ellipse(-4, -4, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: // bolsa plástica
      ctx.fillStyle = 'rgba(235,235,228,0.85)';
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.quadraticCurveTo(-8, -10, 0, -7);
      ctx.quadraticCurveTo(10, -11, 11, 1);
      ctx.quadraticCurveTo(6, 9, -2, 7);
      ctx.quadraticCurveTo(-10, 8, -11, 0);
      ctx.fill();
  }
  ctx.restore();
}

function dibujarGarza(ctx, x, y, e, dir, cabeceo, reflejo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(e * dir, reflejo ? -e * 0.55 : e);
  ctx.lineCap = 'round';
  // patas
  ctx.strokeStyle = reflejo ? '#ffffff' : '#2a2a28';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-3, -34);
  ctx.lineTo(-5, 0);
  ctx.moveTo(3, -34);
  ctx.lineTo(4, 0);
  ctx.stroke();
  // cuerpo
  ctx.fillStyle = '#fbfaf5';
  ctx.beginPath();
  ctx.ellipse(0, -44, 21, 11, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-18, -40);
  ctx.lineTo(-30, -34);
  ctx.lineTo(-16, -46);
  ctx.fill();
  // cuello en S
  ctx.strokeStyle = '#fbfaf5';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(13, -50);
  ctx.bezierCurveTo(26, -62, 4, -72, 13, -86 + cabeceo);
  ctx.stroke();
  // cabeza y pico
  ctx.beginPath();
  ctx.arc(15, -88 + cabeceo, 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (!reflejo) {
    ctx.fillStyle = '#e3b322';
    ctx.beginPath();
    ctx.moveTo(19, -90 + cabeceo);
    ctx.lineTo(38, -86 + cabeceo);
    ctx.lineTo(19, -86 + cabeceo);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(16.5, -89.5 + cabeceo, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dibujarGarzaVuelo(ctx, x, y, e, aleteo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(e, e);
  ctx.fillStyle = '#fbfaf5';
  ctx.strokeStyle = '#fbfaf5';
  ctx.lineCap = 'round';
  // cuerpo con el cuello recogido
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(22, -3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e3b322';
  ctx.beginPath();
  ctx.moveTo(27, -5);
  ctx.lineTo(42, -2);
  ctx.lineTo(27, -1);
  ctx.fill();
  // patas hacia atrás
  ctx.strokeStyle = '#2a2a28';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.lineTo(-44, 5);
  ctx.stroke();
  // alas
  const a = Math.sin(aleteo) * 26;
  ctx.fillStyle = '#f2f1ea';
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.quadraticCurveTo(-6, -20 - a * 0.4, 6, -34 - a);
  ctx.quadraticCurveTo(10, -14, 10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarGallinazo(ctx, x, y, e, angulo) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.scale(e, e);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1b1a18';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-36, -3);
  ctx.quadraticCurveTo(-17, -12, 0, 0);
  ctx.quadraticCurveTo(17, -12, 36, -3);
  ctx.stroke();
  // puntas claras de las alas
  ctx.strokeStyle = '#b9b5aa';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-36, -3);
  ctx.lineTo(-29, -6);
  ctx.moveTo(36, -3);
  ctx.lineTo(29, -6);
  ctx.stroke();
  ctx.fillStyle = '#1b1a18';
  ctx.beginPath();
  ctx.ellipse(0, 1, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarCoquito(ctx, x, y, e, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(e * dir, e);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#7a4d42';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, -16);
  ctx.lineTo(-5, 0);
  ctx.moveTo(3, -16);
  ctx.lineTo(5, 0);
  ctx.stroke();
  ctx.fillStyle = '#3b302a';
  ctx.beginPath();
  ctx.ellipse(0, -24, 17, 9, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // cabeza baja, buscando comida
  ctx.strokeStyle = '#3b302a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(12, -26);
  ctx.quadraticCurveTo(22, -24, 24, -14);
  ctx.stroke();
  ctx.fillStyle = '#b9614f';
  ctx.beginPath();
  ctx.arc(25, -12, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b9614f';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(27, -11);
  ctx.quadraticCurveTo(38, -8, 37, 2);
  ctx.stroke();
  ctx.restore();
}

function dibujarIguana(ctx, x, y, e, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(e * dir, e);
  const verde = '#5e8f37';
  const oscuro = '#3f6a28';
  // cola
  ctx.fillStyle = verde;
  ctx.beginPath();
  ctx.moveTo(-38, -7);
  ctx.bezierCurveTo(-80, -10, -120, 4, -160, 10);
  ctx.bezierCurveTo(-120, 9, -80, 6, -38, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = oscuro;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const tx = -55 - i * 17;
    ctx.beginPath();
    ctx.moveTo(tx, -6 + i * 1.6);
    ctx.lineTo(tx - 3, 5 + i * 0.9);
    ctx.stroke();
  }
  // patas
  ctx.strokeStyle = verde;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(28, 6);
  ctx.lineTo(38, 20);
  ctx.moveTo(-24, 6);
  ctx.lineTo(-34, 20);
  ctx.stroke();
  // cuerpo
  ctx.fillStyle = verde;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#86ad4c';
  ctx.beginPath();
  ctx.ellipse(4, 6, 36, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // cresta
  ctx.fillStyle = oscuro;
  for (let i = 0; i < 12; i++) {
    const cx = -32 + i * 6.5;
    ctx.beginPath();
    ctx.moveTo(cx - 3, -11);
    ctx.lineTo(cx, -19 - (i > 7 ? 3 : 0));
    ctx.lineTo(cx + 3, -11);
    ctx.fill();
  }
  // cabeza, papada y ojo
  ctx.fillStyle = verde;
  ctx.beginPath();
  ctx.ellipse(54, -4, 19, 10, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8ab04a';
  ctx.beginPath();
  ctx.moveTo(44, 4);
  ctx.quadraticCurveTo(52, 22, 62, 5);
  ctx.fill();
  ctx.fillStyle = '#cfcc9c';
  ctx.beginPath();
  ctx.arc(47, 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1d1b';
  ctx.beginPath();
  ctx.arc(60, -7, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarPerico(ctx, x, y, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = '#4caf3d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.lineTo(-8, 24);
  ctx.lineTo(1, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -9, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8392b';
  ctx.beginPath();
  ctx.arc(5, -12, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9d9b0';
  ctx.beginPath();
  ctx.moveTo(7, -9);
  ctx.lineTo(11, -7);
  ctx.lineTo(7, -6);
  ctx.fill();
  ctx.restore();
}

function dibujarArbol(ctx, a, s) {
  const hoja = paso(a.umbral, a.umbral + 0.25, s);
  const flor = a.flor ? paso(0.8, 0.95, s) : 0;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(color(PAL.tronco, s));
  for (const g of a.segmentos) {
    ctx.lineWidth = Math.max(1, g.w);
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.stroke();
  }
  if (hoja <= 0.01) {
    // Árbol seco: unas pocas hojas marchitas.
    ctx.fillStyle = 'rgba(140,120,80,0.55)';
    a.copas.forEach((c, i) => {
      if (i % 4) return;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }
  const amarillo = [243, 198, 35];
  const base = mezcla(color(PAL.hojaOscura, s), amarillo, flor * 0.85);
  const luz = mezcla(color(PAL.hoja, s), [250, 214, 70], flor * 0.9);
  const k = 0.35 + 0.65 * hoja;
  ctx.fillStyle = rgba(base, 0.55 + 0.45 * hoja);
  for (const c of a.copas) {
    ctx.beginPath();
    ctx.arc(c.x, c.y + c.r * 0.15, c.r * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba(luz, 0.5 + 0.5 * hoja);
  for (const c of a.copas) {
    ctx.beginPath();
    ctx.arc(c.x - c.r * 0.18, c.y - c.r * 0.12, c.r * k * 0.68, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------
// el paisaje
// ---------------------------------------------------------------------
export class Paisaje {
  constructor() {
    this.g = generar();
    this.ondas = [];
    this.sCache = -1;
    this.densidad = 0;
  }

  prepararCapas(densidad) {
    densidad = lim(densidad, 1, 2);
    if (Math.abs(densidad - this.densidad) < 0.01 && this.fondo) return;
    this.densidad = densidad;
    const crear = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(W * densidad);
      c.height = Math.round(H * densidad);
      return c;
    };
    this.fondo = crear();
    this.frente = crear();
    this.sCache = -1;
  }

  // tipo: 'acierto' | 'error'
  pulso(tipo) {
    this.ondas.push({ t0: performance.now(), tipo });
  }

  dibujar(ctx, s, t) {
    s = lim(s);
    if (!this.fondo) this.prepararCapas(1);
    if (Math.abs(s - this.sCache) > 0.003) {
      this.renderFondo(s);
      this.renderFrente(s);
      this.sCache = s;
    }
    ctx.drawImage(this.fondo, 0, 0, W, H);
    this.dibujarAgua(ctx, s, t);
    ctx.drawImage(this.frente, 0, 0, W, H);
    this.dibujarCielo(ctx, s, t);

    // Bruma de un paisaje enfermo y viñeta suave.
    const bruma = 0.24 * (1 - paso(0, 0.6, s));
    if (bruma > 0.005) {
      ctx.fillStyle = `rgba(112,96,70,${bruma})`;
      ctx.fillRect(0, 0, W, H);
    }
    const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  nuevoContexto(lienzo) {
    const ctx = lienzo.getContext('2d');
    ctx.setTransform(this.densidad, 0, 0, this.densidad, 0, 0);
    ctx.clearRect(0, 0, W, H);
    return ctx;
  }

  renderFondo(s) {
    const g = this.g;
    const ctx = this.nuevoContexto(this.fondo);

    // cielo
    const cielo = ctx.createLinearGradient(0, 0, 0, HORIZONTE + 40);
    cielo.addColorStop(0, rgba(color(PAL.cieloArriba, s)));
    cielo.addColorStop(1, rgba(color(PAL.cieloHorizonte, s)));
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, W, HORIZONTE + 40);

    // sol
    const sol = color(PAL.sol, s);
    const halo = ctx.createRadialGradient(1480, 190, 10, 1480, 190, 260);
    halo.addColorStop(0, rgba(sol, 0.55 + 0.35 * s));
    halo.addColorStop(1, rgba(sol, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(1180, 0, 600, 480);
    ctx.fillStyle = rgba(sol, 0.45 + 0.55 * s);
    ctx.beginPath();
    ctx.arc(1480, 190, 46, 0, Math.PI * 2);
    ctx.fill();

    // nubes
    ctx.fillStyle = rgba(color(PAL.nube, s), 0.5 + 0.2 * s);
    for (const n of g.nubes) {
      for (const b of n.burbujas) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // smog sobre el horizonte
    const smog = 1 - paso(0, 0.55, s);
    if (smog > 0.01) {
      const sg = ctx.createLinearGradient(0, 300, 0, HORIZONTE + 20);
      sg.addColorStop(0, 'rgba(150,128,96,0)');
      sg.addColorStop(1, `rgba(150,128,96,${0.55 * smog})`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, 300, W, HORIZONTE - 280);
    }

    // cordilleras
    const cordillera = (pts, c) => {
      ctx.fillStyle = rgba(c);
      ctx.beginPath();
      ctx.moveTo(-20, HORIZONTE + 40);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(W + 20, HORIZONTE + 40);
      ctx.closePath();
      ctx.fill();
    };
    cordillera(g.montanaLejos, color(PAL.montanaLejos, s));
    cordillera(g.montanaCerca, color(PAL.montanaCerca, s));

    // llanura del valle
    const ll = ctx.createLinearGradient(0, HORIZONTE, 0, H);
    ll.addColorStop(0, rgba(color(PAL.llanura, s)));
    ll.addColorStop(1, rgba(color(PAL.llanuraCerca, s)));
    ctx.fillStyle = ll;
    ctx.fillRect(0, HORIZONTE, W, H - HORIZONTE);

    for (const a of g.arbolesFondo) dibujarArbol(ctx, a, s);

    // agua de la madrevieja
    const agua = ctx.createLinearGradient(0, LAGO.cy - LAGO.ry, 0, LAGO.cy + LAGO.ry);
    agua.addColorStop(0, rgba(color(PAL.aguaLejos, s)));
    agua.addColorStop(1, rgba(color(PAL.aguaCerca, s)));
    ctx.fillStyle = agua;
    ctx.fill(g.pathLago);

    // manchas de lixiviado
    const aceite = 1 - paso(0.1, 0.45, s);
    if (aceite > 0.01) {
      for (const m of g.aceite) {
        const gr = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, m.rx);
        const c = m.tono < 0.5 ? '120,90,140' : '110,130,70';
        gr.addColorStop(0, `rgba(${c},${0.35 * aceite})`);
        gr.addColorStop(1, `rgba(${c},0)`);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.scale(1, m.ry / m.rx);
        ctx.translate(-m.x, -m.y);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.strokeStyle = rgba(color(PAL.orilla, s), 0.9);
    ctx.lineWidth = 9;
    ctx.stroke(g.pathLago);

    // isla del meandro
    ctx.fillStyle = rgba(color(PAL.isla, s));
    ctx.fill(g.pathIsla);
    ctx.lineWidth = 6;
    ctx.stroke(g.pathIsla);
    for (const a of g.arbolesIsla) dibujarArbol(ctx, a, s);
    for (const c of g.coquitos) {
      const al = paso(c.umbral, c.umbral + 0.04, s);
      if (al > 0.01) {
        ctx.globalAlpha = al;
        dibujarCoquito(ctx, c.x, c.y, c.e, c.dir);
        ctx.globalAlpha = 1;
      }
    }

    // juncos
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(color(PAL.junco, s));
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const j of g.juncos) {
      const f = paso(j.umbral * 0.9, j.umbral * 0.9 + 0.1, s);
      if (f <= 0) continue;
      const h = j.h * (0.4 + 0.6 * f);
      ctx.moveTo(j.x, j.y);
      ctx.quadraticCurveTo(j.x + j.ang * h * 0.3, j.y - h * 0.6, j.x + j.ang * h, j.y - h);
    }
    ctx.stroke();
  }

  renderFrente(s) {
    const g = this.g;
    const ctx = this.nuevoContexto(this.frente);

    // suelo del primer plano
    const sg = ctx.createLinearGradient(0, 990, 0, H);
    sg.addColorStop(0, rgba(color(PAL.suelo, s)));
    sg.addColorStop(1, rgba(color(PAL.sueloOscuro, s)));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-20, H + 10);
    g.sueloFrente.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(W + 20, H + 10);
    ctx.closePath();
    ctx.fill();

    // montículo de basura (Navarro)
    const k = 1 - paso(0.12, 0.55, s);
    if (k > 0.01) {
      const x0 = 380;
      const x1 = 900;
      const alto = 190 * k;
      const cima = (u) => H + 4 - alto * Math.pow(Math.sin(Math.PI * u), 0.8);
      ctx.fillStyle = '#6b604f';
      ctx.beginPath();
      ctx.moveTo(x0, H + 4);
      for (let u = 0; u <= 1.0001; u += 0.05) ctx.lineTo(x0 + (x1 - x0) * u, cima(u) + Math.sin(u * 40) * 4 * k);
      ctx.lineTo(x1, H + 4);
      ctx.closePath();
      ctx.fill();
      for (const m of g.monticulo) {
        if (m.umbral > k * 1.1) continue;
        const x = x0 + (x1 - x0) * (0.08 + 0.84 * m.u);
        const techo = cima(0.08 + 0.84 * m.u);
        const y = techo + (H - techo) * m.v * 0.9 + 6;
        dibujarObjetoBasura(ctx, x, y, m.tipo, m.rot, 1.6, 1);
      }
    }

    // roca de las iguanas
    ctx.fillStyle = '#8c877a';
    ctx.beginPath();
    ctx.ellipse(1560, 1040, 100, 40, 0, Math.PI, 0);
    ctx.lineTo(1660, 1060);
    ctx.lineTo(1460, 1060);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(1535, 1018, 50, 10, -0.1, 0, Math.PI * 2);
    ctx.fill();
    for (const ig of g.iguanas) {
      const al = paso(ig.umbral, ig.umbral + 0.04, s);
      if (al > 0.01) {
        ctx.globalAlpha = al;
        dibujarIguana(ctx, ig.x, ig.y, ig.e, ig.dir);
        ctx.globalAlpha = 1;
      }
    }

    // árboles grandes
    for (const a of g.arbolesFrente) dibujarArbol(ctx, a, s);
    for (const p of g.pericos) {
      const al = paso(p.umbral, p.umbral + 0.03, s);
      if (al > 0.01) {
        ctx.globalAlpha = al;
        dibujarPerico(ctx, p.x, p.y, p.dir);
        ctx.globalAlpha = 1;
      }
    }

    // pasto y flores
    ctx.strokeStyle = rgba(color(PAL.pasto, s));
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const p of g.pastos) {
      const f = paso(p.umbral, p.umbral + 0.12, s);
      if (f <= 0) continue;
      const h = p.h * f;
      ctx.moveTo(p.x - 4, p.y);
      ctx.lineTo(p.x - 7, p.y - h);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 1, p.y - h * 1.2);
      ctx.moveTo(p.x + 4, p.y);
      ctx.lineTo(p.x + 8, p.y - h * 0.9);
    }
    ctx.stroke();
    for (const f of g.flores) {
      const al = paso(f.umbral, f.umbral + 0.05, s);
      if (al <= 0.01) continue;
      ctx.fillStyle = f.c;
      ctx.globalAlpha = al;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  dibujarAgua(ctx, s, t) {
    const g = this.g;
    const seg = t / 1000;
    ctx.save();
    ctx.clip(g.pathAgua, 'evenodd');

    // brillos del agua: más vivos cuando está limpia
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (const b of g.brillos) {
      const a = (0.05 + 0.3 * s) * (0.5 + 0.5 * Math.sin(seg * 1.3 + b.fase));
      ctx.globalAlpha = a;
      const dx = Math.sin(seg * 0.4 + b.fase) * 6;
      ctx.beginPath();
      ctx.moveTo(b.x - b.largo / 2 + dx, b.y);
      ctx.lineTo(b.x + b.largo / 2 + dx, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ondas de acierto o error
    const ahora = performance.now();
    this.ondas = this.ondas.filter((o) => ahora - o.t0 < 2600);
    for (const o of this.ondas) {
      const f = (ahora - o.t0) / 2600;
      for (let i = 0; i < 3; i++) {
        const fi = f - i * 0.12;
        if (fi <= 0) continue;
        ctx.strokeStyle = o.tipo === 'acierto' ? `rgba(255,255,255,${0.6 * (1 - fi)})` : `rgba(80,62,36,${0.6 * (1 - fi)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(LAGO.cx, 880, 30 + fi * 560, (30 + fi * 560) * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // basura flotando
    for (const b of g.basura) {
      const al = 1 - paso(b.umbral - 0.06, b.umbral, s);
      if (al <= 0.01) continue;
      const y = b.y + Math.sin(seg * 1.1 + b.fase) * 2;
      dibujarObjetoBasura(ctx, b.x, y, b.tipo, b.rot + Math.sin(seg * 0.5 + b.fase) * 0.15, 1.1, al);
    }

    // reflejos de las garzas
    for (const gz of g.garzas) {
      const al = paso(gz.umbral, gz.umbral + 0.04, s);
      if (al <= 0.01) continue;
      ctx.globalAlpha = al * 0.22;
      dibujarGarza(ctx, gz.x, gz.y, gz.e, gz.dir, 0, true);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // garzas
    for (const gz of g.garzas) {
      const al = paso(gz.umbral, gz.umbral + 0.04, s);
      if (al <= 0.01) continue;
      ctx.globalAlpha = al;
      dibujarGarza(ctx, gz.x, gz.y, gz.e, gz.dir, Math.sin(seg * 0.9 + gz.fase) * 1.6, false);
    }
    ctx.globalAlpha = 1;
  }

  dibujarCielo(ctx, s, t) {
    const g = this.g;
    const seg = t / 1000;
    // gallinazos dando vueltas sobre la basura
    for (const b of g.gallinazos) {
      const al = 1 - paso(b.umbral, b.umbral + 0.12, s);
      if (al <= 0.01) continue;
      const a = seg * b.vel + b.fase;
      const x = b.cx + Math.cos(a) * b.rx;
      const y = b.cy + Math.sin(a) * b.ry;
      ctx.globalAlpha = al;
      dibujarGallinazo(ctx, x, y, b.e, Math.cos(a) * 0.18 * Math.sign(b.vel));
    }
    // garzas que vuelven
    for (const b of g.garzasVuelo) {
      const al = paso(b.umbral, b.umbral + 0.05, s);
      if (al <= 0.01) continue;
      const x = ((seg * b.vel + b.desfase) % (W + 400)) - 200;
      const y = b.y + Math.sin(seg * 0.6 + b.fase) * 8;
      ctx.globalAlpha = al;
      dibujarGarzaVuelo(ctx, x, y, b.e, seg * 4 + b.fase);
    }
    ctx.globalAlpha = 1;
  }
}
