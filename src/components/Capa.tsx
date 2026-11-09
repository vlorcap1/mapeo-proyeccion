import { matriz3d } from "../homografia";
import type { Superficie } from "../tipos";

// Tamaño interno del lienzo: el contenido se dibuja a esta resolución y luego se deforma hacia las esquinas.
export const ANCHO = 1280;
export const ALTO = 720;

interface Props {
  superficie: Superficie;
  url?: string;
  pantalla: { w: number; h: number };
}

export function Capa({ superficie: s, url, pantalla }: Props) {
  const px = (p: { x: number; y: number }) => ({ x: p.x * pantalla.w, y: p.y * pantalla.h });
  const recorte =
    s.recorte && s.recorte.length >= 3
      ? `polygon(${s.recorte.map((p) => `${p.x * pantalla.w}px ${p.y * pantalla.h}px`).join(",")})`
      : undefined;

  return (
    <div className="capa" style={{ clipPath: recorte, opacity: s.opacidad }}>
      <div className="lienzo" style={{ width: ANCHO, height: ALTO, transform: matriz3d(ANCHO, ALTO, s.esquinas.map(px)) }}>
        <Contenido superficie={s} url={url} />
      </div>
    </div>
  );
}

function Contenido({ superficie: s, url }: { superficie: Superficie; url?: string }) {
  const { tipo, color, texto } = s.contenido;
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
      return url ? <video className="relleno medio" src={url} autoPlay loop muted playsInline /> : <SinArchivo />;
    default:
      return <Patron nombre={s.nombre} color={color} />;
  }
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
