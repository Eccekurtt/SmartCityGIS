# SmartCity GIS: arayüz

React 19 + TypeScript + Vite. Proje genel bilgisi, kurulum ve mimari için kök dizindeki [README](../README.md) dosyasına bakın.

```bash
npm install
npm run dev      # http://localhost:5173 (/api isteklerini 5046'daki API'ye yönlendirir)
npm test         # Vitest
npm run lint     # oxlint
npm run build    # tsc + vite build
```

Klasörler: `src/api` (HTTP istemcisi), `src/hooks` (React Query), `src/components`, `src/pages`, `src/lib` (saf yardımcılar), `src/context` (oturum, bildirim).
