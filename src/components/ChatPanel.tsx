"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Loader2, Bot, User, AlertCircle, Sparkles } from "lucide-react";
import { criarSessao } from "@/lib/api";

interface Mensagem {
  id: string;
  papel: "user" | "assistant";
  conteudo: string;
  streaming?: boolean;
}

const SUGESTOES = [
  "Qual o valor total investido em contratos de nuvem?",
  "Mostre as estatísticas por modalidade (IaaS, SaaS, PaaS).",
  "Faça um ranking dos contratos pelo valor.",
  "Quais contratos vencem nos próximos 6 meses?",
  "Quem são os gestores responsáveis pelos contratos?",
];

export default function ChatPanel() {
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [mensagens, setMensagens]   = useState<Mensagem[]>([]);
  const [input, setInput]           = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [iniciando, setIniciando]   = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    criarSessao()
      .then(s => { setSessionId(s.session_id); setIniciando(false); })
      .catch(() => { setErro("Não foi possível conectar à API."); setIniciando(false); });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Auto-resize do textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const enviar = useCallback(async (texto: string) => {
    if (!sessionId || !texto.trim() || carregando) return;
    const pergunta = texto.trim();
    setInput("");
    setErro(null);
    setCarregando(true);

    const idUser      = crypto.randomUUID();
    const idAssistant = crypto.randomUUID();

    setMensagens(prev => [
      ...prev,
      { id: idUser,      papel: "user",      conteudo: pergunta },
      { id: idAssistant, papel: "assistant",  conteudo: "", streaming: true },
    ]);

    try {
      const res = await fetch(`/api/sessoes/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: pergunta }),
      });
      if (!res.ok || !res.body) throw new Error("Falha ao iniciar stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let evt = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
          if (linha.startsWith("event: ")) {
            evt = linha.slice(7).trim();
          } else if (linha.startsWith("data: ")) {
            const data = linha.slice(6);
            if (evt === "heartbeat") {
              // keep-alive — não exibe nada
            } else if (evt === "token") {
              try {
                const chunk = JSON.parse(data) as string;
                setMensagens(prev =>
                  prev.map(m => m.id === idAssistant
                    ? { ...m, conteudo: m.conteudo + chunk }
                    : m)
                );
              } catch { /* ignora chunk malformado */ }
            } else if (evt === "sessao_reset") {
              try {
                const reset = JSON.parse(data) as { novo_session_id: string; mensagem: string };
                setSessionId(reset.novo_session_id);
                setMensagens(prev =>
                  prev.map(m => m.id === idAssistant
                    ? { ...m, conteudo: reset.mensagem, streaming: false }
                    : m)
                );
              } catch { /* ignora */ }
              break;
            } else if (evt === "fim") {
              break;
            } else if (evt === "erro") {
              throw new Error(data);
            }
          }
        }
      }

      setMensagens(prev =>
        prev.map(m => m.id === idAssistant && m.streaming
          ? { ...m, streaming: false }
          : m)
      );
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
      setMensagens(prev => prev.filter(m => m.id !== idAssistant));
    } finally {
      setCarregando(false);
      inputRef.current?.focus();
    }
  }, [sessionId, carregando]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); }
  };

  const dotColor = iniciando ? "#facc15" : sessionId ? "#10b981" : "#f43f5e";

  return (
    <div className="glass rounded-2xl" style={{
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,.08)",
                    display: "flex", alignItems: "center", gap: ".75rem" }}>
        <div style={{ padding: ".5rem", borderRadius: ".75rem", background: "rgba(212,168,67,.1)" }}>
          <Sparkles size={16} color="#e8c96a" strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#fff", margin: 0 }}>
            Assistente de Contratos
          </p>
          <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,.3)", margin: 0 }}>
            {iniciando ? "Conectando…" : sessionId ? `Sessão · ${sessionId.slice(0,8)}…` : "Desconectado"}
          </p>
        </div>
        <span className="anim-pulse" style={{
          width: 8, height: 8, borderRadius: "50%",
          background: dotColor, display: "inline-block",
        }} />
      </div>

      {/* Mensagens */}
      <div style={{ flex: "1 1 0", overflowY: "auto", padding: "1rem 1.5rem",
                    display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0 }}>

        {mensagens.length === 0 && !iniciando && (
          <div className="anim-fade-in" style={{ flex: 1, display: "flex", flexDirection: "column",
                                                  alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <p className="font-display" style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.6)",
                                                    fontStyle: "italic" }}>
                "O que você gostaria de saber sobre os contratos?"
              </p>
              <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,.25)", marginTop: ".5rem" }}>
                Pergunte em linguagem natural
              </p>
            </div>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {SUGESTOES.map((s, i) => (
                <button key={i} className="suggestion-btn" onClick={() => enviar(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map(msg => (
          <div key={msg.id} className="anim-fade-up" style={{
            display: "flex", gap: ".75rem",
            flexDirection: msg.papel === "user" ? "row-reverse" : "row",
          }}>
            <div style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: msg.papel === "user" ? "rgba(212,168,67,.2)" : "rgba(59,130,246,.2)",
              border: `1px solid ${msg.papel === "user" ? "rgba(212,168,67,.3)" : "rgba(59,130,246,.3)"}`,
            }}>
              {msg.papel === "user"
                ? <User size={14} color="#e8c96a" strokeWidth={1.5} />
                : <Bot  size={14} color="#60a5fa" strokeWidth={1.5} />}
            </div>
            <div
              className={msg.papel === "user" ? "chat-bubble-user" : "chat-bubble-agent"}
              style={{ maxWidth: "82%", padding: ".75rem 1rem", fontSize: ".875rem",
                       lineHeight: 1.6, color: msg.papel === "user" ? "#fff" : "#cbd5e1",
                       whiteSpace: "pre-wrap" }}
            >
              {msg.conteudo || (
                <span style={{ display: "flex", alignItems: "center", gap: ".5rem",
                                color: "rgba(255,255,255,.3)" }}>
                  <Loader2 size={12} className="anim-spin" />
                  <span style={{ fontSize: ".75rem" }}>Consultando a base…</span>
                </span>
              )}
              {msg.streaming && msg.conteudo && (
                <span className="anim-blink" style={{
                  display: "inline-block", width: 2, height: 14,
                  background: "#e8c96a", marginLeft: 2, verticalAlign: "middle",
                }} />
              )}
            </div>
          </div>
        ))}

        {erro && (
          <div className="anim-fade-in" style={{
            display: "flex", gap: ".75rem", padding: ".75rem 1rem", borderRadius: ".75rem",
            background: "rgba(244,63,94,.1)", border: "1px solid rgba(244,63,94,.2)",
          }}>
            <AlertCircle size={16} color="#fb7185" strokeWidth={1.5}
                         style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: ".75rem", color: "#fda4af", margin: 0 }}>{erro}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: ".75rem" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Faça uma pergunta sobre os contratos…"
            rows={1}
            disabled={!sessionId || carregando}
            className="chat-input"
            style={{
              flex: 1, borderRadius: ".75rem", padding: ".75rem 1rem",
              fontSize: ".875rem", minHeight: "2.75rem", maxHeight: "7.5rem",
              overflowY: "auto", lineHeight: 1.5,
            }}
          />
          <button
            className="send-btn"
            onClick={() => enviar(input)}
            disabled={!input.trim() || !sessionId || carregando}
          >
            {carregando
              ? <Loader2 size={16} color="#e8c96a" className="anim-spin" />
              : <Send    size={16} color="#e8c96a" strokeWidth={1.5} />}
          </button>
        </div>
        <p style={{ fontSize: ".65rem", color: "rgba(255,255,255,.2)",
                    textAlign: "center", marginTop: ".5rem" }}>
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}