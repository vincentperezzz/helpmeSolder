import { z } from "zod";

const baseUrl = () =>
  process.env.HELPMESOLDER_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function authHeaders(): HeadersInit {
  const key = process.env.MCP_API_KEY;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (key) {
    headers.authorization = `Bearer ${key}`;
  }
  return headers;
}

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `API ${response.status} ${path}: ${typeof body === "object" ? JSON.stringify(body) : text}`,
    );
  }

  return body as T;
}

export const createGuideInput = z.object({
  title: z.string().optional(),
  board_id: z.string().optional(),
});

export async function createGuide(input: z.infer<typeof createGuideInput>) {
  return api<{ guide: unknown; validation: unknown; url: string }>("/api/guides", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getGuide(id: string) {
  return api<{ guide: unknown; validation: unknown }>(`/api/guides/${id}`);
}

export async function listCatalog() {
  return api<unknown>("/api/catalog");
}

export async function validateGuide(id: string) {
  return api<{ guideId: string; validation: unknown; blocked: boolean }>(
    `/api/guides/${id}/validate`,
    { method: "POST", body: "{}" },
  );
}

export const setPowerInput = z.object({
  guide_id: z.string(),
  power_source: z.enum(["battery", "usb_wall"]),
});

export async function setPowerSource(input: z.infer<typeof setPowerInput>) {
  return api(`/api/guides/${input.guide_id}/power`, {
    method: "PUT",
    body: JSON.stringify({ power_source: input.power_source }),
  });
}

export const addPartInput = z.object({
  guide_id: z.string(),
  instanceId: z.string(),
  catalogId: z.string(),
  label: z.string().optional(),
});

export async function addPart(input: z.infer<typeof addPartInput>) {
  const current = await getGuide(input.guide_id);
  const guide = current.guide as {
    parts: Array<{ instanceId: string; catalogId: string; label?: string }>;
  };
  const parts = [
    ...guide.parts.filter((part) => part.instanceId !== input.instanceId),
    {
      instanceId: input.instanceId,
      catalogId: input.catalogId,
      label: input.label,
    },
  ];
  return api(`/api/guides/${input.guide_id}`, {
    method: "PATCH",
    body: JSON.stringify({ parts }),
  });
}

export const addConnectionInput = z.object({
  guide_id: z.string(),
  id: z.string(),
  from: z.object({ instanceId: z.string(), pinId: z.string() }),
  to: z.object({ instanceId: z.string(), pinId: z.string() }),
  note: z.string().optional(),
});

export async function addConnection(input: z.infer<typeof addConnectionInput>) {
  const current = await getGuide(input.guide_id);
  const guide = current.guide as {
    connections: Array<{
      id: string;
      from: { instanceId: string; pinId: string };
      to: { instanceId: string; pinId: string };
      note?: string;
    }>;
  };
  const connections = [
    ...guide.connections.filter((connection) => connection.id !== input.id),
    {
      id: input.id,
      from: input.from,
      to: input.to,
      note: input.note,
    },
  ];
  return api(`/api/guides/${input.guide_id}`, {
    method: "PATCH",
    body: JSON.stringify({ connections }),
  });
}

export const setStepsInput = z.object({
  guide_id: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      order: z.number().int(),
    }),
  ),
  notes: z.array(z.string()).optional(),
});

export async function setSteps(input: z.infer<typeof setStepsInput>) {
  return api(`/api/guides/${input.guide_id}`, {
    method: "PATCH",
    body: JSON.stringify({
      steps: input.steps,
      notes: input.notes,
    }),
  });
}
