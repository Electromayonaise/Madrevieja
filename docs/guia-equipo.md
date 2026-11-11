# Madrevieja: tareas para Karen y Manuela

Nada de esto requiere programar. Lo técnico ya está hecho; lo que falta es lo que solo se puede hacer en el lugar y con las cosas reales.

---

## 1. Capturar datos de entrenamiento en el sitio de la exposición (lo más importante)

El reconocimiento aprende de ejemplos. Los que se toman **en el lugar real, con su luz y su fondo**, valen mucho más que los de la casa. Esto es lo que más ayuda a que funcione el día de la exposición.

**Antes, en la casa (5 minutos, una sola vez):**
1. Entra a https://github.com/Electromayonaise/Madrevieja → botón verde **Code** → **Download ZIP**. No hace falta tener cuenta.
2. En la carpeta Descargas: clic derecho sobre el ZIP → **Extraer todo**. Hay que extraerlo; desde dentro del ZIP no funciona.
3. Abre la carpeta extraída y haz doble clic en **`iniciar-ventana.bat`**. Si Windows dice «Windows protegió su PC»: **Más información → Ejecutar de todas formas**.
4. Se abre una ventana negra minimizada (no la cierres) y Chrome con la instalación. Si se ve el paisaje, ya está.

No hay que instalar nada (ni Python ni otro programa). Solo se necesita Windows y Chrome o Edge. Con un Mac no funciona tal cual: avisen antes.

**Qué llevar:**
- Un portátil con Windows (cualquiera) con la carpeta `Madrevieja` extraída.
- La webcam Logitech, o la que se vaya a usar ese día.
- Los residuos reales: varias botellas plásticas, vasos de café, paquetes de papas o galletas, servilletas usadas, cáscaras o restos de comida, latas de gaseosa. Si se puede, de marcas y tamaños distintos: llenos, vacíos, aplastados.
- Otros objetos que la gente tendrá en la mano: celular, llaves, billetera, cuaderno.

**Paso a paso (unos 30–40 minutos):**
1. Pon la cámara **en el sitio y a la altura donde va a estar** el día de la exposición.
2. Doble clic en `iniciar-ventana.bat`. Acepta el permiso de cámara.
3. Pulsa la tecla **A** → pestaña **Entrenamiento**.
4. En «Sesión» (arriba) borra `casa` y escribe **`icesi`**. Ese nombre dice dónde se tomaron las muestras. Los números pequeños de cada fila («0 en «icesi»») cuentan solo las de esta sesión: empiezan en 0 y en rojo, y se ponen verdes al llegar a 120.
   - Si alguna vez capturan en su casa, no usen `casa` (ese nombre ya trae los datos de prueba y el contador saldría lleno): escriban `casa-karen` o `casa-manuela`.
5. Para cada residuo: **mantén presionado** su botón (o la tecla de su número) mientras lo mueves despacio frente a la cámara: gíralo, acércalo, aléjalo, cámbialo de mano. Suelta cuando el número llegue a **120** (se pone verde).
6. **Otro objeto (7):** celulares, llaves, billeteras, manos vacías. 120 también.
7. **Fondo vacío (8):** la mesa sin nada, con gente pasando detrás, con la luz como esté. 120 también.
8. Mira el recuadro de la izquierda: con cada residuo en la mano debe decir el nombre correcto. Si confunde dos, captura más de esos dos.
9. Pulsa **«Exportar solo «icesi»»**. Se descarga un archivo `.json` en la carpeta Descargas.
10. Manda ese archivo (WhatsApp, correo o Drive). Son solo números, no fotos.
11. Cierra Chrome y la ventana negra.

**Consejos:**
- Varias personas sosteniendo los objetos es mejor que una sola: manos distintas, mangas distintas.
- Si hay ventanas, captura un poco en la mañana y un poco en la tarde, o con la luz que habrá a la hora de la exposición.
- Si el sitio cambia (otra mesa, otra pared detrás), vale la pena repetir.

## 2. Ilustraciones (opcional: ya hay un paisaje dibujado por código)

La instalación ya tiene un paisaje propio que cambia solo, así que esto no es obligatorio. Si quieren poner ilustraciones propias:

- **Tres imágenes PNG de 1920×1080** (horizontal, como un televisor):
  - `deteriorado.png`: la madrevieja contaminada (basura, agua oscura, árboles secos, gallinazos).
  - `transicion.png`: a medio camino.
  - `recuperado.png`: recuperada (agua clara, garzas, árboles verdes, flores).
- **El mismo encuadre en las tres:** el mismo lago, los mismos árboles, el mismo horizonte, en el mismo lugar. La pantalla las funde una sobre otra, y si no coinciden se ve raro. Lo más fácil es dibujar una y hacer las otras dos encima.
- Dejar libre o tranquila la **franja central** (de arriba hasta un poco más abajo de la mitad): ahí aparecen los mensajes. Las esquinas de abajo y la de arriba a la derecha también llevan textos pequeños.
- Ponerlas en la carpeta `assets/ilustraciones/` (crearla si no existe) con esos nombres exactos.
- En el panel (**A** → **Ajustes**) aparece la casilla para usarlas.

## 3. Logística del día

**Lista para llevar:**
- [ ] Portátil de la exposición + cargador
- [ ] Webcam Logitech + extensión USB si el cable no alcanza
- [ ] Celular con Iriun instalado + cable USB + cargador
- [ ] Algo para **fijar el celular** sobre las canecas: cinta gruesa, una pinza, un soporte de cuello flexible o un palo de escoba. Es mucho mejor que sostenerlo.
- [ ] Cable HDMI (largo) para el televisor
- [ ] Regleta o extensión eléctrica
- [ ] Tres canecas **blanca, verde y negra**, o tres cajas forradas de esos colores
- [ ] Residuos de ejemplo por si nadie trae (botella, lata, servilleta, cáscara…)
- [ ] Un letrero pequeño: «Las cámaras no guardan imágenes»
- [ ] Opcional: un letrero que invite a acercarse: «Muéstrale tu residuo a la cámara»

**Montaje (llegar al menos 1 hora antes):**
1. Televisor, portátil, webcam a la altura de las manos (la gente debe poder mostrarle el objeto sin agacharse).
2. Las tres canecas juntas, en el orden **blanca · verde · negra** de izquierda a derecha.
3. El celular encima de las canecas, mirando las tres bocas.
4. Iriun abierto en el celular y en el portátil → doble clic en `iniciar.bat`.
5. Avisarle a quien lleva lo técnico para calibrar las zonas (son 30 segundos).
6. Probar con cada residuo antes de que llegue el público.

**Durante la exposición:**
- Alguien cerca para invitar a la gente y explicar la idea en una frase: *«Lo que botes bien ayuda a recuperar el humedal que dejó el que pasó antes que tú.»*
- Si algo se traba: tecla **A** y luego **Esc** devuelve la pantalla al inicio.
- Fotos y videos de la gente usando la instalación, para el documento final.
- Al final: tecla **A** → **Registro** → **Descargar registro (CSV)**. Ahí quedan los aciertos y errores del día.

## 4. Otras cosas que ayudan

- **Revisar los textos de la pantalla.** Están en `src/config.js`. Si quieren cambiar alguna frase, que la manden por escrito y se cambia en un minuto.
- **Verificar la información:** que las reglas de cada caneca y los datos sobre las madreviejas del Cauca sean correctos y tengan su fuente para el documento.
- **Probar con gente que no conoce el proyecto** (familia, amigos) usando las teclas 1–6 y B/V/N, y anotar qué no se entiende.
