/** Coordenadas en fracción de la pantalla (0 a 1): el mapeo se mantiene al cambiar de resolución o entrar a pantalla completa. */
export interface Punto {
  x: number;
  y: number;
}

export type TipoContenido = "patron" | "color" | "animacion" | "texto" | "imagen" | "video";

export interface Contenido {
  tipo: TipoContenido;
  color: string;
  texto: string;
  /** Nombre del archivo guardado en el navegador (imagen o video). */
  archivo?: string;
}

/** Un tramo de la línea de tiempo de una superficie. Su id es también la clave del archivo en IndexedDB. */
export interface Clip {
  id: string;
  contenido: Contenido;
  /** Segundos que dura el clip. */
  duracion: number;
  /** Segundos de fundido desde negro al empezar (0 = corte directo). */
  fundido: number;
}

/** Qué hace la superficie cuando su línea de tiempo termina antes que la presentación. */
export type AlTerminar = "repetir" | "mantener" | "apagar";

export interface Superficie {
  id: string;
  nombre: string;
  /** Esquinas donde se estira el contenido: superior izquierda, superior derecha, inferior derecha, inferior izquierda. */
  esquinas: [Punto, Punto, Punto, Punto];
  /** Forma libre que recorta la luz. null = sin recorte (se ve todo el cuadrilátero). */
  recorte: Punto[] | null;
  /** Línea de tiempo: siempre al menos un clip. */
  clips: Clip[];
  alTerminar: AlTerminar;
  visible: boolean;
  opacidad: number;
}

export interface Escena {
  superficies: Superficie[];
  /** Al terminar la superficie más larga, todas vuelven a partir juntas. */
  repetir: boolean;
}

export type Herramienta = "esquinas" | "recorte";

export type EstadoReproduccion = "detenido" | "reproduciendo" | "pausado";
