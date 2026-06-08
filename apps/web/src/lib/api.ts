// Typed fetch wrapper to the FastAPI backend. Mirrors only what the UI needs;
// the authoritative response shapes are the Genblaze Run / Manifest models the
// API returns directly (see services/api/app/main.py).

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  // status 0 == network failure (API unreachable), used by ErrorState copy.
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "Network error: could not reach the API.");
  }
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      detail = body?.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(resp.status, detail);
  }
  return resp.json() as Promise<T>;
}

// --- Genblaze model shapes (subset the UI reads) ---

export interface Asset {
  url: string;
  modality: string;
  sha256?: string | null;
}

export interface Step {
  step_id: string;
  provider: string;
  model: string;
  status: string;
  assets: Asset[];
}

export interface Run {
  run_id: string;
  status: string;
  parent_run_id?: string | null;
  steps: Step[];
}

export interface Manifest {
  canonical_hash: string;
}

export interface StoryboardResponse {
  run: Run;
  manifest: Manifest;
}

// --- Calls ---

export function createStoryboard(idea: string, panelCount: number) {
  return request<StoryboardResponse>("/storyboards", {
    method: "POST",
    body: JSON.stringify({ idea, panel_count: panelCount }),
  });
}

export function regeneratePanel(parentRunId: string, panelPrompt: string) {
  return request<StoryboardResponse>("/storyboards/variants", {
    method: "POST",
    body: JSON.stringify({
      parent_run_id: parentRunId,
      panel_prompt: panelPrompt,
    }),
  });
}

// Strip export returns a PNG blob, not JSON.
export async function exportStrip(panelUrls: string[]): Promise<Blob> {
  const resp = await fetch(`${API_BASE}/strip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ panel_urls: panelUrls }),
  });
  if (!resp.ok) throw new ApiError(resp.status, "Strip export failed.");
  return resp.blob();
}
