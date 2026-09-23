import type { SocialDataPayload, SocialDataResult } from "@/lib/types";

function isPayload(value: unknown): value is SocialDataPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SocialDataPayload>;
  return payload.ok === true && Array.isArray(payload.sessionsDaily) && Array.isArray(payload.paidDaily);
}

export async function loadSocialData(): Promise<SocialDataResult> {
  const url = process.env.SOCIAL_DATA_API_URL;
  const token = process.env.SOCIAL_DATA_API_TOKEN;

  if (!url || !token) {
    return { status: "unconfigured", message: "A fonte de tráfego ainda não foi configurada neste ambiente." };
  }

  try {
    const endpoint = new URL(url);
    endpoint.searchParams.set("token", token);
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload: unknown = await response.json();
    if (!response.ok || !isPayload(payload)) {
      return { status: "error", message: "A fonte respondeu, mas os dados não passaram pela validação." };
    }
    return { status: "ready", data: payload };
  } catch {
    return { status: "error", message: "Não foi possível consultar a fonte de tráfego agora." };
  }
}
