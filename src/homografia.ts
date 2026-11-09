import type { Punto } from "./tipos";

// Transformación proyectiva que lleva un rectángulo de ancho×alto a cuatro puntos cualquiera,
// expresada como matrix3d de CSS. Así cualquier contenido (imagen, video, texto) se deforma con aceleración del navegador.

type M3 = number[];

const adj = (m: M3): M3 => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];

const mul = (a: M3, b: M3): M3 => {
  const c: M3 = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) c[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  return c;
};

const mulVec = (m: M3, v: number[]) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** Matriz que lleva la base canónica a los puntos p0, p1, p2 con p3 como cuarto punto. */
function base(p: Punto[]): M3 {
  const m = [p[0].x, p[1].x, p[2].x, p[0].y, p[1].y, p[2].y, 1, 1, 1];
  const v = mulVec(adj(m), [p[3].x, p[3].y, 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/** esquinas en píxeles, en orden sup-izq, sup-der, inf-der, inf-izq. */
export function matriz3d(ancho: number, alto: number, esquinas: Punto[]): string {
  const [si, sd, id, ii] = esquinas;
  const origen = [{ x: 0, y: 0 }, { x: ancho, y: 0 }, { x: 0, y: alto }, { x: ancho, y: alto }];
  const destino = [si, sd, ii, id];
  const t = mul(base(destino), adj(base(origen)));
  const n = t.map((v) => v / t[8]);
  return `matrix3d(${[n[0], n[3], 0, n[6], n[1], n[4], 0, n[7], 0, 0, 1, 0, n[2], n[5], 0, n[8]].join(",")})`;
}
