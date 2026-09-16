"use client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8089/gestiondestock";

export const TOKEN_KEY = "stockflow_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: number;
  errors?: string[];

  constructor(status: number, message: string, code?: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    let code: number | undefined;
    let errors: string[] | undefined;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      if (body?.code) code = body.code;
      if (body?.errors?.length) errors = body.errors;
    } catch {
      /* corps non JSON */
    }
    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(res.status, message, code, errors);
  }
  return res.json() as Promise<T>;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = options.token !== undefined ? options.token : getToken();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

/** Upload un fichier multipart avec le token JWT et renvoie la réponse JSON. */
export async function uploadFile<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handle<T>(res);
}

/** URL absolue d'une photo servie par le backend (ex. /photos/xxx.jpg). */
export function photoUrl(photo?: string | null): string | undefined {
  if (!photo) return undefined;
  return photo.startsWith("http")
    ? photo
    : `${API_BASE.replace(/\/gestiondestock$/, "")}${photo}`;
}

/** Télécharge un fichier (PDF/Excel/CSV) avec le token JWT dans l'en-tête. */
export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    await handle<never>(res);
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { API_BASE };
