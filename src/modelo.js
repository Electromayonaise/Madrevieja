// Reconocimiento de residuos.
//
// Misma técnica que Teachable Machine: MobileNet v2 (ya entrenado con
// millones de imágenes) convierte cada imagen en 1280 números que
// describen lo que se ve; luego se compara con los ejemplos que
// capturamos (vecinos más cercanos). No se guardan fotos: solo esos números.

/* global tf */

const TAM = 224;
const URL_MODELO = 'vendor/mobilenet/model.json';
export const NOMBRE_MODELO = 'mobilenet_v2_0.35_224';

export class Extractor {
  async cargar() {
    await tf.ready();
    this.modelo = await tf.loadLayersModel(URL_MODELO);
    const salida = this.modelo.outputs[0].shape; // [null, 7, 7, 1280]
    this.dim = salida[salida.length - 1];
    tf.tidy(() => this.modelo.predict(tf.zeros([1, TAM, TAM, 3])));
    return this;
  }

  // Devuelve un tensor [dim] normalizado (longitud 1). Quien llama debe liberarlo.
  vector(fuente) {
    return tf.tidy(() => {
      const img = tf.browser.fromPixels(fuente);
      const [h, w] = img.shape;
      const lado = Math.min(h, w);
      const recorte = img.slice([Math.floor((h - lado) / 2), Math.floor((w - lado) / 2), 0], [lado, lado, 3]);
      const x = tf.image.resizeBilinear(recorte, [TAM, TAM]).toFloat().div(127.5).sub(1).expandDims(0);
      const f = this.modelo.predict(x).mean([1, 2]).squeeze();
      return f.div(f.norm().add(1e-8));
    });
  }
}

export class Clasificador {
  constructor(dim) {
    this.dim = dim;
    this.muestras = []; // { id?, clase, sesion, vec: Float32Array }
    this.matriz = null;
    this.etiquetas = [];
    this.sucio = true;
    this.ultimaConstruccion = 0;
  }

  get total() {
    return this.muestras.length;
  }

  conteo() {
    const c = {};
    for (const m of this.muestras) {
      c[m.clase] ??= { total: 0, sesiones: {} };
      c[m.clase].total++;
      c[m.clase].sesiones[m.sesion] = (c[m.clase].sesiones[m.sesion] || 0) + 1;
    }
    return c;
  }

  sesiones() {
    const s = {};
    for (const m of this.muestras) s[m.sesion] = (s[m.sesion] || 0) + 1;
    return s;
  }

  clasesConDatos() {
    return new Set(this.muestras.map((m) => m.clase)).size;
  }

  agregar(muestra) {
    this.muestras.push(muestra);
    this.sucio = true;
  }

  reemplazar(muestras) {
    this.muestras = muestras;
    this.sucio = true;
  }

  construir() {
    this.matriz?.dispose();
    this.matriz = null;
    const n = this.muestras.length;
    if (n) {
      const plano = new Float32Array(n * this.dim);
      this.muestras.forEach((m, i) => plano.set(m.vec, i * this.dim));
      this.matriz = tf.tensor2d(plano, [n, this.dim]);
    }
    this.etiquetas = this.muestras.map((m) => m.clase);
    this.sucio = false;
    this.ultimaConstruccion = performance.now();
  }

  // vec: tensor [dim] normalizado. Devuelve { clase, confianza, similitud, puntajes } o null.
  async predecir(vec, k) {
    // Mientras se capturan muestras, no reconstruir en cada cuadro.
    if (this.sucio && (!this.matriz || performance.now() - this.ultimaConstruccion > 400)) this.construir();
    if (!this.matriz || this.clasesConDatos() < 2) return null;
    const simsT = tf.tidy(() => this.matriz.matMul(vec.reshape([this.dim, 1])).squeeze([1]));
    const sims = await simsT.data();
    simsT.dispose();
    const etiquetas = this.etiquetas;

    const kk = Math.min(k, sims.length);
    const idx = Array.from(sims.keys());
    idx.sort((a, b) => sims[b] - sims[a]);
    const vecinos = idx.slice(0, kk);

    const puntajes = {};
    const mejorSim = {};
    let suma = 0;
    for (const i of vecinos) {
      const c = etiquetas[i];
      const peso = Math.max(sims[i], 0) + 1e-6;
      puntajes[c] = (puntajes[c] || 0) + peso;
      mejorSim[c] = Math.max(mejorSim[c] ?? -1, sims[i]);
      suma += peso;
    }
    for (const c in puntajes) puntajes[c] /= suma;
    const clase = Object.keys(puntajes).sort((a, b) => puntajes[b] - puntajes[a])[0];
    return { clase, confianza: puntajes[clase], similitud: mejorSim[clase], puntajes };
  }
}

// ---------------------------------------------------------------------
// Almacén de muestras en el navegador (IndexedDB)
// ---------------------------------------------------------------------
const BD = 'madrevieja';
const TABLA = 'muestras';

function abrirBD() {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(BD, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TABLA, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

function transaccion(bd, modo, fn) {
  return new Promise((ok, mal) => {
    const tx = bd.transaction(TABLA, modo);
    const resultado = fn(tx.objectStore(TABLA));
    tx.oncomplete = () => ok(resultado);
    tx.onerror = () => mal(tx.error);
    tx.onabort = () => mal(tx.error);
  });
}

export class Almacen {
  async abrir() {
    try {
      this.bd = await abrirBD();
    } catch (e) {
      console.warn('Sin IndexedDB, las muestras no se guardarán', e);
      this.bd = null;
    }
    return this;
  }

  async todas() {
    if (!this.bd) return [];
    return new Promise((ok, mal) => {
      const req = this.bd.transaction(TABLA).objectStore(TABLA).getAll();
      req.onsuccess = () => ok(req.result);
      req.onerror = () => mal(req.error);
    });
  }

  async guardar(muestras) {
    if (!this.bd || !muestras.length) return;
    await transaccion(this.bd, 'readwrite', (t) => {
      for (const m of muestras) {
        const req = t.add({ clase: m.clase, sesion: m.sesion, vec: m.vec, t: m.t || Date.now() });
        req.onsuccess = () => (m.id = req.result);
      }
    });
  }

  async borrar(ids) {
    if (!this.bd || !ids.length) return;
    await transaccion(this.bd, 'readwrite', (t) => ids.forEach((id) => t.delete(id)));
  }

  async vaciar() {
    if (!this.bd) return;
    await transaccion(this.bd, 'readwrite', (t) => t.clear());
  }
}

// ---------------------------------------------------------------------
// Exportar / importar (archivo JSON para pasar datos entre computadores)
// ---------------------------------------------------------------------
function aBase64(f32) {
  const bytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function deBase64(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

export function exportarDatos(muestras, dim) {
  return JSON.stringify({
    formato: 'madrevieja-datos',
    version: 1,
    modelo: NOMBRE_MODELO,
    dim,
    creado: new Date().toISOString(),
    muestras: muestras.map((m) => ({ c: m.clase, s: m.sesion, t: m.t, v: aBase64(m.vec) })),
  });
}

export function importarDatos(texto, dim) {
  const d = JSON.parse(texto);
  if (d.formato !== 'madrevieja-datos') throw new Error('Este archivo no es de Madrevieja.');
  if (d.dim !== dim || d.modelo !== NOMBRE_MODELO) throw new Error('El archivo es de otra versión del modelo.');
  return d.muestras.map((m) => ({ clase: m.c, sesion: m.s, t: m.t, vec: deBase64(m.v) }));
}

export function firma(m) {
  return aBase64(m.vec.subarray(0, 8));
}
