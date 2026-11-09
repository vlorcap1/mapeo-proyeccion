import { useEffect, useRef } from "react";
import type { Herramienta, Punto, Superficie } from "../tipos";

interface Props {
  escena: Superficie[];
  seleccion: string | null;
  herramienta: Herramienta;
  puntoSel: number | null;
  pantalla: { w: number; h: number };
  onSeleccionar: (id: string) => void;
  onPuntoSel: (i: number | null) => void;
  onCambiar: (id: string, cambio: Partial<Superficie>) => void;
}

type Arrastre =
  | { tipo: "esquina" | "recorte"; i: number }
  | { tipo: "mover"; inicio: Punto; original: Superficie };

const limitar = (v: number) => Math.min(1, Math.max(0, v));

/** Distancia de p al segmento a-b (en píxeles). */
function distanciaSegmento(p: Punto, a: Punto, b: Punto) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

export function Editor({ escena, seleccion, herramienta, puntoSel, pantalla, onSeleccionar, onPuntoSel, onCambiar }: Props) {
  const arrastre = useRef<Arrastre | null>(null);
  const sel = escena.find((s) => s.id === seleccion);
  const px = (p: Punto) => ({ x: p.x * pantalla.w, y: p.y * pantalla.h });
  const puntos = (ps: Punto[]) => ps.map((p) => `${p.x * pantalla.w},${p.y * pantalla.h}`).join(" ");
  const aFraccion = (e: { clientX: number; clientY: number }) => ({ x: limitar(e.clientX / pantalla.w), y: limitar(e.clientY / pantalla.h) });

  // Los arrastres se siguen en window para no perder el punto si el cursor sale del asa
  const ultimo = useRef({ sel, aFraccion, onCambiar });
  ultimo.current = { sel, aFraccion, onCambiar };
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const a = arrastre.current;
      const { sel, aFraccion, onCambiar } = ultimo.current;
      if (!a || !sel) return;
      const p = aFraccion(e);
      if (a.tipo === "esquina") {
        const esquinas = [...sel.esquinas] as Superficie["esquinas"];
        esquinas[a.i] = p;
        onCambiar(sel.id, { esquinas });
      } else if (a.tipo === "recorte" && sel.recorte) {
        onCambiar(sel.id, { recorte: sel.recorte.map((q, i) => (i === a.i ? p : q)) });
      } else if (a.tipo === "mover") {
        const dx = p.x - a.inicio.x, dy = p.y - a.inicio.y;
        const desplazar = (q: Punto) => ({ x: q.x + dx, y: q.y + dy });
        onCambiar(sel.id, {
          esquinas: a.original.esquinas.map(desplazar) as Superficie["esquinas"],
          recorte: a.original.recorte?.map(desplazar) ?? null,
        });
      }
    };
    const soltar = () => (arrastre.current = null);
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
  }, []);

  /** En modo recorte, un clic en el vacío agrega un punto en el borde más cercano de la forma. */
  const clicFondo = (e: React.PointerEvent) => {
    if (!sel || herramienta !== "recorte") return;
    const p = aFraccion(e);
    const actual = sel.recorte ?? [];
    let indice = actual.length;
    if (actual.length >= 3) {
      const enPx = px(p);
      let mejor = Infinity;
      actual.forEach((a, i) => {
        const d = distanciaSegmento(enPx, px(a), px(actual[(i + 1) % actual.length]));
        if (d < mejor) (mejor = d), (indice = i + 1);
      });
    }
    const recorte = [...actual.slice(0, indice), p, ...actual.slice(indice)];
    onCambiar(sel.id, { recorte });
    onPuntoSel(indice);
  };

  return (
    <svg className={`editor herramienta-${herramienta}`} width={pantalla.w} height={pantalla.h} onPointerDown={clicFondo}>
      {escena
        .filter((s) => s.visible)
        .map((s) => (
          <polygon
            key={s.id}
            points={puntos(s.esquinas)}
            className={s.id === seleccion ? "contorno seleccionado" : "contorno"}
            onPointerDown={(e) => {
              if (herramienta === "recorte" && s.id === seleccion) return; // deja pasar el clic para agregar puntos
              e.stopPropagation();
              onSeleccionar(s.id);
              onPuntoSel(null);
              if (herramienta === "esquinas") arrastre.current = { tipo: "mover", inicio: aFraccion(e), original: s };
            }}
          />
        ))}

      {sel && herramienta === "esquinas" &&
        sel.esquinas.map((p, i) => {
          const q = px(p);
          return (
            <g key={i}>
              <circle
                cx={q.x}
                cy={q.y}
                r={14}
                className={puntoSel === i ? "asa activa" : "asa"}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPuntoSel(i);
                  arrastre.current = { tipo: "esquina", i };
                }}
              />
              <text x={q.x} y={q.y + 5} className="asa-etiqueta">{i + 1}</text>
            </g>
          );
        })}

      {sel && herramienta === "recorte" && (
        <>
          {sel.recorte && sel.recorte.length >= 2 && <polygon points={puntos(sel.recorte)} className="forma-recorte" />}
          {sel.recorte?.map((p, i) => {
            const q = px(p);
            return (
              <circle
                key={i}
                cx={q.x}
                cy={q.y}
                r={9}
                className={puntoSel === i ? "asa recorte activa" : "asa recorte"}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPuntoSel(i);
                  arrastre.current = { tipo: "recorte", i };
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  const recorte = sel.recorte!.filter((_, j) => j !== i);
                  onCambiar(sel.id, { recorte: recorte.length ? recorte : null });
                  onPuntoSel(null);
                }}
              />
            );
          })}
        </>
      )}
    </svg>
  );
}
