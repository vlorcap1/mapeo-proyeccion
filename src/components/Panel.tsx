import {
  ChevronDown, ChevronUp, Copy, Eye, EyeOff, Grid3x3, Image as ImageIcon, Keyboard, Maximize, Move, Palette,
  PanelLeftClose, Plus, Projector, Scissors, Sparkles, Trash2, Type, Video,
} from "lucide-react";
import type { AlTerminar, Clip, Herramienta, Superficie, TipoContenido } from "../tipos";
import { COLOR_TIPO, ETIQUETA_TIPO } from "./LineaTiempo";

const ICONOS: Record<TipoContenido, typeof Grid3x3> = {
  patron: Grid3x3,
  color: Palette,
  animacion: Sparkles,
  texto: Type,
  imagen: ImageIcon,
  video: Video,
};
const TIPOS = Object.keys(ICONOS) as TipoContenido[];

interface Props {
  superficies: Superficie[];
  seleccion: string | null;
  clipSel: string | null;
  herramienta: Herramienta;
  onSeleccionar: (id: string) => void;
  onHerramienta: (h: Herramienta) => void;
  onCambiar: (id: string, cambio: Partial<Superficie>) => void;
  onAgregar: () => void;
  onDuplicar: (id: string) => void;
  onEliminar: (id: string) => void;
  onElegirClip: (superficie: string, clip: string) => void;
  onCambiarClip: (superficie: string, clip: string, cambio: Partial<Clip>) => void;
  onAgregarClip: (superficie: string) => void;
  onEliminarClip: (superficie: string, clip: string) => void;
  onMoverClip: (superficie: string, clip: string, delta: -1 | 1) => void;
  onArchivo: (superficie: string, clip: string, archivo: File) => void;
  onProyectar: () => void;
  onPantallaCompleta: () => void;
  onOcultar: () => void;
}

const numero = (v: string, minimo: number) => Math.max(minimo, Number(v.replace(",", ".")) || minimo);

export function Panel(p: Props) {
  const sel = p.superficies.find((s) => s.id === p.seleccion);
  const clip = sel?.clips.find((c) => c.id === p.clipSel) ?? sel?.clips[0];
  const contenido = clip?.contenido;
  const cambiarClip = (cambio: Partial<Clip>) => sel && clip && p.onCambiarClip(sel.id, clip.id, cambio);
  const cambiarContenido = (cambio: Partial<Clip["contenido"]>) => contenido && cambiarClip({ contenido: { ...contenido, ...cambio } });

  return (
    <aside className="panel" onPointerDown={(e) => e.stopPropagation()}>
      <header className="panel-cabecera">
        <div className="marca">
          <Projector size={18} />
          <span>Mapeo de proyección</span>
        </div>
        <button className="icono" title="Ocultar panel y línea de tiempo (H)" onClick={p.onOcultar}>
          <PanelLeftClose size={16} />
        </button>
      </header>

      <div className="acciones">
        <button onClick={p.onProyectar} title="Oculta guías y panel sin mover el reloj (E para volver)">
          <Projector size={16} /> Proyectar
        </button>
        <button onClick={p.onPantallaCompleta} title="Pantalla completa (F)">
          <Maximize size={16} /> Pantalla completa
        </button>
      </div>

      <section>
        <div className="titulo-seccion">
          <h2>Superficies</h2>
          <button className="icono" title="Agregar superficie" onClick={p.onAgregar}>
            <Plus size={16} />
          </button>
        </div>
        <ul className="lista">
          {p.superficies.map((s) => (
            <li key={s.id} className={s.id === p.seleccion ? "activo" : ""} onClick={() => p.onSeleccionar(s.id)}>
              <span className="nombre">{s.nombre}</span>
              <button
                className="icono"
                title={s.visible ? "Ocultar" : "Mostrar"}
                onClick={(e) => {
                  e.stopPropagation();
                  p.onCambiar(s.id, { visible: !s.visible });
                }}
              >
                {s.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </li>
          ))}
          {p.superficies.length === 0 && <li className="vacio">Agrega una superficie con +</li>}
        </ul>
      </section>

      {sel && clip && contenido && (
        <>
          <section>
            <h2>Ajuste</h2>
            <div className="segmentado">
              <button className={p.herramienta === "esquinas" ? "activo" : ""} onClick={() => p.onHerramienta("esquinas")}>
                <Move size={15} /> Esquinas
              </button>
              <button className={p.herramienta === "recorte" ? "activo" : ""} onClick={() => p.onHerramienta("recorte")}>
                <Scissors size={15} /> Recorte
              </button>
            </div>
            <p className="ayuda">
              {p.herramienta === "esquinas"
                ? "Arrastra las 4 esquinas hasta los bordes del objeto. Arrastra el centro para mover todo."
                : sel.recorte
                  ? "Clic para agregar puntos al borde, arrástralos para ajustar, doble clic para borrar uno. Fuera de la forma queda negro."
                  : "Haz clic alrededor del objeto para dibujar la forma exacta donde se permite la luz."}
            </p>
            {p.herramienta === "recorte" && sel.recorte && (
              <button className="secundario" onClick={() => p.onCambiar(sel.id, { recorte: null })}>
                <Trash2 size={15} /> Quitar recorte
              </button>
            )}
          </section>

          <section>
            <div className="titulo-seccion">
              <h2>Línea de tiempo</h2>
              <button className="icono" title="Agregar clip al final" onClick={() => p.onAgregarClip(sel.id)}>
                <Plus size={16} />
              </button>
            </div>
            <ol className="clips">
              {sel.clips.map((c, i) => {
                const Icono = ICONOS[c.contenido.tipo];
                return (
                  <li key={c.id} className={c.id === clip.id ? "activo" : ""} onClick={() => p.onElegirClip(sel.id, c.id)}>
                    <span className="punto" style={{ background: COLOR_TIPO[c.contenido.tipo] }} />
                    <Icono size={14} />
                    <span className="nombre">{c.contenido.archivo || ETIQUETA_TIPO[c.contenido.tipo]}</span>
                    <span className="duracion">{c.duracion}s</span>
                    <span className="mini">
                      <button className="icono" title="Antes" disabled={i === 0} onClick={(e) => (e.stopPropagation(), p.onMoverClip(sel.id, c.id, -1))}>
                        <ChevronUp size={13} />
                      </button>
                      <button
                        className="icono"
                        title="Después"
                        disabled={i === sel.clips.length - 1}
                        onClick={(e) => (e.stopPropagation(), p.onMoverClip(sel.id, c.id, 1))}
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        className="icono"
                        title="Eliminar clip"
                        disabled={sel.clips.length === 1}
                        onClick={(e) => (e.stopPropagation(), p.onEliminarClip(sel.id, c.id))}
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
            <label className="fila">
              <span>Al terminar</span>
              <select className="campo" value={sel.alTerminar} onChange={(e) => p.onCambiar(sel.id, { alTerminar: e.target.value as AlTerminar })}>
                <option value="repetir">Repetir esta superficie</option>
                <option value="mantener">Mantener el último clip</option>
                <option value="apagar">Apagar (negro)</option>
              </select>
            </label>
          </section>

          <section>
            <h2>Clip {sel.clips.indexOf(clip) + 1}</h2>
            <div className="tipos">
              {TIPOS.map((tipo) => {
                const Icono = ICONOS[tipo];
                return (
                  <button key={tipo} className={contenido.tipo === tipo ? "activo" : ""} onClick={() => cambiarContenido({ tipo })}>
                    <Icono size={16} />
                    {ETIQUETA_TIPO[tipo]}
                  </button>
                );
              })}
            </div>

            {(contenido.tipo === "imagen" || contenido.tipo === "video") && (
              <label className="archivo">
                <span>{contenido.archivo ?? `Elegir ${contenido.tipo}`}</span>
                <input
                  type="file"
                  accept={contenido.tipo === "imagen" ? "image/*" : "video/*"}
                  onChange={(e) => e.target.files?.[0] && p.onArchivo(sel.id, clip.id, e.target.files[0])}
                />
              </label>
            )}
            {contenido.tipo === "texto" && (
              <input className="campo" value={contenido.texto} placeholder="Escribe el texto" onChange={(e) => cambiarContenido({ texto: e.target.value })} />
            )}
            {contenido.tipo !== "imagen" && contenido.tipo !== "video" && (
              <label className="fila">
                <span>Color</span>
                <input type="color" value={contenido.color} onChange={(e) => cambiarContenido({ color: e.target.value })} />
              </label>
            )}
            <div className="dos">
              <label className="columna">
                <span>Duración (s)</span>
                <input
                  key={`d-${clip.id}-${clip.duracion}`}
                  className="campo"
                  inputMode="decimal"
                  defaultValue={clip.duracion}
                  onBlur={(e) => cambiarClip({ duracion: numero(e.target.value, 0.5) })}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </label>
              <label className="columna">
                <span>Fundido (s)</span>
                <input
                  key={`f-${clip.id}-${clip.fundido}`}
                  className="campo"
                  inputMode="decimal"
                  defaultValue={clip.fundido}
                  onBlur={(e) => cambiarClip({ fundido: Math.min(clip.duracion, numero(e.target.value, 0)) })}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </label>
            </div>
          </section>

          <section>
            <h2>Superficie</h2>
            <input className="campo" value={sel.nombre} onChange={(e) => p.onCambiar(sel.id, { nombre: e.target.value })} />
            <label className="fila">
              <span>Brillo</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sel.opacidad}
                onChange={(e) => p.onCambiar(sel.id, { opacidad: Number(e.target.value) })}
              />
            </label>
            <div className="acciones">
              <button className="secundario" onClick={() => p.onDuplicar(sel.id)}>
                <Copy size={15} /> Duplicar
              </button>
              <button className="peligro" onClick={() => p.onEliminar(sel.id)}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </section>
        </>
      )}

      <footer className="atajos">
        <Keyboard size={14} />
        <span>
          <kbd>P</kbd> presentar · <kbd>Espacio</kbd> reproducir/pausar · <kbd>E</kbd> editar/proyectar · <kbd>F</kbd> pantalla completa ·{" "}
          <kbd>H</kbd> ocultar · flechas mueven 1 px (<kbd>Shift</kbd> 10)
        </span>
      </footer>
    </aside>
  );
}
