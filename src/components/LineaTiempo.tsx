import { Pause, Play, Presentation, Repeat, Square } from "lucide-react";
import { duracionSuperficie, formatoTiempo } from "../reproduccion";
import type { EstadoReproduccion, Superficie, TipoContenido } from "../tipos";

export const COLOR_TIPO: Record<TipoContenido, string> = {
  patron: "#475569",
  color: "#0ea5e9",
  animacion: "#a855f7",
  texto: "#f59e0b",
  imagen: "#10b981",
  video: "#f43f5e",
};

export const ETIQUETA_TIPO: Record<TipoContenido, string> = {
  patron: "Calibrar",
  color: "Color",
  animacion: "Animación",
  texto: "Texto",
  imagen: "Imagen",
  video: "Video",
};

const FIN: Record<Superficie["alTerminar"], string> = { repetir: "se repite", mantener: "mantiene", apagar: "se apaga" };

interface Props {
  superficies: Superficie[];
  seleccion: string | null;
  clipSel: Record<string, string>;
  estado: EstadoReproduccion;
  /** Tiempo dentro de la presentación (ya aplicada la repetición). */
  tiempo: number;
  total: number;
  repetir: boolean;
  panelVisible: boolean;
  onReproducir: () => void;
  onPausar: () => void;
  onDetener: () => void;
  onIrA: (t: number) => void;
  onRepetir: (v: boolean) => void;
  onPresentar: () => void;
  onElegirClip: (superficie: string, clip: string) => void;
}

export function LineaTiempo(p: Props) {
  // Escala común para todas las filas: así se ve qué pasa al mismo tiempo en cada superficie
  const escala = Math.max(p.total, 1);
  const pct = (t: number) => `${(t / escala) * 100}%`;

  const saltar = (e: React.PointerEvent<HTMLDivElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    p.onIrA(Math.max(0, Math.min(p.total, ((e.clientX - caja.left) / caja.width) * escala)));
  };

  return (
    <section className={p.panelVisible ? "linea-tiempo con-panel" : "linea-tiempo"} onPointerDown={(e) => e.stopPropagation()}>
      <div className="controles">
        {p.estado === "reproduciendo" ? (
          <button className="icono grande" title="Pausar (Espacio)" onClick={p.onPausar}>
            <Pause size={18} />
          </button>
        ) : (
          <button className="icono grande" title="Reproducir (Espacio)" onClick={p.onReproducir}>
            <Play size={18} />
          </button>
        )}
        <button className="icono grande" title="Detener y volver al inicio (Inicio)" onClick={p.onDetener} disabled={p.estado === "detenido"}>
          <Square size={16} />
        </button>
        <span className="reloj">
          {formatoTiempo(p.tiempo)} <span>/ {formatoTiempo(p.total)}</span>
        </span>
        <button className={p.repetir ? "alternar activo" : "alternar"} title="Repetir la presentación completa" onClick={() => p.onRepetir(!p.repetir)}>
          <Repeat size={15} /> Repetir
        </button>
        <button className="primario presentar" title="Presentar desde el inicio a pantalla completa (P)" onClick={p.onPresentar}>
          <Presentation size={16} /> Presentar
        </button>
      </div>

      <div className="pistas">
        <div className="fila-pista regla">
          <span className="nombre-pista" />
          <div className="pista" onPointerDown={saltar}>
            {Array.from({ length: Math.floor(escala) + 1 }, (_, s) => s)
              .filter((s) => s % (escala > 60 ? 10 : escala > 20 ? 5 : 1) === 0)
              .map((s) => (
                <span key={s} className="marca-regla" style={{ left: pct(s) }}>
                  {s}s
                </span>
              ))}
          </div>
        </div>
        {p.superficies.map((s) => {
          const dur = duracionSuperficie(s);
          let inicio = 0;
          return (
            <div key={s.id} className={`fila-pista${s.visible ? "" : " oculta"}${s.id === p.seleccion ? " seleccionada" : ""}`}>
              <span className="nombre-pista" title={s.nombre}>{s.nombre}</span>
              <div className="pista" onPointerDown={saltar}>
                {s.clips.map((c, i) => {
                  const izquierda = inicio;
                  inicio += c.duracion;
                  return (
                    <button
                      key={c.id}
                      className={p.clipSel[s.id] === c.id && s.id === p.seleccion ? "bloque activo" : "bloque"}
                      style={{ left: pct(izquierda), width: pct(c.duracion), background: COLOR_TIPO[c.contenido.tipo] }}
                      title={`${i + 1}. ${ETIQUETA_TIPO[c.contenido.tipo]} · ${c.duracion}s`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => p.onElegirClip(s.id, c.id)}
                    >
                      {c.fundido > 0 && <span className="cuña" style={{ width: `${Math.min(100, (c.fundido / c.duracion) * 100)}%` }} />}
                      <span className="texto-bloque">{c.contenido.archivo || (c.contenido.tipo === "texto" ? c.contenido.texto : "") || ETIQUETA_TIPO[c.contenido.tipo]}</span>
                    </button>
                  );
                })}
                {dur < p.total && (
                  <span className={`fin fin-${s.alTerminar}`} style={{ left: pct(dur), width: pct(p.total - dur) }}>
                    {FIN[s.alTerminar]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div className="cabezal" style={{ left: `calc(var(--ancho-nombre) + (100% - var(--ancho-nombre)) * ${p.tiempo / escala})` }} />
      </div>
    </section>
  );
}
