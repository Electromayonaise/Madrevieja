// Panel de control para quien opera la instalación (tecla A).
// Mientras está abierto, la experiencia del público queda en pausa.

import { CANECAS, ORDEN_CANECAS, RESIDUOS, CLASES_EXTRA, AJUSTES_BASE } from './config.js';
import { exportarDatos, importarDatos, firma } from './modelo.js';

// Teclas para capturar: 1–6 residuos, 7 otro objeto, 8 fondo vacío.
const CLASES = [
  ...RESIDUOS.map((r, i) => ({ id: r.id, nombre: r.nombre, caneca: r.caneca, tecla: String(i + 1) })),
  { ...CLASES_EXTRA.find((c) => c.id === 'otro'), tecla: '7' },
  { ...CLASES_EXTRA.find((c) => c.id === 'fondo'), tecla: '8' },
];
const META_POR_SESION = 120;

const PESTANAS = [
  ['camaras', 'Cámaras'],
  ['entrenamiento', 'Entrenamiento'],
  ['canecas', 'Canecas'],
  ['ajustes', 'Ajustes'],
  ['registro', 'Registro'],
];

function el(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) e.append(h instanceof Node ? h : String(h));
  return e;
}

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const fecha = () => new Date().toISOString().slice(0, 10);
const pct = (v) => `${Math.round(v * 100)} %`;
const seg = (v) => `${(v / 1000).toFixed(1)} s`;

export class Panel {
  constructor(app) {
    this.app = app;
    this.abierto = false;
    this.pestana = 'entrenamiento';
    this.raiz = document.getElementById('panel');
    this.ultimoRefresco = 0;
    this.teclaCaptura = null;
    this.arrastre = null;
  }

  abrir(pestana) {
    if (pestana) this.pestana = pestana;
    this.abierto = true;
    this.raiz.hidden = false;
    this.render();
  }

  cerrar() {
    this.abierto = false;
    this.raiz.hidden = true;
    this.app.captura.clase = null;
    this.app.detector.desarmar();
  }

  // ------------------------------------------------------------------
  render() {
    const app = this.app;
    this.vivos = {}; // nodos que se actualizan en cada cuadro
    const contenido = {
      camaras: () => this.vistaCamaras(),
      entrenamiento: () => this.vistaEntrenamiento(),
      canecas: () => this.vistaCanecas(),
      ajustes: () => this.vistaAjustes(),
      registro: () => this.vistaRegistro(),
    }[this.pestana]();
    this.raiz.replaceChildren(
      el(
        'div',
        { class: 'panel-caja' },
        el(
          'header',
          {},
          el('h1', {}, 'Madrevieja · panel'),
          el(
            'nav',
            {},
            PESTANAS.map(([id, nombre]) =>
              el('button', { class: id === this.pestana ? 'activa' : '', onclick: () => ((this.pestana = id), this.render()) }, nombre),
            ),
          ),
          el('button', { class: 'cerrar', onclick: () => app.cerrarPanel() }, 'Cerrar (Esc)'),
        ),
        el('main', {}, contenido),
      ),
    );
  }

  // ------------------------------------------------------------------
  // Cámaras
  // ------------------------------------------------------------------
  vistaCamaras() {
    const app = this.app;
    const lista = app.camaras;
    const actual1 = app.cam1?.info?.id;
    const actual2 = app.cam2?.info?.id;
    const sel1 = el('select', {}, lista.map((c) => el('option', { value: c.id, selected: c.id === actual1 }, c.nombre)));
    const sel2 = el(
      'select',
      {},
      el('option', { value: '', selected: !actual2 }, 'Ninguna (modo guiado, sin detectar depósitos)'),
      lista.map((c) => el('option', { value: c.id, selected: c.id === actual2 }, c.nombre)),
    );
    const estado = el('p', { class: 'nota' });
    const aplicar = async () => {
      estado.textContent = 'Abriendo cámaras…';
      const c1 = lista.find((c) => c.id === sel1.value) || null;
      const c2 = lista.find((c) => c.id === sel2.value) || null;
      if (c1 && c2 && c1.id === c2.id) {
        estado.textContent = 'Las dos cámaras no pueden ser la misma.';
        return;
      }
      try {
        await app.asignarCamaras(c1, c2 ? c2 : { ninguna: true });
        this.render();
      } catch (e) {
        estado.textContent = `No se pudo abrir: ${e.message}`;
      }
    };
    this.vivos.prev1 = el('canvas', { width: 320, height: 240, class: 'vista' });
    this.vivos.prev2 = el('canvas', { width: 320, height: 240, class: 'vista' });
    return el(
      'section',
      {},
      el('h2', {}, 'Cámaras'),
      lista.length ? null : el('p', { class: 'alerta' }, 'No se encontró ninguna cámara. Revisa los permisos del navegador.'),
      el(
        'div',
        { class: 'dos' },
        el('div', {}, el('label', {}, 'Cámara 1 · reconoce el residuo (webcam Logitech)'), sel1, this.vivos.prev1),
        el('div', {}, el('label', {}, 'Cámara 2 · mira las canecas (celular con Iriun)'), sel2, this.vivos.prev2),
      ),
      el(
        'div',
        { class: 'fila' },
        el('button', { class: 'primario', onclick: aplicar }, 'Usar estas cámaras'),
        el('button', { onclick: async () => (await app.refrescarCamaras(), this.render()) }, 'Volver a buscar cámaras'),
      ),
      estado,
      el(
        'ul',
        { class: 'consejos' },
        el('li', {}, 'Iriun: abre la app en el celular y en el computador antes de abrir esta página. Si no aparece, pulsa «Volver a buscar».'),
        el('li', {}, 'Mejor conectar el celular por cable USB que por wifi: el wifi de la universidad puede cortarse.'),
        el('li', {}, 'La elección se recuerda. En otro computador se busca la cámara por su nombre.'),
      ),
    );
  }

  // ------------------------------------------------------------------
  // Entrenamiento
  // ------------------------------------------------------------------
  vistaEntrenamiento() {
    const app = this.app;
    const conteo = app.clasificador.conteo();
    const sesion = app.ajustes.sesion;
    const sesiones = app.clasificador.sesiones();

    const campoSesion = el('input', {
      value: sesion,
      placeholder: 'casa, icesi…',
      onchange: (e) => {
        app.ajustes.sesion = e.target.value.trim() || 'sin-nombre';
        app.guardarAjustes();
        this.render();
      },
    });

    this.vivos.prev1 = el('canvas', { width: 480, height: 360, class: 'vista grande' });
    this.vivos.prediccion = el('div', { class: 'prediccion' });
    this.vivos.conteos = {};

    const filas = CLASES.map((c) => {
      const datos = conteo[c.id] || { total: 0, sesiones: {} };
      const enSesion = datos.sesiones[sesion] || 0;
      const nTotal = el('b', {}, datos.total);
      const nSesion = el('span', {}, `${enSesion} en «${sesion}»`);
      this.vivos.conteos[c.id] = { nTotal, nSesion, fila: null };
      const boton = el('button', { class: 'capturar' }, 'Mantén para capturar');
      const empezar = (e) => {
        e.preventDefault();
        boton.setPointerCapture?.(e.pointerId);
        app.captura.clase = c.id;
      };
      const parar = () => {
        if (app.captura.clase === c.id) app.captura.clase = null;
      };
      boton.addEventListener('pointerdown', empezar);
      boton.addEventListener('pointerup', parar);
      boton.addEventListener('pointercancel', parar);
      boton.addEventListener('lostpointercapture', parar);
      const chip = c.caneca
        ? el('span', { class: `chip ${c.caneca}` }, CANECAS[c.caneca].nombre)
        : el('span', { class: 'chip neutro' }, c.id === 'fondo' ? 'nada' : 'no sé');
      const fila = el(
        'tr',
        { 'data-clase': c.id },
        el('td', {}, el('kbd', {}, c.tecla)),
        el('td', {}, c.nombre, c.ayuda ? el('small', {}, c.ayuda) : null),
        el('td', {}, chip),
        el('td', { class: 'num' }, nTotal, el('small', {}, nSesion)),
        el('td', {}, boton),
        el('td', {}, el('button', { class: 'enlace', onclick: () => this.borrarDonde((m) => m.clase === c.id, `todas las muestras de «${c.nombre}»`) }, 'borrar')),
      );
      this.vivos.conteos[c.id].fila = fila;
      return fila;
    });

    const archivo = el('input', { type: 'file', accept: '.json,application/json', multiple: true, hidden: true, onchange: (e) => this.importar(e.target.files) });
    this.vivos.mensaje = el('p', { class: 'nota' });

    const selSesion = el(
      'select',
      {},
      Object.entries(sesiones).map(([s, n]) => el('option', { value: s }, `${s} (${n})`)),
    );

    return el(
      'section',
      {},
      el('h2', {}, 'Entrenamiento'),
      app.extractorListo ? null : el('p', { class: 'alerta' }, 'El modelo todavía está cargando…'),
      el(
        'div',
        { class: 'dos entrenamiento' },
        el(
          'div',
          {},
          el('label', {}, 'Sesión (dónde se están capturando)'),
          campoSesion,
          this.vivos.prev1,
          el('label', {}, 'Lo que ve el modelo ahora'),
          this.vivos.prediccion,
        ),
        el(
          'div',
          {},
          el('table', { class: 'clases' }, el('tbody', {}, filas)),
          el(
            'p',
            { class: 'nota' },
            `Mantén presionado el botón (o la tecla del número) mientras mueves el objeto frente a la cámara. Meta: unas ${META_POR_SESION} muestras por clase en cada lugar.`,
          ),
        ),
      ),
      el(
        'div',
        { class: 'fila' },
        el('button', { class: 'primario', onclick: () => this.exportar(null) }, 'Exportar todo'),
        el('button', { onclick: () => this.exportar(sesion) }, `Exportar solo «${sesion}»`),
        el('button', { onclick: () => archivo.click() }, 'Importar archivo(s)…'),
        archivo,
        el('span', { class: 'separador' }),
        selSesion,
        el('button', { onclick: () => selSesion.value && this.borrarDonde((m) => m.sesion === selSesion.value, `la sesión «${selSesion.value}»`) }, 'Borrar sesión'),
        el('button', { class: 'peligro', onclick: () => this.borrarDonde(() => true, 'TODAS las muestras') }, 'Borrar todo'),
      ),
      this.vivos.mensaje,
      el(
        'ul',
        { class: 'consejos' },
        el('li', {}, 'Captura en el lugar real y con la luz real: la sesión del sitio vale más que la de la casa.'),
        el('li', {}, 'Varía todo: distancia, ángulo, mano, objeto lleno o vacío, aplastado, varias marcas.'),
        el('li', {}, '«Fondo vacío»: la mesa sin nada y gente pasando detrás. «Otro objeto»: celulares, llaves, manos vacías.'),
        el('li', {}, 'Si confunde dos clases, captura más de las dos, justo en las posiciones donde se confunde.'),
        el('li', {}, 'Se guardan números, no fotos. El archivo exportado se puede pasar por WhatsApp o correo.'),
      ),
    );
  }

  async exportar(sesion) {
    const app = this.app;
    const muestras = sesion ? app.clasificador.muestras.filter((m) => m.sesion === sesion) : app.clasificador.muestras;
    if (!muestras.length) return (this.vivos.mensaje.textContent = 'No hay muestras para exportar.');
    descargar(`madrevieja-datos-${sesion || 'todo'}-${fecha()}.json`, exportarDatos(muestras, app.clasificador.dim), 'application/json');
    this.vivos.mensaje.textContent = `Exportadas ${muestras.length} muestras.`;
  }

  async importar(archivos) {
    const app = this.app;
    const vistas = new Set(app.clasificador.muestras.map(firma));
    let nuevas = 0;
    let repetidas = 0;
    const errores = [];
    for (const f of archivos) {
      try {
        const muestras = importarDatos(await f.text(), app.clasificador.dim);
        const agregar = [];
        for (const m of muestras) {
          const k = firma(m);
          if (vistas.has(k)) {
            repetidas++;
            continue;
          }
          vistas.add(k);
          agregar.push(m);
        }
        await app.almacen.guardar(agregar);
        agregar.forEach((m) => app.clasificador.agregar(m));
        nuevas += agregar.length;
      } catch (e) {
        errores.push(`${f.name}: ${e.message}`);
      }
    }
    this.render();
    this.vivos.mensaje.textContent =
      `Se añadieron ${nuevas} muestras` + (repetidas ? ` (${repetidas} ya estaban)` : '') + '.' + (errores.length ? ` Errores: ${errores.join(' · ')}` : '');
  }

  async borrarDonde(condicion, descripcion) {
    const app = this.app;
    const borrar = app.clasificador.muestras.filter(condicion);
    if (!borrar.length) return;
    if (!confirm(`¿Borrar ${descripcion}? (${borrar.length} muestras)\nSi no las exportaste antes, se pierden.`)) return;
    const quedan = app.clasificador.muestras.filter((m) => !condicion(m));
    if (!quedan.length) await app.almacen.vaciar();
    else await app.almacen.borrar(borrar.map((m) => m.id).filter((id) => id !== undefined));
    app.clasificador.reemplazar(quedan);
    this.render();
  }

  // ------------------------------------------------------------------
  // Canecas (cámara 2)
  // ------------------------------------------------------------------
  vistaCanecas() {
    const app = this.app;
    const d = app.ajustes.deposito;
    const lienzo = el('canvas', { width: 640, height: 480, class: 'vista zonas' });
    this.vivos.zonas = lienzo;
    this.prepararArrastre(lienzo);
    this.vivos.niveles = el('div', { class: 'niveles' });
    this.vivos.deteccion = el('p', { class: 'deteccion' }, 'Pulsa «Probar» y bota algo en una caneca.');
    const probar = () => {
      app.detector.armar();
      this.vivos.deteccion.textContent = 'Esperando que caiga algo…';
      this.vivos.deteccion.className = 'deteccion esperando';
    };
    return el(
      'section',
      {},
      el('h2', {}, 'Canecas'),
      app.cam2 ? null : el('p', { class: 'alerta' }, 'No hay cámara 2. La instalación funciona en modo guiado (sin saber dónde cayó). Elige una en «Cámaras».'),
      el(
        'div',
        { class: 'dos' },
        el(
          'div',
          {},
          lienzo,
          el('p', { class: 'nota' }, 'Arrastra cada rectángulo sobre la boca de su caneca. La esquina de abajo a la derecha cambia el tamaño.'),
        ),
        el(
          'div',
          {},
          el('label', {}, 'Movimiento en cada zona'),
          this.vivos.niveles,
          el('div', { class: 'fila' }, el('button', { class: 'primario', onclick: probar }, 'Probar'), el('button', { onclick: () => this.restaurar('zonas') }, 'Zonas por defecto')),
          this.vivos.deteccion,
          this.deslizador(d, 'umbralZona', 0.01, 0.3, 0.005, 'Sensibilidad de la zona', 'Más bajo = detecta objetos más pequeños, pero también falsas alarmas.', pct),
          this.deslizador(d, 'umbralPixel', 6, 80, 1, 'Cambio de luz que cuenta como movimiento', 'Súbelo si la luz parpadea o hay mucho ruido.'),
          this.deslizador(d, 'limiteSacudida', 0.05, 0.6, 0.01, 'Tolerancia a que se mueva la cámara', 'Si alguien sostiene el celular, el movimiento de fuera de las zonas anula la detección por encima de este valor.', pct),
          this.deslizador(d, 'ventanaMs', 150, 1500, 50, 'Tiempo para decidir', 'Se suma el movimiento durante este tiempo y gana la zona con más.', seg),
          el('button', { onclick: () => this.restaurar('deposito') }, 'Restaurar valores de detección'),
        ),
      ),
      el(
        'ul',
        { class: 'consejos' },
        el('li', {}, 'Lo ideal es fijar el celular (cinta, pinza o un soporte de cuello flexible) mirando las tres bocas desde arriba.'),
        el('li', {}, 'Si alguien lo sostiene, que apoye los codos y no lo mueva: las sacudidas se ignoran, pero si se mueve justo cuando cae el residuo, no se cuenta.'),
        el('li', {}, 'Las zonas son solo las bocas de las canecas, no la gente alrededor.'),
      ),
    );
  }

  prepararArrastre(lienzo) {
    const app = this.app;
    const punto = (e) => {
      const r = lienzo.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    lienzo.addEventListener('pointerdown', (e) => {
      const [x, y] = punto(e);
      const zonas = app.ajustes.zonas;
      for (const id of [...ORDEN_CANECAS].reverse()) {
        const z = zonas[id];
        const esquina = Math.abs(x - (z.x + z.w)) < 0.035 && Math.abs(y - (z.y + z.h)) < 0.045;
        const dentro = x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h;
        if (esquina || dentro) {
          this.arrastre = { id, modo: esquina ? 'tamano' : 'mover', x, y, z0: { ...z } };
          lienzo.setPointerCapture(e.pointerId);
          return;
        }
      }
    });
    lienzo.addEventListener('pointermove', (e) => {
      const a = this.arrastre;
      if (!a) return;
      const [x, y] = punto(e);
      const z = app.ajustes.zonas[a.id];
      const dx = x - a.x;
      const dy = y - a.y;
      if (a.modo === 'mover') {
        z.x = Math.min(1 - z.w, Math.max(0, a.z0.x + dx));
        z.y = Math.min(1 - z.h, Math.max(0, a.z0.y + dy));
      } else {
        z.w = Math.min(1 - z.x, Math.max(0.04, a.z0.w + dx));
        z.h = Math.min(1 - z.y, Math.max(0.04, a.z0.h + dy));
      }
    });
    const soltar = () => {
      if (this.arrastre) app.guardarAjustes();
      this.arrastre = null;
    };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
  }

  alDetectar(caneca) {
    if (!this.vivos?.deteccion) return;
    this.vivos.deteccion.textContent = `Detectado: cayó en la ${CANECAS[caneca].nombre}`;
    this.vivos.deteccion.className = `deteccion ${caneca}`;
  }

  // ------------------------------------------------------------------
  // Ajustes
  // ------------------------------------------------------------------
  vistaAjustes() {
    const app = this.app;
    const a = app.ajustes;
    const r = a.reconocimiento;
    const salud = { valor: app.memoria.salud };
    return el(
      'section',
      {},
      el('h2', {}, 'Ajustes'),
      el(
        'div',
        { class: 'tres' },
        el(
          'div',
          {},
          el('h3', {}, 'Reconocimiento'),
          this.deslizador(r, 'confianzaMin', 0.4, 0.98, 0.01, 'Seguridad mínima', 'Proporción de votos para dar una respuesta. Más alto = dice «No estoy seguro» más seguido.', pct),
          this.deslizador(r, 'similitudMin', 0.3, 0.9, 0.01, 'Parecido mínimo', 'Qué tanto debe parecerse a lo aprendido. Más alto = más dudas con objetos nuevos.', pct),
          this.deslizador(r, 'ventana', 3, 20, 1, 'Lecturas seguidas', 'Cuántas lecturas se miran antes de decidir (≈ 9 por segundo).'),
          this.deslizador(r, 'mayoria', 0.5, 1, 0.01, 'Acuerdo entre lecturas', '', pct),
          this.deslizador(r, 'tiempoDudaMs', 500, 5000, 100, 'Tiempo antes de preguntar', 'Si ve algo pero no sabe qué es, espera esto antes de decir «No estoy seguro».', seg),
          this.deslizador(r, 'k', 1, 15, 1, 'Vecinos que votan', ''),
          el('button', { onclick: () => this.restaurar('reconocimiento') }, 'Restaurar'),
        ),
        el(
          'div',
          {},
          el('h3', {}, 'Tiempos'),
          this.deslizador(a.deposito, 'esperaMs', 5000, 30000, 500, 'Espera para depositar', 'Tiempo que se muestra la guía esperando que caiga el residuo.', seg),
          this.deslizador(a.tiempos, 'respuestaMs', 3000, 15000, 250, 'Duración de la respuesta', '', seg),
          this.deslizador(a.tiempos, 'enfriamientoMs', 0, 5000, 100, 'Pausa entre personas', '', seg),
          this.deslizador(a.tiempos, 'guiaSinCamaraMs', 3000, 15000, 250, 'Guía sin cámara 2', 'En modo guiado, tiempo de la guía antes de dar las gracias.', seg),
          el('button', { onclick: () => (this.restaurar('tiempos', false), this.restaurar('deposito')) }, 'Restaurar'),
        ),
        el(
          'div',
          {},
          el('h3', {}, 'Paisaje'),
          this.deslizador(salud, 'valor', 0, 100, 1, 'Estado actual de la madrevieja', '0 = deteriorada, 100 = recuperada. Mueve para ver cómo cambia.', (v) => Math.round(v), (v) => app.memoria.fijarSalud(v)),
          this.deslizador(a.paisaje, 'acierto', 0, 12, 1, 'Mejora por acierto', ''),
          this.deslizador(a.paisaje, 'error', 0, 15, 1, 'Retroceso por error', ''),
          this.deslizador(a.paisaje, 'guiado', 0, 8, 1, 'Mejora en modo guiado', ''),
          this.deslizador(a.paisaje, 'saludInicial', 0, 100, 1, 'Estado al reiniciar', ''),
          el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: a.vistaPrevia, onchange: (e) => ((a.vistaPrevia = e.target.checked), app.guardarAjustes()) }), 'Mostrar la cámara 1 en pantalla'),
          app.hayIlustraciones
            ? el(
                'label',
                { class: 'check' },
                el('input', { type: 'checkbox', checked: a.ilustraciones !== false, onchange: (e) => ((a.ilustraciones = e.target.checked), app.guardarAjustes()) }),
                'Usar las ilustraciones de assets/ilustraciones',
              )
            : el('p', { class: 'nota' }, 'Si se ponen ilustraciones en assets/ilustraciones (deteriorado.png, transicion.png, recuperado.png), aparece aquí la opción de usarlas.'),
          el('button', { onclick: () => this.restaurar('paisaje') }, 'Restaurar'),
        ),
      ),
    );
  }

  deslizador(obj, clave, min, max, paso, etiqueta, ayuda = '', formato = (v) => v, alCambiar = null) {
    const salida = el('output', {}, formato(obj[clave]));
    const input = el('input', {
      type: 'range',
      min,
      max,
      step: paso,
      value: obj[clave],
      oninput: (e) => {
        obj[clave] = Number(e.target.value);
        salida.textContent = formato(obj[clave]);
        if (alCambiar) alCambiar(obj[clave]);
        else this.app.guardarAjustes();
      },
    });
    return el('div', { class: 'deslizador' }, el('label', {}, etiqueta, salida), input, ayuda ? el('small', {}, ayuda) : null);
  }

  restaurar(seccion, volverAPintar = true) {
    const base = structuredClone(AJUSTES_BASE[seccion]);
    // Se copia dentro del mismo objeto: otros módulos guardan referencias a él.
    for (const k of Object.keys(base)) this.app.ajustes[seccion][k] = base[k];
    this.app.guardarAjustes();
    if (volverAPintar) this.render();
  }

  // ------------------------------------------------------------------
  // Registro
  // ------------------------------------------------------------------
  vistaRegistro() {
    const app = this.app;
    const m = app.memoria;
    const h = m.hoy;
    const total = m.datos.registro.length;
    return el(
      'section',
      {},
      el('h2', {}, 'Registro'),
      el(
        'div',
        { class: 'cifras' },
        [
          ['Aciertos hoy', h.aciertos],
          ['Errores hoy', h.errores],
          ['Dudas hoy', h.dudas],
          ['Modo guiado hoy', h.guiados],
          ['Estado', `${Math.round(m.salud)} / 100`],
          ['Interacciones guardadas', total],
        ].map(([k, v]) => el('div', {}, el('b', {}, v), el('span', {}, k))),
      ),
      el('p', { class: 'nota' }, 'Cada interacción queda registrada (hora, residuo, caneca y si acertó), sin imágenes. Sirve como evidencia para el documento final.'),
      el(
        'div',
        { class: 'fila' },
        el('button', { class: 'primario', onclick: () => descargar(`madrevieja-registro-${fecha()}.csv`, m.csv(), 'text/csv') }, 'Descargar registro (CSV)'),
        el(
          'button',
          {
            class: 'peligro',
            onclick: () => {
              if (!confirm('¿Reiniciar la madrevieja al estado inicial y poner en cero el contador de hoy? El registro se conserva.')) return;
              m.saludInicial = app.ajustes.paisaje.saludInicial;
              m.reiniciar();
              this.render();
            },
          },
          'Reiniciar madrevieja',
        ),
      ),
    );
  }

  // ------------------------------------------------------------------
  // Teclado (capturar manteniendo el número)
  // ------------------------------------------------------------------
  teclaAbajo(e) {
    if (this.pestana !== 'entrenamiento' || e.repeat) return false;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return false;
    const c = CLASES.find((x) => x.tecla === e.key);
    if (!c) return false;
    this.teclaCaptura = e.key;
    this.app.captura.clase = c.id;
    return true;
  }

  teclaArriba(e) {
    if (e.key === this.teclaCaptura) {
      this.teclaCaptura = null;
      this.app.captura.clase = null;
    }
  }

  // ------------------------------------------------------------------
  // En cada cuadro, mientras el panel está abierto
  // ------------------------------------------------------------------
  cada(ahora) {
    const app = this.app;
    const v = this.vivos || {};
    const pintarVideo = (lienzo, cam, espejo) => {
      if (!lienzo) return;
      const ctx = lienzo.getContext('2d');
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      if (!cam || cam.video.readyState < 2) {
        ctx.fillStyle = '#888';
        ctx.font = '16px sans-serif';
        ctx.fillText('sin imagen', 16, 28);
        return;
      }
      ctx.save();
      if (espejo) {
        ctx.translate(lienzo.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(cam.video, 0, 0, lienzo.width, lienzo.height);
      ctx.restore();
    };
    pintarVideo(v.prev1, app.cam1, true);
    pintarVideo(v.prev2, app.cam2, false);

    if (v.zonas) {
      pintarVideo(v.zonas, app.cam2, false);
      const ctx = v.zonas.getContext('2d');
      const { width: w, height: h } = v.zonas;
      for (const id of ORDEN_CANECAS) {
        const z = app.ajustes.zonas[id];
        const nivel = app.detector.niveles[id] || 0;
        const activa = nivel > app.ajustes.deposito.umbralZona;
        ctx.fillStyle = activa ? 'rgba(242,193,78,0.35)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(z.x * w, z.y * h, z.w * w, z.h * h);
        ctx.lineWidth = 3;
        ctx.strokeStyle = id === 'blanca' ? '#ffffff' : id === 'verde' ? '#4fcf5f' : '#ff9a3c';
        ctx.strokeRect(z.x * w, z.y * h, z.w * w, z.h * h);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect((z.x + z.w) * w - 12, (z.y + z.h) * h - 12, 12, 12);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(CANECAS[id].nombre, z.x * w + 8, z.y * h + 24);
      }
      if (app.detector.sacudida) {
        ctx.fillStyle = 'rgba(255,100,80,0.85)';
        ctx.fillRect(0, h - 34, w, 34);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('La cámara se está moviendo: se ignora', 12, h - 11);
      }
    }

    if (ahora - this.ultimoRefresco < 150) return;
    this.ultimoRefresco = ahora;

    if (v.niveles) {
      const u = app.ajustes.deposito.umbralZona;
      v.niveles.replaceChildren(
        ...ORDEN_CANECAS.map((id) => {
          const n = app.detector.niveles[id] || 0;
          return el(
            'div',
            { class: 'nivel' },
            el('span', {}, CANECAS[id].nombre),
            el('i', {}, el('em', { style: `width:${Math.min(100, n * 300)}%`, class: n > u ? 'activo' : '' }), el('u', { style: `left:${Math.min(100, u * 300)}%` })),
          );
        }),
        el(
          'div',
          { class: 'nivel' },
          el('span', {}, 'fuera'),
          el('i', {}, el('em', { style: `width:${Math.min(100, app.detector.fuera * 100)}%`, class: app.detector.sacudida ? 'sacudida' : '' }), el('u', { style: `left:${Math.min(100, app.ajustes.deposito.limiteSacudida * 100)}%` })),
        ),
      );
    }

    if (v.prediccion) {
      const p = app.ultimaPrediccion;
      const nombre = (id) => CLASES.find((c) => c.id === id)?.nombre || id;
      if (!p) {
        v.prediccion.replaceChildren(el('p', { class: 'nota' }, app.clasificador.clasesConDatos() < 2 ? 'Captura al menos dos clases para empezar a reconocer.' : '…'));
      } else {
        const top = Object.entries(p.puntajes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        const lectura = app.leer(p);
        v.prediccion.replaceChildren(
          ...top.map(([id, val]) => el('div', { class: 'barra' }, el('span', {}, nombre(id)), el('i', {}, el('em', { style: `width:${val * 100}%` })), el('b', {}, pct(val)))),
          el(
            'p',
            { class: 'nota' },
            `Parecido con lo aprendido: ${pct(p.similitud)} · En pantalla diría: `,
            el('b', {}, lectura === 'duda' ? 'No estoy seguro' : lectura === 'fondo' ? '(nada)' : nombre(lectura)),
          ),
        );
      }
    }

    if (v.conteos) {
      const conteo = app.clasificador.conteo();
      const sesion = app.ajustes.sesion;
      for (const [id, nodos] of Object.entries(v.conteos)) {
        const d = conteo[id] || { total: 0, sesiones: {} };
        const ns = d.sesiones[sesion] || 0;
        nodos.nTotal.textContent = d.total;
        nodos.nSesion.textContent = `${ns} en «${sesion}»`;
        nodos.fila.classList.toggle('capturando', app.captura.clase === id);
        nodos.fila.dataset.nivel = ns >= META_POR_SESION ? 'bien' : ns >= META_POR_SESION / 3 ? 'medio' : 'poco';
      }
    }
  }
}
