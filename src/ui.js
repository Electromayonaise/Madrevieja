// Todo lo que se dibuja encima del paisaje: tarjetas, contador, medidor,
// vista previa de la cámara y avisos para quien opera.

import { ANCHO as W, ALTO as H, CANECAS, ORDEN_CANECAS, TEXTOS } from './config.js';

const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MX = 96;
const MY = 60;

const BLANCO = '#f7f5ef';
const SUAVE = 'rgba(247,245,239,0.74)';
const AMBAR = '#f2c14e';
const VERDE_OK = '#9be07f';
const ROJO = '#ff9f80';
const FONDO_TARJETA = 'rgba(14,22,18,0.84)';

const lim = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const salida = (x) => 1 - Math.pow(1 - lim(x), 3);

function fuente(ctx, tam, peso = 400, familia = SANS, estilo = 'normal') {
  ctx.font = `${estilo} ${peso} ${tam}px ${familia}`;
}

function partir(ctx, texto, ancho) {
  const palabras = String(texto).split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && actual) {
      lineas.push(actual);
      actual = p;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ---------------------------------------------------------------------
// bloques de una tarjeta: se miden primero y luego se pintan
// ---------------------------------------------------------------------
function medir(ctx, b, ancho) {
  switch (b.tipo) {
    case 'texto': {
      fuente(ctx, b.tam, b.peso, b.familia, b.estilo);
      b.lineas = partir(ctx, b.t, ancho);
      return b.lineas.length * b.tam * (b.interlinea || 1.22);
    }
    case 'caneca':
      return b.grande ? 196 : 104;
    case 'canecas':
      return 128;
    case 'fila':
      return 104;
    case 'barra':
      return 12;
    default:
      return 0;
  }
}

function chipCaneca(ctx, id, cx, y, grande, alfa = 1) {
  const c = CANECAS[id];
  const tam = grande ? 112 : 54;
  fuente(ctx, tam, 800);
  const ancho = ctx.measureText(c.nombre).width + (grande ? 130 : 70);
  const alto = grande ? 196 : 104;
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = c.fondo;
  redondeado(ctx, cx - ancho / 2, y, ancho, alto, grande ? 34 : 22);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = id === 'negra' ? 'rgba(255,255,255,0.35)' : c.borde;
  ctx.stroke();
  ctx.fillStyle = c.tinta;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  fuente(ctx, tam, 800);
  ctx.fillText(c.nombre, cx, y + (grande ? 122 : 70));
  if (grande) {
    fuente(ctx, 32, 500);
    ctx.fillText(c.tipo, cx, y + 168);
  }
  ctx.restore();
  return ancho;
}

function filaCanecas(ctx, cx, y, ancho, resaltar, t) {
  const n = ORDEN_CANECAS.length;
  const sep = 28;
  const w = Math.min(300, (ancho - sep * (n - 1)) / n);
  const total = w * n + sep * (n - 1);
  ORDEN_CANECAS.forEach((id, i) => {
    const c = CANECAS[id];
    const x = cx - total / 2 + i * (w + sep);
    const activa = !resaltar || resaltar === id;
    ctx.save();
    ctx.globalAlpha *= activa ? 1 : 0.32;
    ctx.fillStyle = c.fondo;
    redondeado(ctx, x, y + 12, w, 104, 20);
    ctx.fill();
    ctx.lineWidth = resaltar === id ? 6 : 3;
    ctx.strokeStyle = resaltar === id ? BLANCO : id === 'negra' ? 'rgba(255,255,255,0.3)' : c.borde;
    ctx.stroke();
    ctx.fillStyle = c.tinta;
    ctx.textAlign = 'center';
    fuente(ctx, 42, 800);
    ctx.fillText(c.nombre, x + w / 2, y + 62);
    fuente(ctx, 22, 500);
    ctx.fillText(c.tipo, x + w / 2, y + 96);
    ctx.restore();
    if (resaltar === id) {
      // flecha hacia abajo, donde están las canecas de verdad
      const by = y + 12 + 104 + 8 + Math.sin(t / 220) * 6;
      ctx.fillStyle = BLANCO;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 18, by);
      ctx.lineTo(x + w / 2 + 18, by);
      ctx.lineTo(x + w / 2, by + 20);
      ctx.fill();
    }
  });
}

function pintar(ctx, b, x, y, ancho, t) {
  const cx = x + ancho / 2;
  switch (b.tipo) {
    case 'texto': {
      fuente(ctx, b.tam, b.peso, b.familia, b.estilo);
      ctx.fillStyle = b.color || BLANCO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const il = b.tam * (b.interlinea || 1.22);
      b.lineas.forEach((l, i) => ctx.fillText(l, cx, y + b.tam * 0.95 + i * il));
      break;
    }
    case 'caneca':
      chipCaneca(ctx, b.caneca, cx, y, b.grande);
      break;
    case 'canecas':
      filaCanecas(ctx, cx, y - 12, ancho, b.resaltar, t);
      break;
    case 'fila': {
      // "Cayó en la [X]  ·  iba en la [Y]"
      const partes = b.partes; // [{t}, {caneca}, ...]
      fuente(ctx, 40, 500);
      const anchos = partes.map((p) => {
        if (p.t) return ctx.measureText(p.t).width;
        fuente(ctx, 54, 800);
        const w = ctx.measureText(CANECAS[p.caneca].nombre).width + 70;
        fuente(ctx, 40, 500);
        return w;
      });
      const sep = 22;
      const total = anchos.reduce((a, w) => a + w, 0) + sep * (partes.length - 1);
      let px = cx - total / 2;
      partes.forEach((p, i) => {
        if (p.t) {
          fuente(ctx, 40, 500);
          ctx.fillStyle = SUAVE;
          ctx.textAlign = 'left';
          ctx.fillText(p.t, px, y + 66);
        } else {
          chipCaneca(ctx, p.caneca, px + anchos[i] / 2, y, false, p.tachada ? 0.9 : 1);
          if (p.tachada) {
            ctx.strokeStyle = ROJO;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(px + 10, y + 90);
            ctx.lineTo(px + anchos[i] - 10, y + 14);
            ctx.stroke();
          }
        }
        px += anchos[i] + sep;
      });
      break;
    }
    case 'barra': {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      redondeado(ctx, x, y, ancho, 12, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      redondeado(ctx, x, y, Math.max(12, ancho * lim(b.f)), 12, 6);
      ctx.fill();
      break;
    }
  }
}

function tarjeta(ctx, bloques, { ancho = 1180, centroY = 470, t, entrada = 1, acento = null, relleno = 64 }) {
  const interior = ancho - relleno * 2;
  let alto = 0;
  for (const b of bloques) alto += (b.espacio ?? 0) + medir(ctx, b, interior);
  alto += relleno * 2 - 8;
  const x = (W - ancho) / 2;
  const y = Math.max(150, centroY - alto / 2);

  const e = salida(entrada);
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(W / 2, y + alto / 2 + (1 - e) * 40);
  const k = 0.96 + 0.04 * e;
  ctx.scale(k, k);
  ctx.translate(-W / 2, -(y + alto / 2));

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = FONDO_TARJETA;
  redondeado(ctx, x, y, ancho, alto, 40);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (acento) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = acento;
    ctx.fillRect(x, y, ancho, 12);
    ctx.restore();
  }

  let cy = y + relleno - 8;
  for (const b of bloques) {
    cy += b.espacio ?? 0;
    pintar(ctx, b, x + relleno, cy, interior, t);
    cy += medir(ctx, b, interior);
  }
  ctx.restore();
}

const txt = (t, tam, extra = {}) => ({ tipo: 'texto', t, tam, peso: 400, ...extra });

// ---------------------------------------------------------------------
// pantallas
// ---------------------------------------------------------------------
function pantallaEspera(ctx, exp, t) {
  const mirando = exp.ultimaLectura && exp.ultimaLectura !== 'fondo';
  const bloques = [
    txt(TEXTOS.espera.principal, 74, { peso: 700 }),
    txt(TEXTOS.espera.secundario, 44, { color: SUAVE, espacio: 6 }),
  ];
  if (mirando) {
    const puntos = '.'.repeat(1 + (Math.floor(t / 400) % 3));
    bloques.push(txt(`Mantenlo quieto un momento${puntos}`, 34, { color: AMBAR, espacio: 26, peso: 600 }));
  } else {
    bloques.push(txt(TEXTOS.espera.herencia, 32, { color: SUAVE, familia: SERIF, estilo: 'italic', espacio: 26 }));
  }
  tarjeta(ctx, bloques, { ancho: 1400, centroY: 420, t, entrada: exp.tiempoEnEstado / 500 });
}

function pantallaGuia(ctx, exp, t, restante) {
  const r = exp.datos.residuo;
  const bloques = [
    txt(r.nombre, 64, { peso: 700 }),
    { tipo: 'fila', espacio: 14, partes: [{ t: TEXTOS.guia.vaEn }, { caneca: r.caneca }] },
    txt(r.consejo, 38, { peso: 600, espacio: 26 }),
    txt(`${TEXTOS.guia.siSeMezcla} ${r.mezcla}`, 30, { color: AMBAR, espacio: 12 }),
    { tipo: 'canecas', resaltar: r.caneca, espacio: 40 },
    { tipo: 'barra', f: restante, espacio: 28 },
  ];
  tarjeta(ctx, bloques, { centroY: 500, t, entrada: exp.tiempoEnEstado / 350 });
}

function pantallaDuda(ctx, exp, t, restante, hayCamaraCanecas) {
  const bloques = [
    txt(exp.datos.otro ? TEXTOS.duda.tituloOtro : TEXTOS.duda.titulo, 72, { peso: 700, familia: SERIF, estilo: 'italic' }),
    txt(TEXTOS.duda.pregunta, 44, { color: SUAVE, espacio: 10 }),
    { tipo: 'canecas', espacio: 34 },
  ];
  for (const id of ORDEN_CANECAS) {
    bloques.push(txt(`${CANECAS[id].nombre}: ${CANECAS[id].regla}`, 27, { color: SUAVE, espacio: id === 'blanca' ? 36 : 6 }));
  }
  if (hayCamaraCanecas) bloques.push({ tipo: 'barra', f: restante, espacio: 34 });
  tarjeta(ctx, bloques, { centroY: 520, t, entrada: exp.tiempoEnEstado / 350 });
}

function pantallaRespuesta(ctx, exp, t) {
  const d = exp.datos;
  const entrada = exp.tiempoEnEstado / 350;
  let bloques;
  let acento = null;
  if (d.tipo === 'acierto') {
    acento = VERDE_OK;
    bloques = [
      txt(TEXTOS.acierto.titulo, 92, { peso: 800, color: VERDE_OK }),
      txt(`${d.residuo.nombre} → ${CANECAS[d.caneca].nombre}`, 40, { color: SUAVE, espacio: 8 }),
      txt(d.residuo.destino, 44, { peso: 600, espacio: 34 }),
      txt(d.efecto, 36, { familia: SERIF, estilo: 'italic', color: VERDE_OK, espacio: 26 }),
    ];
  } else if (d.tipo === 'error') {
    acento = ROJO;
    bloques = [
      txt(d.residuo.nombre, 56, { peso: 700 }),
      {
        tipo: 'fila',
        espacio: 24,
        partes: [{ t: TEXTOS.error.cayoEn }, { caneca: d.caneca, tachada: true }, { t: `· ${TEXTOS.error.ibaEn}` }, { caneca: d.residuo.caneca }],
      },
      txt(d.residuo.mezcla, 42, { peso: 600, color: AMBAR, espacio: 36 }),
      txt(TEXTOS.error.cierre, 32, { color: SUAVE, familia: SERIF, estilo: 'italic', espacio: 26 }),
    ];
  } else if (d.tipo === 'duda') {
    acento = AMBAR;
    bloques = [
      txt(TEXTOS.dudaRespuesta.titulo, 72, { peso: 700 }),
      { tipo: 'fila', espacio: 20, partes: [{ t: TEXTOS.error.cayoEn }, { caneca: d.caneca }] },
      txt(TEXTOS.dudaRespuesta.texto, 38, { color: SUAVE, espacio: 32 }),
    ];
  } else {
    // guiado (plan B, sin cámara de canecas)
    acento = VERDE_OK;
    bloques = [
      txt(TEXTOS.guiado.titulo, 80, { peso: 700 }),
      txt(`${d.residuo.nombre} → ${CANECAS[d.residuo.caneca].nombre}`, 40, { color: SUAVE, espacio: 8 }),
      txt(d.residuo.destino, 42, { peso: 600, espacio: 30 }),
    ];
  }
  tarjeta(ctx, bloques, { centroY: 500, t, entrada, acento });
}

// ---------------------------------------------------------------------
// elementos fijos
// ---------------------------------------------------------------------
function encabezado(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0, 'rgba(0,0,0,0.38)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 220);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = BLANCO;
  fuente(ctx, 68, 400, SERIF, 'italic');
  ctx.fillText(TEXTOS.titulo, MX, MY + 58);
  fuente(ctx, 26, 400);
  ctx.fillStyle = SUAVE;
  ctx.fillText(TEXTOS.subtitulo, MX + 2, MY + 100);
}

function contador(ctx, n, destello) {
  const num = String(n);
  fuente(ctx, 64, 800);
  const wn = ctx.measureText(num).width;
  fuente(ctx, 28, 500);
  const wt = ctx.measureText(TEXTOS.aciertosHoy).width;
  const w = wn + wt + 82;
  const x = W - MX - w;
  const y = MY;
  ctx.save();
  ctx.fillStyle = FONDO_TARJETA;
  redondeado(ctx, x, y, w, 96, 48);
  ctx.fill();
  if (destello > 0) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(155,224,127,${destello})`;
    ctx.stroke();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = VERDE_OK;
  fuente(ctx, 64, 800);
  ctx.fillText(num, x + 34, y + 72);
  ctx.fillStyle = BLANCO;
  fuente(ctx, 28, 500);
  ctx.fillText(TEXTOS.aciertosHoy, x + 34 + wn + 16, y + 62);
  ctx.restore();
}

function medidor(ctx, s) {
  const x = MX;
  const y = H - MY - 92;
  const w = 460;
  ctx.save();
  ctx.fillStyle = FONDO_TARJETA;
  redondeado(ctx, x - 26, y - 22, w + 52, 120, 28);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = SUAVE;
  fuente(ctx, 22, 500);
  ctx.fillText(TEXTOS.estadoMadrevieja, x, y + 10);
  const i = s < 0.34 ? 0 : s < 0.67 ? 1 : 2;
  ctx.fillStyle = BLANCO;
  fuente(ctx, 34, 700);
  ctx.fillText(TEXTOS.estados[i], x, y + 52);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#7a5b3a');
  g.addColorStop(0.5, '#b8a347');
  g.addColorStop(1, '#4fae4a');
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  redondeado(ctx, x, y + 68, w, 14, 7);
  ctx.fill();
  ctx.fillStyle = g;
  redondeado(ctx, x, y + 68, Math.max(14, w * s), 14, 7);
  ctx.fill();
  ctx.restore();
}

function vistaPrevia(ctx, video) {
  if (!video || video.readyState < 2) return;
  const w = 300;
  const h = Math.round((w * video.videoHeight) / video.videoWidth) || 225;
  const x = W - MX - w;
  const y = H - MY - h - 30;
  ctx.save();
  redondeado(ctx, x, y, w, h, 18);
  ctx.save();
  ctx.clip();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1); // como un espejo
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  fuente(ctx, 18, 500);
  ctx.textAlign = 'right';
  ctx.fillText('La cámara no guarda imágenes', x + w, y + h + 24);
  ctx.restore();
}

function datoRotativo(ctx, t) {
  const periodo = 9000;
  const i = Math.floor(t / periodo) % TEXTOS.datos.length;
  const f = (t % periodo) / periodo;
  const alfa = Math.min(1, f * 8, (1 - f) * 8);
  ctx.save();
  ctx.globalAlpha = alfa;
  fuente(ctx, 30, 400, SERIF, 'italic');
  const lineas = partir(ctx, TEXTOS.datos[i], 820);
  ctx.textAlign = 'center';
  ctx.fillStyle = BLANCO;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 12;
  const y0 = H - MY - 30 - (lineas.length - 1) * 38;
  lineas.forEach((l, k) => ctx.fillText(l, W / 2, y0 + k * 38));
  ctx.restore();
}

function avisos(ctx, lista) {
  if (!lista.length) return;
  ctx.save();
  fuente(ctx, 24, 600);
  // Abajo al centro, entre el medidor y la vista previa.
  let y = H - MY - 44 - (lista.length - 1) * 54;
  for (const a of lista) {
    const w = ctx.measureText(a).width + 48;
    ctx.fillStyle = 'rgba(242,193,78,0.94)';
    redondeado(ctx, (W - w) / 2, y, w, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#2a2108';
    ctx.textAlign = 'center';
    ctx.fillText(a, W / 2, y + 30);
    y += 54;
  }
  ctx.restore();
}

function depuracion(ctx, info) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  redondeado(ctx, MX - 16, 200, 620, 30 * info.length + 24, 12);
  ctx.fill();
  ctx.fillStyle = '#d9f99d';
  ctx.font = '20px Consolas, monospace';
  ctx.textAlign = 'left';
  info.forEach((l, i) => ctx.fillText(l, MX, 232 + i * 30));
  ctx.restore();
}

const AYUDA = [
  ['A', 'Panel de control (cámaras, entrenamiento, canecas, ajustes)'],
  ['F', 'Pantalla completa'],
  ['D', 'Datos de depuración'],
  ['1 – 6', 'Simular residuo: botella, vaso, paquete, servilleta, orgánico, lata'],
  ['7', 'Simular objeto desconocido'],
  ['B · V · N', 'Simular que cayó en la blanca, verde o negra'],
  ['H', 'Mostrar u ocultar esta ayuda'],
];

function ayuda(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,8,0.94)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = BLANCO;
  ctx.textAlign = 'left';
  fuente(ctx, 54, 700);
  ctx.fillText('Teclas', 420, 260);
  AYUDA.forEach(([k, d], i) => {
    const y = 350 + i * 70;
    fuente(ctx, 34, 800);
    ctx.fillStyle = AMBAR;
    ctx.fillText(k, 420, y);
    fuente(ctx, 32, 400);
    ctx.fillStyle = BLANCO;
    ctx.fillText(d, 640, y);
  });
  ctx.restore();
}

// ---------------------------------------------------------------------
export function dibujarUI(ctx, e) {
  const { exp, t, s, hoy, destello } = e;
  encabezado(ctx);
  contador(ctx, hoy.aciertos, destello);
  medidor(ctx, s);
  if (e.preview) vistaPrevia(ctx, e.preview);

  const restante = exp.restante({ hayCamaraCanecas: e.hayCamaraCanecas });
  if (exp.estado === 'espera') {
    pantallaEspera(ctx, exp, t);
    if (!e.avisos?.length) datoRotativo(ctx, t);
  } else if (exp.estado === 'guia') pantallaGuia(ctx, exp, t, restante);
  else if (exp.estado === 'duda') pantallaDuda(ctx, exp, t, restante, e.hayCamaraCanecas);
  else if (exp.estado === 'respuesta') pantallaRespuesta(ctx, exp, t);

  avisos(ctx, e.avisos || []);
  if (e.depuracion) depuracion(ctx, e.depuracion);
  if (e.ayuda) ayuda(ctx);
}
