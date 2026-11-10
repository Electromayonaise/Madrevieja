// =====================================================================
//  Madrevieja · contenido y valores por defecto
//  Todo el texto que ve el público está en este archivo.
//  Para cambiar un mensaje, edítalo aquí y recarga la página.
// =====================================================================

export const ANCHO = 1920;
export const ALTO = 1080;

// ---------------------------------------------------------------------
// Las tres canecas (Resolución 2184 de 2019)
// ---------------------------------------------------------------------
export const CANECAS = {
  blanca: {
    nombre: 'BLANCA',
    fondo: '#f6f3ec',
    tinta: '#1f2a24',
    borde: '#cfc8b8',
    tipo: 'aprovechables',
    regla: 'Plástico, vidrio, metal, papel y cartón limpios y secos',
  },
  verde: {
    nombre: 'VERDE',
    fondo: '#2f7d3b',
    tinta: '#ffffff',
    borde: '#2f7d3b',
    tipo: 'orgánicos',
    regla: 'Cáscaras, restos de comida y otros orgánicos',
  },
  negra: {
    nombre: 'NEGRA',
    fondo: '#1d1d1b',
    tinta: '#ffffff',
    borde: '#1d1d1b',
    tipo: 'no aprovechables',
    regla: 'Servilletas, papel sucio, empaques metalizados, vasos de café',
  },
};

// Orden de izquierda a derecha, como quedan frente a la cámara 2.
export const ORDEN_CANECAS = ['blanca', 'verde', 'negra'];

// ---------------------------------------------------------------------
// Los seis residuos (Tabla 1 del documento)
//   consejo:  una línea que acompaña a "va en la ___"
//   mezcla:   qué pasa si cae en la caneca equivocada
//   destino:  qué pasa cuando cae en la caneca correcta
// ---------------------------------------------------------------------
export const RESIDUOS = [
  {
    id: 'botella',
    nombre: 'Botella plástica',
    caneca: 'blanca',
    consejo: 'Vacíala antes de botarla.',
    mezcla: 'Con bebida adentro moja el papel y el cartón, y todo termina en el relleno.',
    destino: 'Vacía y limpia, vuelve a ser materia prima.',
  },
  {
    id: 'vaso',
    nombre: 'Vaso de café',
    caneca: 'negra',
    consejo: 'Parece papel, pero tiene plástico por dentro.',
    mezcla: 'Si termina con los orgánicos, el compost se contamina.',
    destino: 'En la negra no contamina lo que sí se puede recuperar.',
  },
  {
    id: 'paquete',
    nombre: 'Paquete de papas o galletas',
    caneca: 'negra',
    consejo: 'Es metalizado: no es plástico reciclable.',
    mezcla: 'En la blanca, un reciclador tiene que sacarlo a mano: nadie lo compra.',
    destino: 'En la negra no ensucia el material de los recicladores.',
  },
  {
    id: 'servilleta',
    nombre: 'Servilleta usada',
    caneca: 'negra',
    consejo: 'Es papel, pero la grasa no deja reciclarla.',
    mezcla: 'En la blanca, mancha el papel limpio y lo arruina.',
    destino: 'El papel limpio de la blanca sigue sirviendo.',
  },
  {
    id: 'organico',
    nombre: 'Cáscaras y restos de comida',
    caneca: 'verde',
    consejo: 'Sin bandeja ni cubiertos.',
    mezcla: 'Enterrado en Yotoco, sin oxígeno, produce metano y lixiviados.',
    destino: 'Hongos y bacterias lo vuelven compost para el suelo.',
  },
  {
    id: 'lata',
    nombre: 'Lata de gaseosa',
    caneca: 'blanca',
    consejo: 'El vaso y el pitillo van aparte.',
    mezcla: 'En la negra, un metal que se recicla sin fin termina enterrado en Yotoco.',
    destino: 'El aluminio vuelve a ser lata.',
  },
];

// Clases que el modelo aprende además de los residuos.
export const CLASES_EXTRA = [
  { id: 'fondo', nombre: 'Fondo vacío', ayuda: 'La mesa sin nada, gente pasando detrás, la luz cambiando.' },
  { id: 'otro', nombre: 'Otro objeto', ayuda: 'Celular, llaves, billetera, cuaderno, manos vacías.' },
];

export const TODAS_LAS_CLASES = [
  ...RESIDUOS.map((r) => ({ id: r.id, nombre: r.nombre, caneca: r.caneca })),
  ...CLASES_EXTRA,
];

// ---------------------------------------------------------------------
// Mensajes de pantalla
// ---------------------------------------------------------------------
export const TEXTOS = {
  titulo: 'Madrevieja',
  subtitulo: 'Un humedal del río Cauca que vuelve, residuo a residuo',

  espera: {
    principal: 'Muéstrale tu residuo a la cámara',
    secundario: 'y te digo en qué caneca va.',
    herencia: 'Esta madrevieja la dejó así quien pasó antes que tú.',
  },

  guia: {
    vaEn: 'va en la',
    siSeMezcla: 'Si se mezcla:',
    accion: 'Ahora deposítalo',
  },

  duda: {
    titulo: 'No estoy seguro.',
    tituloOtro: 'No conozco este objeto.',
    pregunta: '¿En cuál caneca crees que va?',
  },

  acierto: {
    titulo: '¡Acertaste!',
  },

  error: {
    cayoEn: 'Cayó en la',
    ibaEn: 'iba en la',
    cierre: 'La madrevieja retrocede un poco. Quien venga después puede recuperarla.',
  },

  dudaRespuesta: {
    titulo: 'Gracias por decidir.',
    texto: 'Dudar es normal: ahí empieza el problema. Ante la duda, mejor la negra que ensuciar la blanca.',
  },

  guiado: {
    titulo: 'Gracias.',
  },

  // Cuando se acierta: una de estas, al azar.
  efectosAcierto: [
    'El agua de la madrevieja se aclara un poco.',
    'Una garza vuelve a pescar.',
    'Un árbol del bosque seco reverdece.',
    'Las iguanas recuperan su orilla.',
    'Al río Cauca le llega un poco menos de lixiviado.',
    'Los recicladores reciben material limpio.',
  ],

  estados: ['Deteriorada', 'En transición', 'Recuperada'],
  aciertosHoy: 'aciertos hoy',
  estadoMadrevieja: 'Estado de la madrevieja',

  // Datos que rotan en la pantalla de espera.
  datos: [
    'En 1967 Cali empezó a botar su basura en Navarro, sobre madreviejas del río Cauca.',
    'Durante cuarenta años Navarro recibió la basura de Cali sin separar.',
    'Los lixiviados de Navarro se filtraron hacia el río del que Cali toma su agua.',
    'Hoy Cali produce cerca de 1.800 toneladas de basura al día.',
    'La basura de Cali viaja a un relleno en Yotoco que está casi lleno.',
    'En Cali se recicla apenas el 19 % de lo aprovechable.',
    'Desde 2021 el código es uno solo en todo el país: blanca, verde y negra.',
    'Una cáscara en la verde se vuelve compost. En el relleno, metano.',
    'Los recicladores reciben nuestros errores: material sucio es menos ingreso.',
    'Gallinazos, garzas e iguanas también viven con lo que botamos.',
  ],
};

// ---------------------------------------------------------------------
// Ajustes por defecto (se pueden cambiar desde el panel con la tecla A;
// lo que se cambie allá se guarda en el navegador y manda sobre esto).
// ---------------------------------------------------------------------
export const AJUSTES_BASE = {
  camaras: {
    reconocimiento: null, // { id, nombre }
    canecas: null, // { id, nombre } o { ninguna: true }
  },
  reconocimiento: {
    k: 7, // vecinos que votan
    confianzaMin: 0.7, // proporción de votos para aceptar una clase
    similitudMin: 0.6, // parecido mínimo con lo aprendido (0 a 1)
    ventana: 8, // cuántas predicciones seguidas se miran
    mayoria: 0.75, // proporción de la ventana que debe coincidir
    intervaloMs: 110, // cada cuánto se clasifica
    tiempoDudaMs: 1800, // cuánto tiempo de duda antes de preguntar
  },
  deposito: {
    esperaMs: 15000, // tiempo máximo esperando que bote el residuo
    umbralPixel: 26, // cambio de brillo que cuenta como movimiento
    umbralZona: 0.06, // fracción de la zona que debe moverse
    limiteSacudida: 0.22, // si se mueve más que esto FUERA de las zonas, es la cámara la que se movió
    ventanaMs: 450, // tiempo que se acumula movimiento antes de decidir
  },
  zonas: {
    blanca: { x: 0.04, y: 0.3, w: 0.27, h: 0.4 },
    verde: { x: 0.365, y: 0.3, w: 0.27, h: 0.4 },
    negra: { x: 0.69, y: 0.3, w: 0.27, h: 0.4 },
  },
  paisaje: {
    saludInicial: 30, // 0 = deteriorada, 100 = recuperada
    acierto: 4,
    error: 6,
    guiado: 2, // plan B, sin cámara 2
  },
  tiempos: {
    respuestaMs: 6500,
    enfriamientoMs: 1500,
    guiaSinCamaraMs: 7000,
  },
  vistaPrevia: true,
  sesion: 'casa',
};
