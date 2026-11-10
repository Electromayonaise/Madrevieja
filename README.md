# Madrevieja

Instalación de artes mediales (Icesi). Una cámara reconoce el residuo que la persona trae, la pantalla le dice en qué caneca va (blanca, verde o negra, según la Res. 2184 de 2019) y qué pasa si se mezcla, una segunda cámara mira dónde cayó, y un paisaje de madrevieja compartido mejora o se deteriora con cada depósito. Las cámaras nunca guardan imágenes.

La propuesta completa está en [docs/Madrevieja_proyecto_final_Icesi.pdf](docs/Madrevieja_proyecto_final_Icesi.pdf). Las tareas de Karen y Manuela están en [docs/guia-equipo.md](docs/guia-equipo.md).

## Encenderla

1. Conecta la webcam Logitech (cámara 1) y abre **Iriun** en el celular y en el computador (cámara 2). Por cable USB es más estable que por wifi.
2. Doble clic en **`iniciar.bat`**. Se abre una ventana minimizada (el servidor; no la cierres) y Chrome en pantalla completa.
3. La primera vez el navegador pide permiso para usar las cámaras: acepta.
4. Para salir: **Alt+F4**.

No hay que instalar nada: el servidor es PowerShell, que ya viene en Windows. Si el computador no tiene Chrome, usa Edge.

> Abre la instalación **siempre** con `iniciar.bat`. Los datos de entrenamiento y el estado del paisaje se guardan en un perfil propio del navegador (`%LOCALAPPDATA%\Madrevieja\navegador`). Si la abres de otra forma, aparece vacía (los datos no se pierden, solo se ven en ese perfil).

## Teclas

| Tecla | Qué hace |
|---|---|
| **A** | Panel de control (cámaras, entrenamiento, canecas, ajustes, registro) |
| **Esc** | Cerrar el panel |
| **F** | Pantalla completa |
| **D** | Datos de depuración |
| **H** | Ayuda con las teclas |
| **1–6** | Simular residuo: botella, vaso, paquete, servilleta, orgánico, lata |
| **7** | Simular objeto desconocido («No estoy seguro») |
| **B · V · N** | Simular que cayó en la blanca, verde o negra |

Con las teclas se puede probar toda la experiencia sin cámaras.

## Cómo funciona

```
espera ──(ve un residuo estable)──► guía: «va en la BLANCA» ──(cámara 2 ve dónde cayó)──► respuesta: acierto / error
   ▲          └─(no está seguro)──► duda: «¿en cuál crees?» ─┘                                   │
   └──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Reconocimiento:** MobileNet (el mismo de Teachable Machine) convierte cada cuadro en 1280 números y un clasificador de vecinos (KNN) lo compara con las muestras que capturamos. Si la seguridad o el parecido son bajos, dice «No estoy seguro».
- **Canecas:** compara cada cuadro de la cámara 2 con el anterior y mide cuánto cambió cada zona. Si se mueve mucho lo de *fuera* de las zonas, es la cámara la que se movió y lo ignora.
- **Paisaje:** de 0 (deteriorada) a 100 (recuperada). Acierto +4, error −6, modo guiado +2. Se guarda entre días: quien llega hereda lo que dejó el anterior.
- **Plan B:** si no hay cámara 2 (o se elige «Ninguna»), la instalación funciona en **modo guiado**: muestra la guía unos segundos, agradece y el paisaje mejora un poco.

## Entrenar el reconocimiento (pestaña Entrenamiento)

1. Escribe el nombre de la **sesión** (`casa`, `sitio`…). Sirve para saber de dónde vino cada muestra.
2. Mantén presionado el botón de la clase (o la tecla del número) mientras mueves el objeto frente a la cámara: ~9 muestras por segundo.
3. Meta: **~120 muestras por clase en cada lugar**. El número se pone verde cuando llega.
4. No olvides **Fondo vacío** (8) y **Otro objeto** (7): son los que evitan que confunda la mesa o un celular con un residuo.
5. Mira la predicción en vivo a la izquierda. Si confunde dos clases, captura más de las dos justo en esas posiciones.

**Juntar los datos de varias personas:** cada quien pulsa *Exportar solo «su sesión»* y manda el `.json` (WhatsApp, correo, USB). En el computador de la exposición: *Importar archivo(s)*. Las muestras repetidas se ignoran, así que se puede importar dos veces sin problema. Los archivos son solo números, no fotos.

Los datos capturados en el sitio real valen más que los de la casa (misma luz, mismo fondo). Si el día de la exposición el reconocimiento falla, 10 minutos de captura en el sitio (sesión `sitio`) suelen bastar.

## Cámara 2 y las canecas (pestaña Canecas)

**Lo ideal:** fijar el celular, no sostenerlo. Cinta, una pinza, un soporte de cuello flexible o amarrado a una silla o un palo de escoba, mirando las tres bocas desde arriba y un poco adelante. Basta con 1–1,5 m de altura si se ven las tres bocas completas.

**Si alguien lo sostiene:** que apoye los codos y no lo mueva. Las sacudidas se ignoran, pero si se mueve justo cuando cae el residuo, ese depósito no se cuenta: a los 15 s la pantalla vuelve al inicio sin tocar el paisaje (nunca se queda trabada).

**Calibrar (unos 30 segundos, el mismo día):**
1. Panel (**A**) → *Canecas*.
2. Arrastra cada rectángulo sobre la boca de su caneca. La esquina inferior derecha cambia el tamaño.
3. Pulsa **Probar** y bota algo en cada caneca. Debe aparecer el nombre correcto.
4. Si no detecta objetos pequeños, baja *Sensibilidad de la zona*. Si detecta cosas solas, súbela o sube *Cambio de luz*.
5. Si el indicador de «fuera» se pone rojo todo el tiempo (cámara en la mano), sube *Tolerancia a que se mueva la cámara*.

**Practicar en casa:** tres cajas o canastas en el piso, el celular con Iriun encima, y botar cosas. Es la misma prueba que el día de la exposición.

## Ilustraciones (opcional)

El paisaje se dibuja solo, por código. Si se ponen tres imágenes en `assets/ilustraciones/` (`deteriorado.png`, `transicion.png`, `recuperado.png`, 1920×1080, mismo encuadre), en *Ajustes* aparece la opción de usarlas; la pantalla las funde según el estado. Detalles en [docs/guia-equipo.md](docs/guia-equipo.md).

## Si algo falla

| Problema | Qué hacer |
|---|---|
| «Falta la cámara 1» | Panel → *Cámaras* → elige la Logitech → *Usar estas cámaras*. Si no aparece, desconecta y conecta, y *Volver a buscar cámaras*. |
| No aparece el celular | Abre Iriun en los dos lados **antes** de `iniciar.bat`. Luego *Volver a buscar cámaras*. |
| Dice «No estoy seguro» con todo | Captura más muestras en el sitio, o baja *Seguridad mínima* / *Parecido mínimo* en *Ajustes*. |
| Confunde la mesa vacía con un residuo | Captura más **Fondo vacío** en el sitio, con gente pasando detrás. |
| Detecta depósitos que no pasaron | Sube *Sensibilidad de la zona* o *Cambio de luz* en *Canecas*. |
| La cámara 2 falla del todo | Panel → *Cámaras* → cámara 2: *Ninguna*. Modo guiado, sigue funcionando. |
| «No se pudo abrir el puerto 8765» | Ya hay una ventana del servidor abierta. Ciérrala o usa esa. |
| Empezar el paisaje de cero | *Registro* → *Reiniciar madrevieja*. |
| Pasar todo a otro computador | Copia la carpeta, exporta el entrenamiento (*Exportar todo*) e impórtalo allá. |

## Registro

*Registro* muestra los aciertos, errores y dudas del día, y descarga un CSV con cada interacción (hora, residuo, caneca, resultado). Sirve como evidencia para el documento final.

## Archivos

```
index.html            página
iniciar.bat           servidor + Chrome en pantalla completa
servidor.ps1          servidor local (PowerShell)
src/config.js         residuos, canecas y TODOS los textos de pantalla
src/ajustes.js        valores por defecto guardados en el navegador
src/main.js           arranque y bucle principal
src/experiencia.js    máquina de estados (espera, guía, duda, respuesta)
src/modelo.js         MobileNet + KNN + almacenamiento de muestras
src/deteccion.js      cámara 2: en qué caneca cayó
src/memoria.js        estado del paisaje y registro diario
src/paisaje.js        paisaje dibujado por código
src/ui.js             tarjetas y textos sobre el paisaje
src/panel.js          panel de control
vendor/               TensorFlow.js y MobileNet (funciona sin internet)
```

Los textos se cambian en `src/config.js`, sin tocar lo demás.
