# AI-SQL-Query-Generator_ui

React frontend user interface for QueryCraft AI — an intelligent SQL query generator, validator, and analytical visualizer.

## Features
- **Prompt to SQL Interface**: Convert questions like "Show monthly sales by category" into formatted SQL.
- **Visual Schema Explorer**: Collapsible table browser with columns, types, primary/foreign keys, and row preview.
- **Safety Badge Indicators**: Real-time read-only safety diagnostics and security status.
- **Query Explainer Panel**: Clause-by-clause breakdown and business insights.
- **Dual-Mode Results**: High-performance tabular data grid and dynamic visual distribution charts.
- **Export Options**: Export result sets to CSV or JSON.
- **LLM Settings Modal**: Toggle between built-in engine or configure Gemini / OpenAI API keys.

## Tech Stack
- React 18+
- Vite
- Lucide React (Icons)
- Vanilla CSS with Glassmorphism & Dark Mode design system

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev
```

App runs at: `http://localhost:5173/` (proxies `/api` requests to `http://localhost:8000`)
