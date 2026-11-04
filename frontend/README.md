# Frontend

React, TypeScript and Vite dashboard for the Restaurant Intelligence Platform. It talks only to the FastAPI backend (`/api/...`), never to Snowflake or Gemini directly.

```powershell
npm install
npm run dev      # http://localhost:5173, forwards /api to http://127.0.0.1:8000
npm run build    # type-check and production build
```

Start the backend first (see the main README). The project uses Tailwind CSS v4, Recharts and Lucide icons. The `@` alias points to `src/`.

All data shown is synthetic sample data.
