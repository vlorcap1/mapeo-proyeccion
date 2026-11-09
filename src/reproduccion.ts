import type { Clip, Superficie } from "./tipos";

export const duracionSuperficie = (s: Superficie) => s.clips.reduce((suma, c) => suma + c.duracion, 0);

/** La presentación dura lo que dura la superficie visible más larga. */
export const duracionTotal = (superficies: Superficie[]) =>
  Math.max(0, ...superficies.filter((s) => s.visible).map(duracionSuperficie));

/** Tiempo dentro de la presentación y número de vuelta, aplicando la repetición global. */
export function tiempoEscena(t: number, total: number, repetir: boolean) {
  if (total <= 0) return { t: 0, vuelta: 0 };
  if (repetir) return { t: t % total, vuelta: Math.floor(t / total) };
  return { t: Math.min(t, total), vuelta: 0 };
}

export interface ClipActivo {
  clip: Clip;
  indice: number;
  /** Segundos transcurridos dentro del clip. */
  local: number;
  /** Vuelta de la superficie (cambia cuando se repite sola): sirve para reiniciar videos. */
  vuelta: number;
}

/** Qué clip muestra una superficie en el segundo t de la presentación. null = apagada. */
export function clipEn(s: Superficie, t: number): ClipActivo | null {
  const dur = duracionSuperficie(s);
  if (dur <= 0) return null;
  let local = t;
  let vuelta = 0;
  if (t >= dur) {
    if (s.alTerminar === "apagar") return null;
    if (s.alTerminar === "mantener") {
      const indice = s.clips.length - 1;
      return { clip: s.clips[indice], indice, local: s.clips[indice].duracion, vuelta: 0 };
    }
    vuelta = Math.floor(t / dur);
    local = t - vuelta * dur;
  }
  let acumulado = 0;
  for (let i = 0; i < s.clips.length; i++) {
    const clip = s.clips[i];
    if (local < acumulado + clip.duracion) return { clip, indice: i, local: local - acumulado, vuelta };
    acumulado += clip.duracion;
  }
  const indice = s.clips.length - 1;
  return { clip: s.clips[indice], indice, local: s.clips[indice].duracion, vuelta };
}

/** Opacidad del fundido de entrada del clip. */
export const opacidadFundido = (a: ClipActivo) => (a.clip.fundido > 0 ? Math.min(1, a.local / a.clip.fundido) : 1);

export function formatoTiempo(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
