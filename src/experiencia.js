// Máquina de estados de la interacción con el público.
//
//   espera ──(residuo estable)──▶ guia ──(cae en caneca)──▶ respuesta ──▶ espera
//      └────(duda sostenida)───▶ duda ──(cae en caneca)──▶ respuesta
//
// guia y duda vuelven a espera si nadie bota nada a tiempo.

import { RESIDUOS, TEXTOS } from './config.js';

const POR_ID = Object.fromEntries(RESIDUOS.map((r) => [r.id, r]));

export class Experiencia {
  constructor({ ajustes, memoria, alCambiar = () => {} }) {
    this.ajustes = ajustes;
    this.memoria = memoria;
    this.alCambiar = alCambiar; // (estado, anterior) => void
    this.lecturas = [];
    this.inicioDuda = null;
    this.ir('espera');
  }

  ir(estado, datos = {}) {
    const anterior = this.estado;
    this.estado = estado;
    this.desde = performance.now();
    this.datos = datos;
    this.lecturas = [];
    this.inicioDuda = null;
    this.alCambiar(estado, anterior);
  }

  get tiempoEnEstado() {
    return performance.now() - this.desde;
  }

  // Convierte una predicción del modelo en una lectura: un id de residuo, 'fondo' o 'duda'.
  leer(p) {
    if (!p) return 'fondo';
    const r = this.ajustes.reconocimiento;
    if (p.clase === 'fondo') return 'fondo';
    if (p.clase === 'otro') return 'otro';
    if (p.confianza >= r.confianzaMin && p.similitud >= r.similitudMin) return p.clase;
    return 'duda';
  }

  // Lectura estable de la ventana reciente, o null si no hay consenso.
  estable() {
    const r = this.ajustes.reconocimiento;
    if (this.lecturas.length < r.ventana) return null;
    const cuenta = {};
    for (const l of this.lecturas) cuenta[l] = (cuenta[l] || 0) + 1;
    const [mejor, n] = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
    return n / this.lecturas.length >= r.mayoria ? mejor : null;
  }

  nuevaPrediccion(p) {
    const r = this.ajustes.reconocimiento;
    const lectura = this.leer(p);
    this.ultimaLectura = lectura;
    this.lecturas.push(lectura);
    if (this.lecturas.length > r.ventana) this.lecturas.shift();

    if (this.estado === 'espera') {
      if (this.tiempoEnEstado < this.ajustes.tiempos.enfriamientoMs) return;
      const e = this.estable();
      if (e && POR_ID[e]) return this.mostrarGuia(e);
      // Algo hay frente a la cámara, pero no sabemos qué.
      const n = this.lecturas.length;
      const noFondo = this.lecturas.filter((l) => l !== 'fondo').length;
      const hayAlgo = n >= r.ventana && noFondo / n >= r.mayoria;
      if (hayAlgo) {
        this.inicioDuda ??= performance.now();
        if (performance.now() - this.inicioDuda > r.tiempoDudaMs) {
          const otros = this.lecturas.filter((l) => l === 'otro').length;
          this.ir('duda', { otro: otros > n / 2 });
        }
      } else if (noFondo / Math.max(n, 1) < 0.5) {
        this.inicioDuda = null;
      }
    } else if (this.estado === 'guia') {
      // Si muestra otro residuo, cambiamos la indicación.
      const e = this.estable();
      if (e && POR_ID[e] && e !== this.datos.residuo.id) this.mostrarGuia(e);
    }
  }

  mostrarGuia(id) {
    this.ir('guia', { residuo: POR_ID[id] });
  }

  // Simulación con teclado
  simularResiduo(id) {
    if (this.estado === 'respuesta') return;
    if (id === 'otro') this.ir('duda', { otro: true });
    else if (POR_ID[id]) this.mostrarGuia(id);
  }

  deposito(caneca) {
    const p = this.ajustes.paisaje;
    if (this.estado === 'guia') {
      const residuo = this.datos.residuo;
      const correcto = caneca === residuo.caneca;
      this.memoria.registrar(correcto ? 'acierto' : 'error', {
        residuo: residuo.id,
        caneca,
        delta: correcto ? p.acierto : -p.error,
      });
      const efecto = TEXTOS.efectosAcierto[Math.floor(Math.random() * TEXTOS.efectosAcierto.length)];
      this.ir('respuesta', { tipo: correcto ? 'acierto' : 'error', residuo, caneca, efecto });
    } else if (this.estado === 'duda') {
      this.memoria.registrar('duda', { caneca });
      this.ir('respuesta', { tipo: 'duda', caneca });
    }
  }

  // Llamar en cada cuadro.
  tick({ hayCamaraCanecas }) {
    const t = this.ajustes.tiempos;
    const espera = this.ajustes.deposito.esperaMs;
    if (this.estado === 'guia') {
      if (!hayCamaraCanecas && this.tiempoEnEstado > t.guiaSinCamaraMs) {
        // Plan B: sin cámara 2, el paisaje responde al reconocimiento.
        const residuo = this.datos.residuo;
        this.memoria.registrar('guiado', { residuo: residuo.id, delta: this.ajustes.paisaje.guiado });
        this.ir('respuesta', { tipo: 'guiado', residuo });
      } else if (this.tiempoEnEstado > espera) {
        this.ir('espera');
      }
    } else if (this.estado === 'duda') {
      if (this.tiempoEnEstado > (hayCamaraCanecas ? espera : t.guiaSinCamaraMs)) this.ir('espera');
    } else if (this.estado === 'respuesta') {
      if (this.tiempoEnEstado > t.respuestaMs) this.ir('espera');
    }
  }

  // 0..1 del tiempo restante para depositar (para la barra de la tarjeta)
  restante({ hayCamaraCanecas }) {
    const total = hayCamaraCanecas ? this.ajustes.deposito.esperaMs : this.ajustes.tiempos.guiaSinCamaraMs;
    return Math.max(0, 1 - this.tiempoEnEstado / total);
  }
}
