// Cámara 2: detecta en cuál caneca cayó el residuo.
//
// Compara cada cuadro con el anterior (en baja resolución) y mide qué
// fracción de cada zona cambió. Si también se mueve mucho lo que está
// FUERA de las zonas, es la cámara la que se movió (por ejemplo, alguien
// la sostiene con la mano) y ese cuadro se ignora.

import { ORDEN_CANECAS } from './config.js';

const W = 160;
const H = 120;

export class DetectorCanecas {
  constructor(ajustes) {
    this.ajustes = ajustes; // referencia viva a ajustes.deposito y ajustes.zonas
    this.lienzo = document.createElement('canvas');
    this.lienzo.width = W;
    this.lienzo.height = H;
    this.ctx = this.lienzo.getContext('2d', { willReadFrequently: true });
    this.previo = null;
    this.niveles = { blanca: 0, verde: 0, negra: 0 };
    this.fuera = 0;
    this.sacudida = false;
    this.armado = false;
    this.ventana = null;
    this.mascara = null;
    this.firmaZonas = '';
  }

  armar() {
    this.armado = true;
    this.ventana = null;
  }

  desarmar() {
    this.armado = false;
    this.ventana = null;
  }

  // Cada píxel se asigna a una zona (o a "fuera"). Se recalcula si cambian las zonas.
  prepararMascara() {
    const zonas = this.ajustes.zonas;
    const firma = JSON.stringify(zonas);
    if (firma === this.firmaZonas && this.mascara) return;
    this.firmaZonas = firma;
    this.mascara = new Int8Array(W * H).fill(-1);
    this.tamanos = new Array(ORDEN_CANECAS.length).fill(0);
    ORDEN_CANECAS.forEach((id, zi) => {
      const z = zonas[id];
      const x0 = Math.max(0, Math.floor(z.x * W));
      const y0 = Math.max(0, Math.floor(z.y * H));
      const x1 = Math.min(W, Math.ceil((z.x + z.w) * W));
      const y1 = Math.min(H, Math.ceil((z.y + z.h) * H));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (this.mascara[y * W + x] === -1) {
          this.mascara[y * W + x] = zi;
          this.tamanos[zi]++;
        }
      }
    });
    this.tamanoFuera = this.mascara.reduce((n, v) => n + (v === -1 ? 1 : 0), 0);
  }

  // Llamar en cada cuadro. Devuelve el id de la caneca cuando detecta un depósito.
  actualizar(video, ahora = performance.now()) {
    if (!video || video.readyState < 2) return null;
    this.prepararMascara();
    this.ctx.drawImage(video, 0, 0, W, H);
    const px = this.ctx.getImageData(0, 0, W, H).data;
    const gris = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < gris.length; i += 4, j++) gris[j] = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8;

    const previo = this.previo;
    this.previo = gris;
    if (!previo) return null;

    const { umbralPixel, umbralZona, limiteSacudida, ventanaMs } = this.ajustes.deposito;
    const cambios = new Array(ORDEN_CANECAS.length).fill(0);
    let cambiosFuera = 0;
    for (let j = 0; j < gris.length; j++) {
      if (Math.abs(gris[j] - previo[j]) > umbralPixel) {
        const z = this.mascara[j];
        if (z === -1) cambiosFuera++;
        else cambios[z]++;
      }
    }
    ORDEN_CANECAS.forEach((id, zi) => (this.niveles[id] = this.tamanos[zi] ? cambios[zi] / this.tamanos[zi] : 0));
    this.fuera = this.tamanoFuera ? cambiosFuera / this.tamanoFuera : 0;
    this.sacudida = this.fuera > limiteSacudida;

    if (!this.armado) return null;
    if (this.sacudida) {
      this.ventana = null;
      return null;
    }

    const activa = ORDEN_CANECAS.some((id) => this.niveles[id] > umbralZona);
    if (!this.ventana && activa) {
      this.ventana = { hasta: ahora + ventanaMs, acum: { blanca: 0, verde: 0, negra: 0 } };
    }
    if (this.ventana) {
      for (const id of ORDEN_CANECAS) this.ventana.acum[id] += this.niveles[id];
      if (ahora >= this.ventana.hasta) {
        const acum = this.ventana.acum;
        const ganadora = ORDEN_CANECAS.reduce((a, b) => (acum[b] > acum[a] ? b : a));
        this.desarmar();
        return ganadora;
      }
    }
    return null;
  }
}
