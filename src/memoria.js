// Estado colectivo de la madrevieja: salud, contador del día y registro
// de cada interacción (sirve como evidencia para el documento final).

const CLAVE = 'madrevieja.memoria.v1';
const MAX_REGISTRO = 20000;

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class Memoria {
  constructor(saludInicial) {
    this.saludInicial = saludInicial;
    let datos = null;
    try {
      datos = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    } catch {
      datos = null;
    }
    this.datos = datos || { salud: saludInicial, dia: hoy(), hoy: this.diaVacio(), registro: [] };
    this.revisarDia();
  }

  diaVacio() {
    return { aciertos: 0, errores: 0, dudas: 0, guiados: 0 };
  }

  revisarDia() {
    if (this.datos.dia !== hoy()) {
      this.datos.dia = hoy();
      this.datos.hoy = this.diaVacio();
      this.guardar();
    }
  }

  get salud() {
    return this.datos.salud;
  }

  get hoy() {
    this.revisarDia();
    return this.datos.hoy;
  }

  fijarSalud(v) {
    this.datos.salud = Math.max(0, Math.min(100, v));
    this.guardar();
  }

  // tipo: 'acierto' | 'error' | 'duda' | 'guiado'
  registrar(tipo, { residuo = '', caneca = '', delta = 0 } = {}) {
    this.revisarDia();
    this.datos.salud = Math.max(0, Math.min(100, this.datos.salud + delta));
    const campo = { acierto: 'aciertos', error: 'errores', duda: 'dudas', guiado: 'guiados' }[tipo];
    if (campo) this.datos.hoy[campo]++;
    this.datos.registro.push({ t: new Date().toISOString(), tipo, residuo, caneca, salud: this.datos.salud });
    if (this.datos.registro.length > MAX_REGISTRO) this.datos.registro.splice(0, this.datos.registro.length - MAX_REGISTRO);
    this.guardar();
  }

  reiniciar() {
    this.datos = { salud: this.saludInicial, dia: hoy(), hoy: this.diaVacio(), registro: this.datos.registro };
    this.guardar();
  }

  csv() {
    const filas = [['fecha_hora', 'tipo', 'residuo', 'caneca_donde_cayo', 'salud_despues']];
    for (const r of this.datos.registro) filas.push([r.t, r.tipo, r.residuo, r.caneca, r.salud]);
    return filas.map((f) => f.join(',')).join('\n');
  }

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.datos));
    } catch {
      /* sin almacenamiento */
    }
  }
}
