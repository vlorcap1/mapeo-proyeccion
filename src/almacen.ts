import type { Escena, Superficie } from "./tipos";

// La escena se guarda en este navegador: posiciones y líneas de tiempo en localStorage, imágenes y videos en IndexedDB.
const CLAVE = "mapeo:escena:v2";
const CLAVE_V1 = "mapeo:escena:v1";

type SuperficieV1 = Omit<Superficie, "clips" | "alTerminar"> & { contenido: Superficie["clips"][number]["contenido"] };

export function cargarEscena(): Escena | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (texto) return JSON.parse(texto) as Escena;
    // Versión anterior (un contenido por superficie): pasa a ser el primer clip, con el mismo id para conservar su archivo
    const v1 = localStorage.getItem(CLAVE_V1);
    if (!v1) return null;
    const superficies = (JSON.parse(v1) as SuperficieV1[]).map(({ contenido, ...s }) => ({
      ...s,
      clips: [{ id: s.id, contenido, duracion: 10, fundido: 0 }],
      alTerminar: "repetir" as const,
    }));
    return { superficies, repetir: true };
  } catch {
    return null;
  }
}

export function guardarEscena(escena: Escena) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(escena));
  } catch {
    /* sin almacenamiento disponible: la escena vive solo en esta sesión */
  }
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open("mapeo", 1);
    solicitud.onupgradeneeded = () => solicitud.result.createObjectStore("archivos");
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, accion: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  try {
    const db = await abrir();
    return await new Promise<T>((resolver, rechazar) => {
      const solicitud = accion(db.transaction("archivos", modo).objectStore("archivos"));
      solicitud.onsuccess = () => resolver(solicitud.result as T);
      solicitud.onerror = () => rechazar(solicitud.error);
    });
  } catch {
    return undefined;
  }
}

export const guardarArchivo = (id: string, archivo: Blob) => operar("readwrite", (s) => s.put(archivo, id));
export const leerArchivo = (id: string) => operar<Blob>("readonly", (s) => s.get(id));
export const borrarArchivo = (id: string) => operar("readwrite", (s) => s.delete(id));
