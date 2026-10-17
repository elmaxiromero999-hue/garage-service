# Garage Service — sitio web

One-page en HTML + CSS + JS sin dependencias. Abrí `index.html` con un servidor local:

```
python3 -m http.server 8790 --directory "08-landing/site"
```

y entrá a http://127.0.0.1:8790

## Archivos
- `index.html` — estructura y textos (voseo). La intro está en `<template id="intro-tpl">`.
- `styles.css` — tokens de marca, secciones, intro, ajustes móvil y movimiento reducido.
- `main.js` — WhatsApp (`WA_NUMBER`), campo interactivo del hero, escáner del auto, plano del taller, proceso, chat, buscador de seguros, antes/después, granizo, consulta en 10 segundos, mapa, cursor.
- `intro.js` — animación del logo (primera visita de la sesión). `?intro` la fuerza, `?nointro` la saltea.
- `assets/` — fotos WebP, recortes de autos, logos SVG recortados y en blanco, patrón, favicon y `og.jpg`.
- `TODO.md` — datos a confirmar antes de publicar.

## Reglas
Sin rojo. Sin "The". Logo en blanco sobre oscuro o azul, una vez en el header y otra en el footer.
Nada de números, reseñas ni testimonios inventados. Funciona sin JS y respeta `prefers-reduced-motion`.
