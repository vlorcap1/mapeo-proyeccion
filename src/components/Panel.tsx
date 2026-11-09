import {
  Copy, Eye, EyeOff, Grid3x3, Image as ImageIcon, Keyboard, Maximize, Move, Palette, PanelLeftClose, Plus,
  Projector, Scissors, Sparkles, Trash2, Type, Video,
} from "lucide-react";
import type { Herramienta, Superficie, TipoContenido } from "../tipos";

const TIPOS: { tipo: TipoContenido; etiqueta: string; icono: typeof Grid3x3 }[] = [
  { tipo: "patron", etiqueta: "Calibrar", icono: Grid3x3 },
  { tipo: "color", etiqueta: "Color", icono: Palette },
  { tipo: "animacion", etiqueta: "Animación", icono: Sparkles },
  { tipo: "texto", etiqueta: "Texto", icono: Type },
  { tipo: "imagen", etiqueta: "Imagen", icono: ImageIcon },
  { tipo: "video", etiqueta: "Video", icono: Video },
];

interface Props {
  escena: Superficie[];
  seleccion: string | null;
  herramienta: Herramienta;
  onSeleccionar: (id: string) => void;
  onHerramienta: (h: Herramienta) => void;
  onCambiar: (id: string, cambio: Partial<Superficie>) => void;
  onAgregar: () => void;
  onDuplicar: (id: string) => void;
  onEliminar: (id: string) => void;
  onArchivo: (id: string, archivo: File) => void;
  onProyectar: () => void;
  onPantallaCompleta: () => void;
  onOcultar: () => void;
}

export function Panel(p: Props) {
  const sel = p.escena.find((s) => s.id === p.seleccion);
  const contenido = sel?.contenido;
  const cambiarContenido = (cambio: Partial<Superficie["contenido"]>) =>
    sel && p.onCambiar(sel.id, { contenido: { ...sel.contenido, ...cambio } });

  return (
    <aside className="panel" onPointerDown={(e) => e.stopPropagation()}>
      <header className="panel-cabecera">
        <div className="marca">
          <Projector size={18} />
          <span>Mapeo de proyección</span>
        </div>
        <button className="icono" title="Ocultar panel (H)" onClick={p.onOcultar}>
          <PanelLeftClose size={16} />
        </button>
      </header>

      <div className="acciones">
        <button className="primario" onClick={p.onProyectar} title="Oculta guías y panel (E para volver)">
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
          {p.escena.map((s) => (
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
          {p.escena.length === 0 && <li className="vacio">Agrega una superficie con +</li>}
        </ul>
      </section>

      {sel && contenido && (
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
            <h2>Contenido</h2>
            <div className="tipos">
              {TIPOS.map(({ tipo, etiqueta, icono: Icono }) => (
                <button key={tipo} className={contenido.tipo === tipo ? "activo" : ""} onClick={() => cambiarContenido({ tipo })}>
                  <Icono size={16} />
                  {etiqueta}
                </button>
              ))}
            </div>

            {(contenido.tipo === "imagen" || contenido.tipo === "video") && (
              <label className="archivo">
                <span>{contenido.archivo ?? `Elegir ${contenido.tipo}`}</span>
                <input
                  type="file"
                  accept={contenido.tipo === "imagen" ? "image/*" : "video/*"}
                  onChange={(e) => e.target.files?.[0] && p.onArchivo(sel.id, e.target.files[0])}
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
          </section>

          <section>
            <h2>Superficie</h2>
            <input className="campo" value={sel.nombre} onChange={(e) => p.onCambiar(sel.id, { nombre: e.target.value })} />
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
        <span><kbd>E</kbd> editar/proyectar · <kbd>F</kbd> pantalla completa · <kbd>H</kbd> panel · flechas mueven 1 px (<kbd>Shift</kbd> 10)</span>
      </footer>
    </aside>
  );
}
