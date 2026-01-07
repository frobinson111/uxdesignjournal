# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Environment variables (backend/database)

Do not commit real credentials. For production/staging, set `MONGO_URI` in your backend environment:

```
MONGO_URI="mongodb+srv://<user>:<password>@cluster3.ia8o2eg.mongodb.net/<DB_NAME>?retryWrites=true&w=majority"
```

Recommendations:
- Use separate databases for prod/stage/dev; avoid using prod credentials locally.
- Keep secrets in `.env` (not committed) or your platform’s secret manager.
- If you need a non-root app user, create it and use that in `MONGO_URI`.
