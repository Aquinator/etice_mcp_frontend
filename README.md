# ETICE — Agente de Contratos de Nuvem · Frontend

Interface web do sistema de consulta inteligente de contratos. Dashboard de KPIs + chat com streaming SSE.

---

## Arquitetura

```
page.tsx  (dashboard principal)
  ├── StatCard × 4          KPIs numéricos
  ├── ModalidadeBar         Distribuição por modalidade
  └── ChatPanel             Chat SSE com streaming token a token
        ↓ /api/* (proxy)
  FastAPI  localhost:8000
```

---

## Estrutura

```
frontend/
├── package.json
├── next.config.js           # Proxy /api/* → localhost:8000
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css      # Design system: variáveis CSS, glass, animações
    │   └── page.tsx         # Dashboard: KPIs + chat
    ├── components/
    │   ├── StatCard.tsx          # Card de métrica com ícone 
    │   └── ChatPanel.tsx         # Chat SSE com streaming
    └── lib/
        └── api.ts           # Cliente TypeScript tipado para a API
```

---

## Setup

### Pré-requisitos

- Node.js 18+
- Backend rodando em `localhost:8000`

### Instalação e execução

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
```

```bash
npm run build     # build de produção
npm start         # serve o build
```

---

## Proxy reverso

`next.config.js` redireciona todas as chamadas `/api/*` para `http://localhost:8000/*`:

```js
async rewrites() {
  return [{ source: "/api/:path*", destination: "http://localhost:8000/:path*" }]
}
```

O frontend nunca faz chamadas diretas para a porta 8000 — tudo passa pelo proxy. Para apontar para outro host em produção, basta alterar o `destination`.

---

## Consumo do stream SSE

```typescript
const res = await fetch(`/api/sessoes/${sessionId}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mensagem }),
});

const reader  = res.body.getReader();
const decoder = new TextDecoder();

for await (const { value } of reader) {
  for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
    if (linha.startsWith("event: ")) evt = linha.slice(7).trim();
    else if (linha.startsWith("data: ")) {
      if (evt === "token")     appendChunk(JSON.parse(data));
      if (evt === "answer")    setFinalText(JSON.parse(data));
      if (evt === "ui_action") renderVisualization(JSON.parse(data));
      if (evt === "fim")       break;
    }
  }
}
```

---

## Design system

Definido inteiramente em `globals.css` — sem dependência do Tailwind para o visual customizado:

| Classe CSS | Uso |
|---|---|
| `.glass` | Fundo translúcido com blur |
| `.font-display` | Playfair Display (títulos) |
| `.text-gold-shimmer` | Gradiente dourado animado |
| `.bg-grid` | Grade de fundo sutil |
| `.anim-fade-up` | Entrada com deslize para cima |
| `.anim-fade-in` | Entrada com fade |
| `.anim-blink` | Cursor piscante no streaming |

Paleta principal (variáveis CSS em `:root`):

```css
--navy-950: #04080f   /* fundo */
--gold-400: #e8c96a   /* destaque */
--gold-500: #d4a843   /* primário */
```