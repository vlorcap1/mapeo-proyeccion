import type { Superficie } from "./tipos";

// La escena se guarda en este navegador: posiciones en localStorage, imágenes y videos en IndexedDB.
const CLAVE = "mapeo:escena:v1";

export function cargarEscena(): Superficie[] | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    return texto ? (JSON.parse(texto) as Superficie[]) : null;
  } catch {
    return null;
  }
}

export function guardarEscena(escena: Superficie[]) {
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
