export type ArtifactRef = { artifact_id: string; revision: number };
export type JobSnapshot = {
  job_id: string;
  project_id: string;
  status: "queued" | "running" | "script_ready" | "failed" | "interrupted";
  current_stage: "knowledge" | "script" | "animation" | null;
  stages: Record<"knowledge" | "script" | "animation", string>;
  message: string;
  project_revision: number;
  artifacts: Record<string, ArtifactRef>;
  error_code: string | null;
};
export type ProductionScriptSummary = {
  core_message: string;
  total_duration_ms: number;
  scenes: { scene_id: string; objective: string }[];
};

export class ApiClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(
      "temporarily_unavailable",
      "暂时无法连接本地创作服务，请检查服务是否启动。",
    );
  }
  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!response.ok) {
    const error = body?.error as Record<string, unknown> | undefined;
    throw new ApiClientError(
      typeof error?.code === "string" ? error.code : "failed",
      typeof error?.message === "string"
        ? error.message
        : "这一步暂时没有完成，请稍后重试。",
    );
  }
  return body as T;
}

export async function testModelConnection(
  apiKey: string,
  signal: AbortSignal,
): Promise<boolean> {
  const result = await request<{ connected: boolean }>("/api/model/test", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey }),
    signal,
  });
  return result.connected;
}

export function createProject(userInput: Record<string, unknown>) {
  return request<{
    project_id: string;
    project_revision: number;
    project: { project_id: string; revision: number };
  }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ user_input: userInput }),
  });
}

export function startScriptJob(
  projectId: string,
  apiKey: string,
  regenerate = false,
) {
  return request<{ job_id: string; status: "queued" | "running" }>(
    `/api/projects/${encodeURIComponent(projectId)}/jobs`,
    {
      method: "POST",
      body: JSON.stringify({ target: "script", api_key: apiKey, regenerate }),
    },
  );
}

export function getJob(jobId: string) {
  return request<JobSnapshot>(`/api/jobs/${encodeURIComponent(jobId)}`);
}

export function getProductionScript(
  projectId: string,
  ref: ArtifactRef,
) {
  const query = new URLSearchParams({
    artifact_id: ref.artifact_id,
    revision: String(ref.revision),
  });
  return request<ProductionScriptSummary>(
    `/api/projects/${encodeURIComponent(projectId)}/production-script?${query}`,
  );
}
