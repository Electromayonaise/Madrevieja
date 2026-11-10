// Madrevieja · arranque y ciclo principal.

/* global tf */
import { ANCHO as W, ALTO as H, RESIDUOS } from './config.js';
import { ajustes, guardarAjustes } from './ajustes.js';
import { listarCamaras, sugerirAsignacion, resolver, abrirCamara, cerrarCamara, camaraLista } from './camaras.js';
import { Extractor, Clasificador, Almacen, importarCarpetaData } from './modelo.js';
import { DetectorCanecas } from './deteccion.js';
import { Memoria } from './memoria.js';
import { Experiencia } from './experiencia.js';
import { Paisaje } from './paisaje.js';
import { dibujarUI } from './ui.js';
import { Panel } from './panel.js';

const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');

const memoria = new Memoria(ajustes.paisaje.saludInicial);
const paisaje = new Paisaje();
const detector = new DetectorCanecas(ajustes);

let sVisible = memoria.salud / 100;
let destelloHasta = 0;
let depurar = false;
let mostrarAyuda = false;
let extractor = null;
let errorModelo = null;
let ilustraciones = null;
const errores = { cam1: null, cam2: null };

const app = {
  ajustes,
  guardarAjustes,
  memoria,
  detector,
  captura: { clase: null },
  camaras: [],
  cam1: null,
  cam2: null,
  clasificador: new Clasificador(1280),
  almacen: null,
  ultimaPrediccion: null,
  extractorListo: false,
  hayIlustraciones: false,
  leer: (p) => exp.leer(p),
  refrescarCamaras,
  asignarCamaras,
  cerrarPanel,
};

const exp = new Experiencia({
  ajustes,
  memoria,
  alCambiar(estado) {
    if (estado === 'guia' || estado === 'duda') detector.armar();
    else detector.desarmar();
    if (estado === 'respuesta') {
      const tipo = exp.datos.tipo;
      if (tipo === 'acierto' || tipo === 'guiado') {
        paisaje.pulso('acierto');
        destelloHasta = performance.now() + 1800;
      } else if (tipo === 'error') paisaje.pulso('error');
    }
  },
});

const panel = new Panel(app);
window.madrevieja = { app, exp, paisaje }; // para depurar desde la consola

// ---------------------------------------------------------------------
// Pantalla: lienzo virtual de 1920×1080, escalado al tamaño que tenga el televisor
// ---------------------------------------------------------------------
let escala = 1;
let ox = 0;
let oy = 0;
let dpr = 1;

function ajustarLienzo() {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  lienzo.width = Math.round(w * dpr);
  lienzo.height = Math.round(h * dpr);
  lienzo.style.width = `${w}px`;
  lienzo.style.height = `${h}px`;
  escala = Math.min(w / W, h / H);
  ox = (w - W * escala) / 2;
  oy = (h - H * escala) / 2;
  paisaje.prepararCapas(escala * dpr);
}
window.addEventListener('resize', ajustarLienzo);
ajustarLienzo();

// ---------------------------------------------------------------------
// Cámaras
// ---------------------------------------------------------------------
async function refrescarCamaras() {
  app.camaras = await listarCamaras();
  return app.camaras;
}

async function abrirSegura(camara, cual) {
  errores[cual] = null;
  if (!camara) return null;
  try {
    return await abrirCamara(camara);
  } catch (e) {
    console.warn(`No se pudo abrir ${camara.nombre}`, e);
    errores[cual] = camara.nombre;
    return null;
  }
}

// c2 puede ser { ninguna: true } para trabajar sin cámara de canecas.
async function asignarCamaras(c1, c2) {
  cerrarCamara(app.cam1);
  cerrarCamara(app.cam2);
  app.cam1 = app.cam2 = null;
  app.cam1 = await abrirSegura(c1, 'cam1');
  app.cam2 = c2 && !c2.ninguna ? await abrirSegura(c2, 'cam2') : null;
  detector.previo = null;
  ajustes.camaras.reconocimiento = c1 ? { id: c1.id, nombre: c1.nombre } : null;
  ajustes.camaras.canecas = c2?.ninguna ? { ninguna: true } : c2 ? { id: c2.id, nombre: c2.nombre } : null;
  guardarAjustes();
}

async function iniciarCamaras() {
  const lista = await refrescarCamaras();
  const pref = ajustes.camaras;
  const sugerida = sugerirAsignacion(lista);
  let c1 = resolver(pref.reconocimiento, lista) || sugerida.reconocimiento;
  let c2 = pref.canecas?.ninguna ? null : resolver(pref.canecas, lista);
  if (!pref.canecas) c2 = sugerida.canecas;
  if (c2 && c1 && c2.id === c1.id) c2 = null;
  app.cam1 = await abrirSegura(c1, 'cam1');
  app.cam2 = await abrirSegura(c2, 'cam2');
  // Recordar lo que se usó la primera vez (no se sobreescribe una preferencia que no se encontró).
  if (!pref.reconocimiento && c1) pref.reconocimiento = { id: c1.id, nombre: c1.nombre };
  if (!pref.canecas && c2) pref.canecas = { id: c2.id, nombre: c2.nombre };
  guardarAjustes();
}

// ---------------------------------------------------------------------
// Reconocimiento (cámara 1), unas 9 veces por segundo
// ---------------------------------------------------------------------
async function reconocerUnaVez() {
  if (!extractor || !camaraLista(app.cam1)) return;
  const vec = extractor.vector(app.cam1.video);
  try {
    const clase = panel.abierto ? app.captura.clase : null;
    if (clase) {
      const m = { clase, sesion: ajustes.sesion, vec: new Float32Array(await vec.data()), t: Date.now() };
      app.clasificador.agregar(m);
      app.almacen?.guardar([m]).catch((e) => console.warn('No se guardó la muestra', e));
    }
    const p = await app.clasificador.predecir(vec, ajustes.reconocimiento.k);
    app.ultimaPrediccion = p;
    if (!panel.abierto) exp.nuevaPrediccion(p);
  } finally {
    vec.dispose();
  }
}

async function bucleReconocimiento() {
  for (;;) {
    const t0 = performance.now();
    try {
      await reconocerUnaVez();
    } catch (e) {
      console.error(e);
    }
    const resto = ajustes.reconocimiento.intervaloMs - (performance.now() - t0);
    await new Promise((ok) => setTimeout(ok, Math.max(10, resto)));
  }
}

// ---------------------------------------------------------------------
// Ilustraciones opcionales (si alguien las pone en assets/ilustraciones)
// ---------------------------------------------------------------------
async function cargarIlustraciones() {
  const nombres = ['deteriorado', 'transicion', 'recuperado'];
  const imgs = await Promise.all(
    nombres.map(
      (n) =>
        new Promise((ok) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = () => ok(null);
          i.src = `assets/ilustraciones/${n}.png`;
        }),
    ),
  );
  return imgs.every(Boolean) ? imgs : null;
}

function dibujarIlustraciones(imgs, s) {
  const cubrir = (img, alfa) => {
    if (alfa <= 0) return;
    const k = Math.max(W / img.width, H / img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.globalAlpha = alfa;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.globalAlpha = 1;
  };
  if (s < 0.5) {
    cubrir(imgs[0], 1);
    cubrir(imgs[1], s / 0.5);
  } else {
    cubrir(imgs[1], 1);
    cubrir(imgs[2], (s - 0.5) / 0.5);
  }
}

// ---------------------------------------------------------------------
// Ciclo de dibujo
// ---------------------------------------------------------------------
let tPrevio = performance.now();
let ultimoDetector = 0;
let fps = 60;

function avisos() {
  const l = [];
  if (errorModelo) l.push('No se pudo cargar el modelo · abre la instalación con iniciar.bat');
  else if (!extractor) l.push('Cargando el reconocimiento…');
  if (!app.cam1) l.push(errores.cam1 ? `No se pudo abrir «${errores.cam1}» · pulsa A` : 'Falta la cámara 1 · pulsa A → Cámaras');
  else if (extractor && app.clasificador.clasesConDatos() < 2) l.push('El reconocimiento no tiene datos · pulsa A → Entrenamiento');
  if (!app.cam2 && !ajustes.camaras.canecas?.ninguna) l.push(errores.cam2 ? `No se pudo abrir «${errores.cam2}» · modo guiado` : 'Sin cámara de canecas · modo guiado');
  return l;
}

function infoDepuracion() {
  const p = app.ultimaPrediccion;
  const n = detector.niveles;
  return [
    `fps ${fps.toFixed(0)} · tf ${typeof tf !== 'undefined' ? tf.getBackend() : '-'} · tensores ${typeof tf !== 'undefined' ? tf.memory().numTensors : '-'}`,
    `estado ${exp.estado} · lectura ${exp.ultimaLectura ?? '-'}`,
    p ? `modelo ${p.clase} ${(p.confianza * 100).toFixed(0)}% · parecido ${(p.similitud * 100).toFixed(0)}%` : 'modelo -',
    `muestras ${app.clasificador.total} · clases ${app.clasificador.clasesConDatos()}`,
    `salud ${memoria.salud.toFixed(0)} · visible ${(sVisible * 100).toFixed(0)}`,
    `canecas ${detector.armado ? 'ARMADO' : 'en reposo'} · B ${(n.blanca * 100).toFixed(0)} V ${(n.verde * 100).toFixed(0)} N ${(n.negra * 100).toFixed(0)} · fuera ${(detector.fuera * 100).toFixed(0)}${detector.sacudida ? ' SACUDIDA' : ''}`,
    `cam1 ${app.cam1?.info.nombre ?? '-'}`,
    `cam2 ${app.cam2?.info.nombre ?? '-'}`,
  ];
}

function cuadro(t) {
  requestAnimationFrame(cuadro);
  const dt = Math.min(0.1, (t - tPrevio) / 1000);
  tPrevio = t;
  if (dt > 0) fps += (1 / dt - fps) * 0.05;

  // Cámara 2 a ~15 cuadros por segundo: entre cuadros más separados el movimiento se nota más.
  const hayCamaraCanecas = camaraLista(app.cam2);
  if (hayCamaraCanecas && t - ultimoDetector > 66) {
    ultimoDetector = t;
    const caneca = detector.actualizar(app.cam2.video, t);
    if (caneca) {
      if (panel.abierto) panel.alDetectar(caneca);
      else exp.deposito(caneca);
    }
  }
  if (panel.abierto) panel.cada(t);
  else exp.tick({ hayCamaraCanecas });

  const objetivo = memoria.salud / 100;
  sVisible += (objetivo - sVisible) * (1 - Math.exp(-dt * 1.1));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  if (panel.abierto && !panel.verPaisaje) return;

  ctx.setTransform(dpr * escala, 0, 0, dpr * escala, dpr * ox, dpr * oy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  if (ilustraciones && ajustes.ilustraciones !== false) dibujarIlustraciones(ilustraciones, sVisible);
  else paisaje.dibujar(ctx, sVisible, t);

  if (!panel.abierto) {
    dibujarUI(ctx, {
      exp,
      t,
      s: sVisible,
      hoy: memoria.hoy,
      destello: Math.max(0, Math.min(1, (destelloHasta - t) / 600)),
      hayCamaraCanecas,
      preview: ajustes.vistaPrevia && app.cam1 ? app.cam1.video : null,
      avisos: avisos(),
      depuracion: depurar ? infoDepuracion() : null,
      ayuda: mostrarAyuda,
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// Teclado
// ---------------------------------------------------------------------
function abrirPanel() {
  exp.ir('espera');
  mostrarAyuda = false;
  document.body.classList.add('con-panel');
  panel.abrir();
}

function cerrarPanel() {
  panel.cerrar();
  document.body.classList.remove('con-panel');
  exp.ir('espera');
}

const CANECA_POR_TECLA = { b: 'blanca', v: 'verde', n: 'negra' };

window.addEventListener('keydown', (e) => {
  if (panel.abierto) {
    if (e.key === 'Escape') cerrarPanel();
    else if (panel.teclaAbajo(e)) e.preventDefault();
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'a') abrirPanel();
  else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (k === 'd') depurar = !depurar;
  else if (k === 'h') mostrarAyuda = !mostrarAyuda;
  else if (k === 'escape') mostrarAyuda = false;
  else if (/^[1-6]$/.test(k)) exp.simularResiduo(RESIDUOS[Number(k) - 1].id);
  else if (k === '7') exp.simularResiduo('otro');
  else if (CANECA_POR_TECLA[k]) exp.deposito(CANECA_POR_TECLA[k]);
});
window.addEventListener('keyup', (e) => panel.teclaArriba(e));

// Esconder el puntero cuando nadie lo usa.
let temporizadorPuntero;
window.addEventListener('pointermove', () => {
  document.body.classList.remove('sin-puntero');
  clearTimeout(temporizadorPuntero);
  temporizadorPuntero = setTimeout(() => document.body.classList.add('sin-puntero'), 2500);
});

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
async function iniciar() {
  requestAnimationFrame(cuadro);

  cargarIlustraciones().then((imgs) => {
    ilustraciones = imgs;
    app.hayIlustraciones = !!imgs;
  });

  const camaras = iniciarCamaras().catch((e) => console.warn('Cámaras', e));

  app.almacen = await new Almacen().abrir();
  try {
    app.clasificador.reemplazar(await app.almacen.todas());
  } catch (e) {
    console.warn('No se pudieron leer las muestras', e);
  }

  try {
    if (typeof tf === 'undefined') throw new Error('TensorFlow.js no cargó');
    extractor = await new Extractor().cargar();
    if (extractor.dim !== app.clasificador.dim) {
      const muestras = app.clasificador.muestras.filter((m) => m.vec.length === extractor.dim);
      app.clasificador = new Clasificador(extractor.dim);
      app.clasificador.reemplazar(muestras);
    }
    const r = await importarCarpetaData(app.clasificador, app.almacen);
    if (r && (r.archivos || r.errores.length)) console.info('Carpeta data/', r);
    app.extractorListo = true;
    if (panel.abierto) panel.render();
  } catch (e) {
    console.error(e);
    errorModelo = e;
  }

  await camaras;
  if (panel.abierto) panel.render();
  bucleReconocimiento();
}

iniciar();
