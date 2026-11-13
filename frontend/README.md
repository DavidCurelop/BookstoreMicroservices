# BookStore Co. frontend

Frontend React 19 + Vite de BookStore Co.

La configuración dependiente del entorno se define mediante variables `VITE_*`. Use `.env.example` como referencia y no incluya archivos `.env` reales en el repositorio.

Para desarrollo local del frontend fuera de Docker:

```bash
cp .env.example .env
npm ci
npm run dev
```

El proxy de desarrollo y la URL base de la API se parametrizan en `.env`.

Consulte el `README.md` de la raíz del proyecto para ejecutar la solución completa con PostgreSQL y Docker Compose.
