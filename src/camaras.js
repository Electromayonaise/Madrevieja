// Abre las cámaras por su identificador, con respaldo por nombre.

export async function listarCamaras() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  let dispositivos = await navigator.mediaDevices.enumerateDevices();
  const sinNombre = dispositivos.some((d) => d.kind === 'videoinput' && !d.label);
  if (sinNombre) {
    // Los nombres solo aparecen después de dar permiso una vez.
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      s.getTracks().forEach((t) => t.stop());
      dispositivos = await navigator.mediaDevices.enumerateDevices();
    } catch {
      /* sin permiso: seguimos con lo que haya */
    }
  }
  return dispositivos
    .filter((d) => d.kind === 'videoinput')
    .map((d, i) => ({ id: d.deviceId, nombre: d.label || `Cámara ${i + 1}` }));
}

// Si no hay nada configurado, adivina: la webcam USB para reconocer
// y el celular (Iriun, DroidCam…) para las canecas.
export function sugerirAsignacion(lista) {
  const esCelular = (c) => /iriun|droidcam|epoccam|phone|camo|continuity/i.test(c.nombre);
  const celular = lista.find(esCelular);
  const otra = lista.find((c) => !esCelular(c));
  const reconocimiento = otra || lista[0] || null;
  const canecas = celular && celular !== reconocimiento ? celular : lista.find((c) => c !== reconocimiento) || null;
  return { reconocimiento, canecas };
}

export function resolver(pref, lista) {
  if (!pref || pref.ninguna) return null;
  return lista.find((c) => c.id === pref.id) || lista.find((c) => c.nombre === pref.nombre) || null;
}

export async function abrirCamara(camara, { ancho = 640, alto = 480 } = {}) {
  if (!camara) return null;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { deviceId: { exact: camara.id }, width: { ideal: ancho }, height: { ideal: alto } },
  });
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  return { video, stream, info: camara };
}

export function cerrarCamara(cam) {
  cam?.stream?.getTracks().forEach((t) => t.stop());
}

export function camaraLista(cam) {
  return !!cam && cam.video.readyState >= 2 && cam.video.videoWidth > 0;
}
