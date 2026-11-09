import { useCallback, useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { borrarArchivo, cargarEscena, guardarArchivo, guardarEscena, leerArchivo } from "./almacen";
import { Capa } from "./components/Capa";
import { Editor } from "./components/Editor";
import { Panel } from "./components/Panel";
import type { Herramienta, Punto, Superficie } from "./tipos";

function nuevaSuperficie(n: number): Superficie {
  const d = (n % 5) * 0.04;
  return {
    id: crypto.randomUUID(),
    nombre: `Superficie ${n + 1}`,
    esquinas: [
      { x: 0.3 + d, y: 0.25 + d },
      { x: 0.7 + d, y: 0.25 + d },
      { x: 0.7 + d, y: 0.75 + d },
      { x: 0.3 + d, y: 0.75 + d },
    ],
    recorte: null,
    contenido: { tipo: "patron", color: "#38bdf8", texto: "" },
    visible: true,
    opacidad: 1,
  };
}

function usePantalla() {
  const medir = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [pantalla, setPantalla] = useState(medir);
  useEffect(() => {
    const alCambiar = () => setPantalla(medir());
    window.addEventListener("resize", alCambiar);
    return () => window.removeEventListener("resize", alCambiar);
  }, []);
  return pantalla;
}

const pantallaCompleta = () =>
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});

export default function App() {
  const [escena, setEscena] = useState<Superficie[]>(() => cargarEscena() ?? [nuevaSuperficie(0)]);
  const [seleccion, setSeleccion] = useState<string | null>(() => escena[0]?.id ?? null);
  const [herramienta, setHerramienta] = useState<Herramienta>("esquinas");
  const [puntoSel, setPuntoSel] = useState<number | null>(null);
  const [editando, setEditando] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [aviso, setAviso] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const pantalla = usePantalla();

  useEffect(() => guardarEscena(escena), [escena]);

  // Recupera las imágenes y videos guardados en el navegador
  const inicial = useRef(escena);
  useEffect(() => {
    inicial.current
      .filter((s) => s.contenido.archivo)
      .forEach(async (s) => {
        const blob = await leerArchivo(s.id);
        if (blob) setUrls((u) => ({ ...u, [s.id]: URL.createObjectURL(blob) }));
      });
  }, []);

  const cambiar = useCallback((id: string, cambio: Partial<Superficie>) => {
    setEscena((e) => e.map((s) => (s.id === id ? { ...s, ...cambio } : s)));
  }, []);

  const seleccionar = (id: string) => {
    setSeleccion(id);
    setPuntoSel(null);
  };

  const agregar = () => {
    const s = nuevaSuperficie(escena.length);
    setEscena((e) => [...e, s]);
    seleccionar(s.id);
    setHerramienta("esquinas");
  };

  const duplicar = async (id: string) => {
    const original = escena.find((s) => s.id === id);
    if (!original) return;
    const desplazar = (p: Punto) => ({ x: Math.min(1, p.x + 0.03), y: Math.min(1, p.y + 0.03) });
    const copia: Superficie = {
      ...structuredClone(original),
      id: crypto.randomUUID(),
      nombre: `${original.nombre} (copia)`,
      esquinas: original.esquinas.map(desplazar) as Superficie["esquinas"],
      recorte: original.recorte?.map(desplazar) ?? null,
    };
    const blob = original.contenido.archivo ? await leerArchivo(id) : undefined;
    if (blob) {
      await guardarArchivo(copia.id, blob);
      setUrls((u) => ({ ...u, [copia.id]: URL.createObjectURL(blob) }));
    }
    setEscena((e) => [...e, copia]);
    seleccionar(copia.id);
  };

  const eliminar = (id: string) => {
    const resto = escena.filter((s) => s.id !== id);
    setEscena(resto);
    setSeleccion(resto[0]?.id ?? null);
    borrarArchivo(id);
    if (urls[id]) URL.revokeObjectURL(urls[id]);
  };

  const elegirArchivo = async (id: string, archivo: File) => {
    await guardarArchivo(id, archivo);
    setUrls((u) => {
      if (u[id]) URL.revokeObjectURL(u[id]);
      return { ...u, [id]: URL.createObjectURL(archivo) };
    });
    setEscena((e) => e.map((s) => (s.id === id ? { ...s, contenido: { ...s.contenido, archivo: archivo.name } } : s)));
  };

  const proyectar = () => {
    setEditando(false);
    setAviso(true);
    setTimeout(() => setAviso(false), 2500);
  };

  // Atajos de teclado
  const estado = useRef({ escena, seleccion, herramienta, puntoSel, pantalla, editando });
  estado.current = { escena, seleccion, herramienta, puntoSel, pantalla, editando };
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const { escena, seleccion, herramienta, puntoSel, pantalla, editando } = estado.current;
      const tecla = e.key.toLowerCase();
      if (tecla === "e") return editando ? proyectar() : setEditando(true);
      if (tecla === "escape" && !editando) return setEditando(true);
      if (tecla === "f") return void pantallaCompleta();
      if (tecla === "h") return setPanelVisible((v) => !v);
      const sel = escena.find((s) => s.id === seleccion);
      if (!editando || !sel) return;

      if ((e.key === "Delete" || e.key === "Backspace") && herramienta === "recorte" && puntoSel !== null && sel.recorte) {
        const recorte = sel.recorte.filter((_, i) => i !== puntoSel);
        cambiar(sel.id, { recorte: recorte.length ? recorte : null });
        return setPuntoSel(null);
      }
      const flechas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!flechas[e.key]) return;
      e.preventDefault();
      const paso = e.shiftKey ? 10 : 1;
      const dx = (flechas[e.key][0] * paso) / pantalla.w;
      const dy = (flechas[e.key][1] * paso) / pantalla.h;
      const mover = (p: Punto) => ({ x: Math.min(1, Math.max(0, p.x + dx)), y: Math.min(1, Math.max(0, p.y + dy)) });
      // Con un punto elegido se mueve solo ese; si no, la superficie completa
      if (puntoSel !== null && herramienta === "esquinas") {
        cambiar(sel.id, { esquinas: sel.esquinas.map((p, i) => (i === puntoSel ? mover(p) : p)) as Superficie["esquinas"] });
      } else if (puntoSel !== null && herramienta === "recorte" && sel.recorte) {
        cambiar(sel.id, { recorte: sel.recorte.map((p, i) => (i === puntoSel ? mover(p) : p)) });
      } else {
        cambiar(sel.id, { esquinas: sel.esquinas.map(mover) as Superficie["esquinas"], recorte: sel.recorte?.map(mover) ?? null });
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [cambiar]);

  return (
    <main className={editando ? "escenario editando" : "escenario proyectando"}>
      {escena
        .filter((s) => s.visible)
        .map((s) => (
          <Capa key={s.id} superficie={s} url={urls[s.id]} pantalla={pantalla} />
        ))}

      {editando && (
        <Editor
          escena={escena}
          seleccion={seleccion}
          herramienta={herramienta}
          puntoSel={puntoSel}
          pantalla={pantalla}
          onSeleccionar={seleccionar}
          onPuntoSel={setPuntoSel}
          onCambiar={cambiar}
        />
      )}

      {editando && panelVisible && (
        <Panel
          escena={escena}
          seleccion={seleccion}
          herramienta={herramienta}
          onSeleccionar={seleccionar}
          onHerramienta={(h) => {
            setHerramienta(h);
            setPuntoSel(null);
          }}
          onCambiar={cambiar}
          onAgregar={agregar}
          onDuplicar={duplicar}
          onEliminar={eliminar}
          onArchivo={elegirArchivo}
          onProyectar={proyectar}
          onPantallaCompleta={pantallaCompleta}
          onOcultar={() => setPanelVisible(false)}
        />
      )}

      {editando && !panelVisible && (
        <button className="mostrar-panel" title="Mostrar panel (H)" onClick={() => setPanelVisible(true)}>
          <PanelLeftOpen size={18} />
        </button>
      )}

      {aviso && <div className="aviso">Proyectando · pulsa E para volver a editar</div>}
    </main>
  );
}
