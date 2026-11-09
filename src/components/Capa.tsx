import { useEffect, useRef } from "react";
import { matriz3d } from "../homografia";
import type { Clip, Superficie } from "../tipos";

// Tamaño interno del lienzo: el contenido se dibuja a esta resolución y luego se deforma hacia las esquinas.
export const ANCHO = 1280;
export const ALTO = 720;

/** libre: edición sin reproducir (los videos corren en bucle). En reproducción/pausa los videos siguen al reloj. */
export type ModoVideo = "libre" | "reproduciendo" | "pausado";

interface Props {
  superficie: Superficie;
  clip: Clip;
  url?: string;
  pantalla: { w: number; h: number };
  /** Multiplica el brillo de la superficie (fundidos). */
  fundido: number;
  /** Cambia cuando el clip vuelve a empezar: reinicia videos. */
  vuelta: string;
  modo: ModoVideo;
  /** Segundos dentro del clip, para sincronizar videos al pausar o saltar. */
  local: number;
}

export function Capa({ superficie: s, clip, url, pantalla, fundido, vuelta, modo, local }: Props) {
  const px = (p: { x: number; y: number }) => ({ x: p.x * pantalla.w, y: p.y * pantalla.h });
  const recorte =
    s.recorte && s.recorte.length >= 3
      ? `polygon(${s.recorte.map((p) => `${p.x * pantalla.w}px ${p.y * pantalla.h}px`).join(",")})`
      : undefined;

  return (
    <div className="capa" style={{ clipPath: recorte, opacity: s.opacidad * fundido }}>
      <div className="lienzo" style={{ width: ANCHO, height: ALTO, transform: matriz3d(ANCHO, ALTO, s.esquinas.map(px)) }}>
        <Contenido key={`${clip.id}-${vuelta}`} nombre={s.nombre} clip={clip} url={url} modo={modo} local={local} />
      </div>
    </div>
  );
}

interface PropsContenido {
  nombre: string;
  clip: Clip;
  url?: string;
  modo: ModoVideo;
  local: number;
}

function Contenido({ nombre, clip, url, modo, local }: PropsContenido) {
  const { tipo, color, texto } = clip.contenido;
  switch (tipo) {
    case "color":
      return <div className="relleno" style={{ background: color }} />;
    case "animacion":
      return <div className="relleno animacion" style={{ ["--base" as string]: color }} />;
    case "texto":
      return (
        <div className="relleno texto" style={{ color }}>
          {texto || "Texto"}
        </div>
      );
    case "imagen":
      return url ? <img className="relleno medio" src={url} alt="" draggable={false} /> : <SinArchivo />;
    case "video":
      return url ? <VideoSincronizado url={url} modo={modo} local={local} /> : <SinArchivo />;
    default:
      return <Patron nombre={nombre} color={color} />;
  }
}

function VideoSincronizado({ url, modo, local }: { url: string; modo: ModoVideo; local: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (modo === "pausado") v.pause();
    else v.play().catch(() => {});
  }, [modo]);
  // En pausa el reloj manda: al mover el cabezal, el video salta al cuadro correspondiente
  useEffect(() => {
    const v = ref.current;
    if (!v || modo !== "pausado" || !v.duration) return;
    const objetivo = local % v.duration;
    if (Math.abs(v.currentTime - objetivo) > 0.05) v.currentTime = objetivo;
  }, [modo, local]);
  return <video ref={ref} className="relleno medio" src={url} autoPlay={modo !== "pausado"} loop muted playsInline />;
}

function SinArchivo() {
  return <div className="relleno sin-archivo">Elige un archivo en el panel</div>;
}

/** Cuadrícula de calibración: ayuda a ver si las líneas quedan rectas sobre el objeto. */
function Patron({ nombre, color }: { nombre: string; color: string }) {
  const lineas = [];
  for (let x = 0; x <= ANCHO; x += 80) lineas.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={ALTO} />);
  for (let y = 0; y <= ALTO; y += 80) lineas.push(<line key={`y${y}`} x1={0} y1={y} x2={ANCHO} y2={y} />);
  return (
    <svg className="relleno" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none">
      <rect width={ANCHO} height={ALTO} fill="#0b0d12" />
      <g stroke={color} strokeOpacity={0.55} strokeWidth={2}>{lineas}</g>
      <rect x={4} y={4} width={ANCHO - 8} height={ALTO - 8} fill="none" stroke={color} strokeWidth={8} />
      <line x1={0} y1={0} x2={ANCHO} y2={ALTO} stroke={color} strokeWidth={3} />
      <line x1={ANCHO} y1={0} x2={0} y2={ALTO} stroke={color} strokeWidth={3} />
      <circle cx={ANCHO / 2} cy={ALTO / 2} r={220} fill="none" stroke={color} strokeWidth={4} />
      <text x={ANCHO / 2} y={ALTO / 2 + 22} fill="#f8fafc" fontSize={64} fontFamily="system-ui" textAnchor="middle" fontWeight={700}>
        {nombre}
      </text>
    </svg>
  );
}
