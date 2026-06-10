/**
 * lib/api.ts — Cliente tipado para a API FastAPI (via proxy Next.js /api/*)
 *
 * Todas as chamadas usam /api/* que o next.config.js redireciona para
 * http://localhost:8000/*. O frontend nunca precisa conhecer a porta da API.
 */

const BASE = "/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SessaoCriada {
  session_id: string;
  criada_em: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  agente_pronto: boolean;
  total_tools: number;
  versao: string;
}

export interface MensagemHistorico {
  papel: "user" | "assistant" | "tool";
  conteudo: string;
  timestamp: string;
}

export interface HistoricoResponse {
  session_id: string;
  mensagens: MensagemHistorico[];
}

// ── Funções ───────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("API indisponível");
  return res.json();
}

export async function criarSessao(): Promise<SessaoCriada> {
  const res = await fetch(`${BASE}/sessoes`, { method: "POST" });
  if (!res.ok) throw new Error("Falha ao criar sessão");
  return res.json();
}

export async function deletarSessao(sessionId: string): Promise<void> {
  await fetch(`${BASE}/sessoes/${sessionId}`, { method: "DELETE" });
}

export async function fetchHistorico(
  sessionId: string
): Promise<HistoricoResponse> {
  const res = await fetch(`${BASE}/sessoes/${sessionId}/historico`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Falha ao buscar histórico");
  return res.json();
}