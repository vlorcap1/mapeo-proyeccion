# Mapeo de proyección

App web para *projection mapping*: con un proyector, ilumina solo el objeto que tú marques y deja todo lo demás en negro.

## Cómo usarla

1. Conecta el proyector como **segunda pantalla** (o espejo) y abre la app en el navegador.
2. Lleva la ventana al proyector y pulsa **F** (pantalla completa).
3. Con la cuadrícula de **Calibrar**, arrastra las **4 esquinas** hasta que calcen con los bordes del objeto. Arrastra el centro para moverla entera; las flechas afinan 1 px (Shift: 10 px).
4. Si el objeto no es rectangular, cambia a **Recorte** y haz clic alrededor de su contorno: fuera de esa forma no sale luz. Doble clic o Supr borra un punto.
5. Elige el contenido: color, animación, texto, imagen o video (en bucle, sin sonido).
6. Pulsa **E** para proyectar lo que ves: se ocultan guías, panel y cursor. **E** otra vez para volver a editar.

## Línea de tiempo y modo presentación

Cada superficie tiene su propia **línea de tiempo**: una secuencia de clips, cada uno con su contenido, su duración y un fundido de entrada opcional. Un video ajusta solo la duración del clip a lo que dura.

- **Presentar** (o tecla **P**): todas las superficies parten juntas desde cero, a pantalla completa y sin guías.
- **Repetir**: cuando termina la superficie más larga, todas vuelven a partir juntas (siguen sincronizadas).
- **Al terminar**, cada superficie más corta puede *repetirse sola*, *mantener su último clip* o *apagarse* (negro) hasta que termine la presentación.
- **Espacio** reproduce o pausa, **Inicio** vuelve al comienzo, y un clic en la barra de tiempo salta a ese segundo.

Puedes agregar varias superficies, por ejemplo una por cada cara de una caja. Todo queda guardado en este navegador: posiciones en `localStorage` e imágenes/videos en IndexedDB. No se sube nada a ningún servidor.

## Desarrollo

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # genera dist/
```

Cada push a `main` publica la app en GitHub Pages (`.github/workflows/pages.yml`). En el repositorio hay que activar **Settings → Pages → Source: GitHub Actions**.

## Cómo funciona

Cada superficie dibuja su contenido en un lienzo de 1280×720 y lo deforma hacia las 4 esquinas con una homografía (`matrix3d` de CSS, ver `src/homografia.ts`). El recorte opcional es un `clip-path: polygon(...)`. Las coordenadas se guardan como fracción de la pantalla, así el mapeo se mantiene al entrar a pantalla completa.
