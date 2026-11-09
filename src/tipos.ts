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

export interface Superficie {
  id: string;
  nombre: string;
  /** Esquinas donde se estira el contenido: superior izquierda, superior derecha, inferior derecha, inferior izquierda. */
  esquinas: [Punto, Punto, Punto, Punto];
  /** Forma libre que recorta la luz. null = sin recorte (se ve todo el cuadrilátero). */
  recorte: Punto[] | null;
  contenido: Contenido;
  visible: boolean;
  opacidad: number;
}

export type Herramienta = "esquinas" | "recorte";
