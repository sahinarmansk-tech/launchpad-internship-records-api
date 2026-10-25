# Internship Records REST API

Node.js + Express REST API with SQLite persistence, Zod input validation, pagination, filters, and CRUD endpoints. Seed records are based on the supplied internship JSON. The schema also includes `duration_weeks` and `applications_open` from the supplied SQLite starter schema; `duration_weeks` is nullable because the JSON sample does not provide it.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
npm install
npm run seed
npm start
```
API base URL: `http://localhost:3000`. SQLite DB is created automatically at `data/internships.db`. `npm run seed` is safe to rerun and upserts the five sample records.

Optional environment variables: `PORT=3000`, `DATABASE_PATH=./data/internships.db`.

## Data model
`id` string primary key; `title` 2-120 chars; `domain` 2-80 chars; `mode` is `Remote`, `Hybrid`, or `On-site`; `location` 2-100 chars; `skills` is an array of up to 30 non-empty strings; `openings` integer 0-100000; `duration_weeks` optional positive integer up to 520 or null; `applications_open` boolean. Timestamps are managed by SQLite. Unknown fields are rejected.

## Endpoints
| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/health` | Health check | 200 |
| GET | `/api/internships?page=1&limit=10` | List, paginate, filter | 200 |
| GET | `/api/internships/:id` | Read one | 200 |
| POST | `/api/internships` | Create | 201 |
| PATCH | `/api/internships/:id` | Partial update | 200 |
| DELETE | `/api/internships/:id` | Delete | 204 |

List filters: `domain` and `mode`. `page` defaults to 1; `limit` defaults to 10 and must be 1-100. Successful JSON responses use `data`; list responses also contain `pagination`. Errors use `{ "error": { "code": "...", "message": "...", "details": [] } }` where appropriate.

## Examples
```bash
curl http://localhost:3000/health
curl "http://localhost:3000/api/internships?page=1&limit=2"
curl "http://localhost:3000/api/internships?domain=UI%2FUX&mode=Remote"
curl http://localhost:3000/api/internships/INT-101
```

## Notes
`data/schema.sql` documents the schema and `data/seed.json` is the seed dataset. Database files are ignored by Git. This is a backend API, not a static website; Netlify static hosting alone does not run this Express server. Use a Node-capable hosting provider for public deployment.
