import { useCallback, useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { borrarArchivo, cargarEscena, guardarArchivo, guardarEscena, leerArchivo } from "./almacen";
import { Capa, type ModoVideo } from "./components/Capa";
import { Editor } from "./components/Editor";
import { LineaTiempo } from "./components/LineaTiempo";
import { Panel } from "./components/Panel";
import { clipEn, duracionTotal, opacidadFundido, tiempoEscena } from "./reproduccion";
import type { Clip, Escena, EstadoReproduccion, Herramienta, Punto, Superficie } from "./tipos";

function nuevoClip(): Clip {
  return { id: crypto.randomUUID(), contenido: { tipo: "patron", color: "#38bdf8", texto: "" }, duracion: 5, fundido: 0 };
}

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
    clips: [nuevoClip()],
    alTerminar: "repetir",
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

/** Duración real de un video, para ajustar el clip a lo que dura. */
function duracionVideo(archivo: File): Promise<number | null> {
  return new Promise((resolver) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(archivo);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolver(Number.isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : null);
    };
    v.onerror = () => resolver(null);
    v.src = url;
  });
}

export default function App() {
  const [escena, setEscena] = useState<Escena>(() => cargarEscena() ?? { superficies: [nuevaSuperficie(0)], repetir: true });
  const { superficies, repetir } = escena;
  const [seleccion, setSeleccion] = useState<string | null>(() => escena.superficies[0]?.id ?? null);
  const [clipSel, setClipSel] = useState<Record<string, string>>({});
  const [herramienta, setHerramienta] = useState<Herramienta>("esquinas");
  const [puntoSel, setPuntoSel] = useState<number | null>(null);
  const [editando, setEditando] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<EstadoReproduccion>("detenido");
  const [t, setT] = useState(0);
  const [arranque, setArranque] = useState(0);
  const pantalla = usePantalla();

  const total = duracionTotal(superficies);
  const escenaT = tiempoEscena(t, total, repetir);

  useEffect(() => guardarEscena(escena), [escena]);

  // Recupera las imágenes y videos guardados en el navegador (la clave es el id del clip)
  const inicial = useRef(escena);
  useEffect(() => {
    inicial.current.superficies
      .flatMap((s) => s.clips)
      .filter((c) => c.contenido.archivo)
      .forEach(async (c) => {
        const blob = await leerArchivo(c.id);
        if (blob) setUrls((u) => ({ ...u, [c.id]: URL.createObjectURL(blob) }));
      });
  }, []);

  // ---- Reloj de la presentación ----
  const origen = useRef(0); // performance.now() que corresponde a t = 0
  const limites = useRef({ total, repetir });
  limites.current = { total, repetir };
  useEffect(() => {
    if (estado !== "reproduciendo") return;
    // t solo se lee al arrancar: después el bucle lleva su propio origen (irA lo corrige al saltar)
    origen.current = performance.now() - t * 1000;
    let cuadro = 0;
    const avanzar = () => {
      const ahora = (performance.now() - origen.current) / 1000;
      const { total, repetir } = limites.current;
      if (!repetir && ahora >= total) {
        setT(total);
        setEstado("pausado");
        return;
      }
      setT(ahora);
      cuadro = requestAnimationFrame(avanzar);
    };
    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, arranque]);

  const reproducir = () => {
    if (!repetir && t >= total) setT(0);
    setEstado("reproduciendo");
  };
  const pausar = () => setEstado("pausado");
  const detener = () => {
    setEstado("detenido");
    setT(0);
  };
  const irA = (nuevo: number) => {
    origen.current = performance.now() - nuevo * 1000;
    setT(nuevo);
    if (estado === "detenido") setEstado("pausado");
  };

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 2500);
  };
  const proyectar = () => {
    setEditando(false);
    mostrarAviso("Proyectando · E para volver a editar");
  };
  /** Todas las superficies parten juntas desde cero, sin guías ni panel. */
  const presentar = () => {
    setT(0);
    setEstado("reproduciendo");
    setArranque((n) => n + 1);
    setEditando(false);
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    mostrarAviso("Presentando · Espacio pausa · E vuelve a editar");
  };

  // ---- Cambios en la escena ----
  const cambiar = useCallback((id: string, cambio: Partial<Superficie>) => {
    setEscena((e) => ({ ...e, superficies: e.superficies.map((s) => (s.id === id ? { ...s, ...cambio } : s)) }));
  }, []);

  const cambiarClips = (id: string, f: (clips: Clip[]) => Clip[]) =>
    setEscena((e) => ({ ...e, superficies: e.superficies.map((s) => (s.id === id ? { ...s, clips: f(s.clips) } : s)) }));

  const seleccionar = (id: string) => {
    setSeleccion(id);
    setPuntoSel(null);
  };
  const elegirClip = (superficie: string, clip: string) => {
    seleccionar(superficie);
    setClipSel((c) => ({ ...c, [superficie]: clip }));
  };

  const agregar = () => {
    const s = nuevaSuperficie(superficies.length);
    setEscena((e) => ({ ...e, superficies: [...e.superficies, s] }));
    seleccionar(s.id);
    setHerramienta("esquinas");
  };

  const copiarArchivo = async (de: string, a: string) => {
    const blob = await leerArchivo(de);
    if (!blob) return;
    await guardarArchivo(a, blob);
    setUrls((u) => ({ ...u, [a]: URL.createObjectURL(blob) }));
  };

  const duplicar = async (id: string) => {
    const original = superficies.find((s) => s.id === id);
    if (!original) return;
    const desplazar = (p: Punto) => ({ x: Math.min(1, p.x + 0.03), y: Math.min(1, p.y + 0.03) });
    const clips = original.clips.map((c) => ({ ...structuredClone(c), id: crypto.randomUUID() }));
    await Promise.all(original.clips.map((c, i) => c.contenido.archivo && copiarArchivo(c.id, clips[i].id)));
    const copia: Superficie = {
      ...structuredClone(original),
      id: crypto.randomUUID(),
      nombre: `${original.nombre} (copia)`,
      esquinas: original.esquinas.map(desplazar) as Superficie["esquinas"],
      recorte: original.recorte?.map(desplazar) ?? null,
      clips,
    };
    setEscena((e) => ({ ...e, superficies: [...e.superficies, copia] }));
    seleccionar(copia.id);
  };

  const soltarArchivo = (clip: string) => {
    borrarArchivo(clip);
    setUrls((u) => {
      if (!u[clip]) return u;
      URL.revokeObjectURL(u[clip]);
      const resto = { ...u };
      delete resto[clip];
      return resto;
    });
  };

  const eliminar = (id: string) => {
    superficies.find((s) => s.id === id)?.clips.forEach((c) => soltarArchivo(c.id));
    const resto = superficies.filter((s) => s.id !== id);
    setEscena((e) => ({ ...e, superficies: resto }));
    setSeleccion(resto[0]?.id ?? null);
  };

  const cambiarClip = (superficie: string, clip: string, cambio: Partial<Clip>) =>
    cambiarClips(superficie, (cs) => cs.map((c) => (c.id === clip ? { ...c, ...cambio } : c)));

  const agregarClip = (superficie: string) => {
    const s = superficies.find((x) => x.id === superficie);
    const actual = s?.clips.find((c) => c.id === clipSel[superficie]) ?? s?.clips[s.clips.length - 1];
    // El clip nuevo parte con el mismo tipo y color que el actual (sin archivo): armar secuencias es más rápido
    const clip: Clip = actual
      ? { ...nuevoClip(), contenido: { ...actual.contenido, archivo: undefined }, duracion: actual.duracion }
      : nuevoClip();
    cambiarClips(superficie, (cs) => [...cs, clip]);
    elegirClip(superficie, clip.id);
  };

  const eliminarClip = (superficie: string, clip: string) => {
    const s = superficies.find((x) => x.id === superficie);
    if (!s || s.clips.length <= 1) return;
    soltarArchivo(clip);
    cambiarClips(superficie, (cs) => cs.filter((c) => c.id !== clip));
  };

  const moverClip = (superficie: string, clip: string, delta: -1 | 1) =>
    cambiarClips(superficie, (cs) => {
      const i = cs.findIndex((c) => c.id === clip);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const copia = [...cs];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const elegirArchivo = async (superficie: string, clip: string, archivo: File) => {
    await guardarArchivo(clip, archivo);
    setUrls((u) => {
      if (u[clip]) URL.revokeObjectURL(u[clip]);
      return { ...u, [clip]: URL.createObjectURL(archivo) };
    });
    // Un video ajusta el clip a su duración real
    const duracion = archivo.type.startsWith("video/") ? await duracionVideo(archivo) : null;
    cambiarClips(superficie, (cs) =>
      cs.map((c) => (c.id === clip ? { ...c, contenido: { ...c.contenido, archivo: archivo.name }, ...(duracion ? { duracion } : {}) } : c)),
    );
  };

  // ---- Atajos de teclado ----
  const vivo = useRef({ superficies, seleccion, herramienta, puntoSel, pantalla, editando, estado, reproducir, pausar, presentar, detener, proyectar });
  vivo.current = { superficies, seleccion, herramienta, puntoSel, pantalla, editando, estado, reproducir, pausar, presentar, detener, proyectar };
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const v = vivo.current;
      const tecla = e.key.toLowerCase();
      if (tecla === " ") {
        e.preventDefault();
        return v.estado === "reproduciendo" ? v.pausar() : v.reproducir();
      }
      if (tecla === "p") return v.presentar();
      if (e.key === "Home") return v.detener();
      if (tecla === "e") return v.editando ? v.proyectar() : setEditando(true);
      if (tecla === "escape" && !v.editando) return setEditando(true);
      if (tecla === "f") return void pantallaCompleta();
      if (tecla === "h") return setPanelVisible((x) => !x);
      const sel = v.superficies.find((s) => s.id === v.seleccion);
      if (!v.editando || !sel) return;

      if ((e.key === "Delete" || e.key === "Backspace") && v.herramienta === "recorte" && v.puntoSel !== null && sel.recorte) {
        const recorte = sel.recorte.filter((_, i) => i !== v.puntoSel);
        cambiar(sel.id, { recorte: recorte.length ? recorte : null });
        return setPuntoSel(null);
      }
      const flechas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!flechas[e.key]) return;
      e.preventDefault();
      const paso = e.shiftKey ? 10 : 1;
      const dx = (flechas[e.key][0] * paso) / v.pantalla.w;
      const dy = (flechas[e.key][1] * paso) / v.pantalla.h;
      const mover = (p: Punto) => ({ x: Math.min(1, Math.max(0, p.x + dx)), y: Math.min(1, Math.max(0, p.y + dy)) });
      // Con un punto elegido se mueve solo ese; si no, la superficie completa
      if (v.puntoSel !== null && v.herramienta === "esquinas") {
        cambiar(sel.id, { esquinas: sel.esquinas.map((p, i) => (i === v.puntoSel ? mover(p) : p)) as Superficie["esquinas"] });
      } else if (v.puntoSel !== null && v.herramienta === "recorte" && sel.recorte) {
        cambiar(sel.id, { recorte: sel.recorte.map((p, i) => (i === v.puntoSel ? mover(p) : p)) });
      } else {
        cambiar(sel.id, { esquinas: sel.esquinas.map(mover) as Superficie["esquinas"], recorte: sel.recorte?.map(mover) ?? null });
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [cambiar]);

  // ---- Qué muestra cada superficie ahora ----
  const modo: ModoVideo = estado === "detenido" ? "libre" : estado;
  const capas = superficies
    .filter((s) => s.visible)
    .map((s) => {
      if (estado === "detenido") {
        // Sin reproducir se ve el clip que estás editando
        const clip = s.clips.find((c) => c.id === clipSel[s.id]) ?? s.clips[0];
        return { s, clip, fundido: 1, vuelta: "0", local: 0 };
      }
      const activo = clipEn(s, escenaT.t);
      if (!activo) return null;
      return { s, clip: activo.clip, fundido: opacidadFundido(activo), vuelta: `${escenaT.vuelta}-${activo.vuelta}`, local: activo.local };
    })
    .filter((c) => c !== null);

  return (
    <main className={editando ? "escenario editando" : "escenario proyectando"}>
      {capas.map(({ s, clip, fundido, vuelta, local }) => (
        <Capa key={s.id} superficie={s} clip={clip} url={urls[clip.id]} pantalla={pantalla} fundido={fundido} vuelta={vuelta} modo={modo} local={local} />
      ))}

      {editando && (
        <Editor
          escena={superficies}
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
        <>
          <Panel
            superficies={superficies}
            seleccion={seleccion}
            clipSel={seleccion ? (clipSel[seleccion] ?? null) : null}
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
            onElegirClip={elegirClip}
            onCambiarClip={cambiarClip}
            onAgregarClip={agregarClip}
            onEliminarClip={eliminarClip}
            onMoverClip={moverClip}
            onArchivo={elegirArchivo}
            onProyectar={proyectar}
            onPantallaCompleta={pantallaCompleta}
            onOcultar={() => setPanelVisible(false)}
          />
          <LineaTiempo
            superficies={superficies}
            seleccion={seleccion}
            clipSel={clipSel}
            estado={estado}
            tiempo={escenaT.t}
            total={total}
            repetir={repetir}
            panelVisible={panelVisible}
            onReproducir={reproducir}
            onPausar={pausar}
            onDetener={detener}
            onIrA={irA}
            onRepetir={(v) => setEscena((e) => ({ ...e, repetir: v }))}
            onPresentar={presentar}
            onElegirClip={elegirClip}
          />
        </>
      )}

      {editando && !panelVisible && (
        <button className="mostrar-panel" title="Mostrar panel (H)" onClick={() => setPanelVisible(true)}>
          <PanelLeftOpen size={18} />
        </button>
      )}

      {aviso && <div className="aviso">{aviso}</div>}
    </main>
  );
}
