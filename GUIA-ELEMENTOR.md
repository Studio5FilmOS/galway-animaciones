# Guía rápida de implementación en Elementor Gratuito (Galway)

## 1. Subir el plugin a WordPress
1. Entra a tu WordPress → **Plugins > Añadir nuevo > Subir plugin**.
2. Selecciona el archivo **`galway-animaciones.zip`**.
3. Haz clic en **Instalar ahora** y luego en **Activar plugin**.

> El plugin se desactiva automáticamente dentro del editor de Elementor para que puedas ver y editar todos tus textos, menús y fotos sin estorbos.

---

## 2. Clases CSS para colocar en Elementor (`Avanzado > Clases CSS`)

### Cabecera (en Elementor Header & Footer Builder o en tu plantilla)
* Contenedor de la barra superior fija: `gw-header-glass`
* Botón / ícono sánduche que abre el menú: `gw-menu-toggle`

### Menú Overlay (Página 2 del diseño)
* Contenedor principal del menú desplegable (debe ir en la página o en el Header): `gw-menu-overlay`
* Botón o ícono `X` para cerrar el menú: `gw-menu-close`
* Elemento de texto/botón **`JOURNEYS`**: `gw-journeys-trigger`
* Contenedor flotante izquierdo con las 4 tarjetas (`ON-BOARD`, `ISLAND HOPPING`, `DIVING`, `EDUCATION`): `gw-journeys-panel`

### Escena 1 — Portada con video (Página 1 del diseño)
* Contenedor principal (`100vh`, fondo tipo Video con tu clip de 10s): `gw-scene gw-hero-scene`
* Contenedor del botón `PLAN YOUR TRIP`: `gw-btn-pill`

### Escena 2 — Pilares `EXPLORE · DISCOVER · LEARN` (Página 3 del diseño)
* Contenedor padre (`100vh`, dirección horizontal en fila): `gw-scene gw-pillars`
* Cada uno de los 3 contenedores hijos (`EXPLORE`, `DISCOVER`, `LEARN`): `gw-pillar`
* Widget de texto descriptivo dentro de cada columna: `gw-pillar-desc`

### Escena 3 — Entorno Submarino + Lobo Marino + Formulario (Página 4 del diseño)
* Contenedor principal (`100vh`, ancho completo): `gw-scene gw-ocean-scene`
* Widget **Imagen** del lobo marino recortado en PNG transparente: `gw-sealion-swim`
* Widget **Shortcode** (con tu formulario multipaso de **Forminator**): `gw-ocean-form`

### Escena 4 — `ABOUT US` (Página 5 del diseño)
* Contenedor principal (`100vh`, con la foto de Roberta, Cristina y la tortuga): `gw-scene gw-ken-burns`
* Contenedor de los textos de Roberta y Cristina: `gw-stagger`

### Clases extra reutilizables en cualquier sección
* `gw-reveal`: hace aparecer cualquier título, imagen o botón suavemente al llegar con el scroll.
* `gw-stagger`: anima en cascada los elementos hijos dentro de un contenedor.
