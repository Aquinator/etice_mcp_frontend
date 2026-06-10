"use client";

import { useEffect, useState } from "react";
import { FileText, Building2, Users, Activity, ChevronRight, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import ChatPanel from "@/components/ChatPanel";
import { fetchHealth, type HealthResponse } from "@/lib/api";

interface ModalidadeItem { modalidade: string; quantidade: number; valor_total: number; valor_medio: number; }
interface DashboardData  { totalContratos: number; valorGlobal: number; totalEmpresas: number; totalGestores: number; porModalidade: ModalidadeItem[]; }

function formatBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1).replace(".",",")}M`;
  if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(0)}K`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BAR_COLORS = ["#d4a843","#3b82f6","#10b981","#f43f5e"];

function ModalidadeBar({ modalidade, quantidade, valor_total, maxValor, index }:
  ModalidadeItem & { maxValor: number; index: number }) {
  const pct = maxValor > 0 ? (valor_total / maxValor) * 100 : 0;
  const cor  = BAR_COLORS[index % BAR_COLORS.length];
  return (
    <div className="anim-fade-up" style={{ animationDelay: `${300 + index * 80}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".375rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor, display: "inline-block" }} />
          <span style={{ fontSize: ".875rem", color: "#cbd5e1" }}>{modalidade}</span>
          <span style={{ fontSize: ".7rem", color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.04)", padding: "1px 6px", borderRadius: 999 }}>{quantidade}</span>
        </div>
        <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,.4)", fontVariantNumeric: "tabular-nums" }}>{formatBRL(valor_total)}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: cor, borderRadius: 999, transition: "width .7s ease", transitionDelay: `${400 + index * 80}ms` }} />
      </div>
    </div>
  );
}

async function lerStream(sessionId: string, mensagem: string): Promise<string> {
  const res = await fetch(`/api/sessoes/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensagem }),
  });
  if (!res.ok || !res.body) return "";
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let texto = "", evt = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
      if (linha.startsWith("event: ")) evt = linha.slice(7).trim();
      else if (linha.startsWith("data: ") && evt === "token") {
        try { texto += JSON.parse(linha.slice(6)); } catch { texto += linha.slice(6); }
      }
    }
  }
  return texto;
}

async function sessaoTemporaria(fn: (id: string) => Promise<string>): Promise<string> {
  const res = await fetch("/api/sessoes", { method: "POST" });
  if (!res.ok) return "";
  const { session_id } = await res.json();
  const resultado = await fn(session_id);
  await fetch(`/api/sessoes/${session_id}`, { method: "DELETE" });
  return resultado;
}

export default function Dashboard() {
  const [health, setHealth]   = useState<HealthResponse | null>(null);
  const [dados,  setDados]    = useState<DashboardData | null>(null);
  const [erroApi, setErroApi] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setErroApi(true));
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [statsRaw, empRaw, gestRaw] = await Promise.all([
        sessaoTemporaria(id => lerStream(id,
          'Use a tool estatisticas_contratos e retorne SOMENTE JSON sem markdown: {"totalContratos":N,"valorGlobal":N,"porModalidade":[{"modalidade":"X","quantidade":N,"valor_total":N,"valor_medio":N}]}'
        )),
        sessaoTemporaria(id => lerStream(id,
          "Use a tool listar_empresas e responda SOMENTE com o número inteiro de empresas listadas."
        )),
        sessaoTemporaria(id => lerStream(id,
          "Use a tool listar_gerentes e responda SOMENTE com o número inteiro de gestores listados."
        )),
      ]);

      const match = statsRaw.match(/\{[\s\S]*\}/);
      if (!match) return;
      const parsed = JSON.parse(match[0]);

      const toNum = (s: string) => { const n = parseInt(s.replace(/\D/g,""),10); return isNaN(n) ? 0 : n; };

      setDados({
        totalContratos: parsed.totalContratos ?? 0,
        valorGlobal:    parsed.valorGlobal    ?? 0,
        totalEmpresas:  toNum(empRaw),
        totalGestores:  toNum(gestRaw),
        porModalidade:  parsed.porModalidade  ?? [],
      });
    } catch { /* dashboard fica sem dados, chat continua */ }
  }

  const maxValor = dados?.porModalidade.reduce((a,b) => Math.max(a, b.valor_total), 0) ?? 0;

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="bg-grid" style={{ minHeight: "100vh", backgroundColor: "#04080f", backgroundSize: "40px 40px", position: "relative" }}>

      {/* Glows de fundo */}
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg,rgba(13,28,46,.5) 0%,transparent 40%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 0, left: "25%", width: 384, height: 384, background: "rgba(212,168,67,.04)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 80, right: "25%", width: 256, height: 256, background: "rgba(59,130,246,.04)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1400, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <header className="anim-fade-up" style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ fontSize: ".65rem", color: "#d4a843", textTransform: "uppercase", letterSpacing: ".3em", fontWeight: 500, marginBottom: ".5rem" }}>
                Governo do Estado do Ceará
              </p>
              <h1 className="font-display" style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0 }}>
                Contratos de <span className="text-gold-shimmer">Nuvem</span>
              </h1>
              <p style={{ fontSize: ".875rem", color: "rgba(255,255,255,.35)", marginTop: ".5rem" }}>
                Painel de gestão · ETICE — Empresa de Tecnologia da Informação do Ceará
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".5rem" }}>
              {erroApi ? (
                <div className="badge badge-error">
                  <AlertTriangle size={12} strokeWidth={1.5} />
                  API offline
                </div>
              ) : health ? (
                <div className="badge badge-ok">
                  <span className="anim-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  {health.total_tools} tools · v{health.versao}
                </div>
              ) : (
                <div className="badge badge-warn">
                  <span className="anim-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#facc15", display: "inline-block" }} />
                  Conectando…
                </div>
              )}
              <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,.2)" }}>{hoje}</p>
            </div>
          </div>

          <div className="divider" />
        </header>

        {/* ── Layout: dashboard | chat ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "1.5rem", alignItems: "start" }}>

          {/* Coluna esquerda */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
              <StatCard label="Total de Contratos" value={dados ? String(dados.totalContratos) : "—"} sub="contratos cadastrados"   icon={FileText}   delay={100} iconBg="rgba(212,168,67,.1)" iconColor="#e8c96a" />
              <StatCard label="Valor Global"        value={dados ? formatBRL(dados.valorGlobal) : "—"} sub="investimento total"    icon={Activity}   delay={200} iconBg="rgba(59,130,246,.1)" iconColor="#60a5fa" />
              <StatCard label="Fornecedores"        value={dados ? String(dados.totalEmpresas)  : "—"} sub="empresas contratadas"  icon={Building2}  delay={300} iconBg="rgba(16,185,129,.1)" iconColor="#34d399" />
              <StatCard label="Gestores"            value={dados ? String(dados.totalGestores)  : "—"} sub="responsáveis ativos"   icon={Users}      delay={400} iconBg="rgba(244,63,94,.1)"  iconColor="#fb7185" />
            </div>

            {/* Distribuição por modalidade */}
            <div className="glass anim-fade-up anim-d250 rounded-2xl" style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 600, color: "#fff", margin: 0 }}>
                  Distribuição por Modalidade
                </h2>
                <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)", marginTop: ".25rem" }}>
                  Valor total investido por categoria de serviço
                </p>
              </div>

              {dados?.porModalidade.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {dados.porModalidade.map((item, i) => (
                    <ModalidadeBar key={item.modalidade} {...item} maxValor={maxValor} index={i} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ animation: "pulseDot 1.5s ease-in-out infinite", animationDelay: `${i*150}ms` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".375rem" }}>
                        <div style={{ height: 12, width: 96, background: "rgba(255,255,255,.06)", borderRadius: 4 }} />
                        <div style={{ height: 12, width: 64, background: "rgba(255,255,255,.06)", borderRadius: 4 }} />
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 999 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="anim-fade-up anim-d500" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".75rem 1rem", borderRadius: ".75rem", border: "1px solid rgba(255,255,255,.05)" }}>
              <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.2)", margin: 0 }}>
                Dados consultados em tempo real via agente de IA
              </p>
              <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: ".25rem", fontSize: ".75rem", color: "#b8892a", textDecoration: "none" }}
                onMouseOver={e => (e.currentTarget.style.color="#e8c96a")}
                onMouseOut={e  => (e.currentTarget.style.color="#b8892a")}
              >
                Documentação da API <ChevronRight size={12} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Chat (sticky) */}
          <div className="anim-fade-up anim-d150" style={{
            position: "sticky",
            top: "2rem",
            height: "calc(100vh - 5rem)",
            display: "flex",
            flexDirection: "column",
          }}>
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}