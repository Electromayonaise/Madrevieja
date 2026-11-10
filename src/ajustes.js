// Ajustes guardados en el navegador, mezclados sobre los valores de config.js.
import { AJUSTES_BASE } from './config.js';

const CLAVE = 'madrevieja.ajustes.v1';

function esObjeto(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function mezclar(base, extra) {
  const out = structuredClone(base);
  if (!esObjeto(extra)) return out;
  for (const [k, v] of Object.entries(extra)) {
    if (esObjeto(v) && esObjeto(out[k])) out[k] = mezclar(out[k], v);
    else out[k] = v;
  }
  return out;
}

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || 'null');
  } catch {
    return null;
  }
}

export const ajustes = mezclar(AJUSTES_BASE, leer());

export function guardarAjustes() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ajustes));
  } catch {
    /* sin almacenamiento: los ajustes duran hasta recargar */
  }
}

export function restaurarAjustes(seccion) {
  ajustes[seccion] = structuredClone(AJUSTES_BASE[seccion]);
  guardarAjustes();
}
