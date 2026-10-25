import express from "express";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { createSchema, updateSchema, pagination } from "./validation.js";

export const app = express();
app.use(express.json({ limit: "100kb" }));
const find = id => db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
const out = row => row && ({
 ...row, skills: JSON.parse(row.skills), applications_open: Boolean(row.applications_open)
});
const fail = (res, status, code, message, details) => res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
const validationFail = (res, error) => fail(res, 400, "VALIDATION_ERROR", "Request validation failed",
 error.issues.map(i => ({ field: i.path.join(".") || "body", message: i.message })));

app.get("/health", (_req,res) => res.json({ data: { status: "ok" } }));

app.get("/api/internships", (req,res) => {
 const pg = pagination(req.query);
 if (pg.error) return fail(res,400,"INVALID_PAGINATION",pg.error);
 const where = [], params = [];
 if (req.query.domain !== undefined) {
  if (typeof req.query.domain !== "string" || !req.query.domain.trim()) return fail(res,400,"INVALID_FILTER","domain must be a non-empty string");
  where.push("domain = ?"); params.push(req.query.domain.trim());
 }
 if (req.query.mode !== undefined) {
  if (!["Remote","Hybrid","On-site"].includes(req.query.mode)) return fail(res,400,"INVALID_FILTER","mode must be Remote, Hybrid, or On-site");
  where.push("mode = ?"); params.push(req.query.mode);
 }
 const clause = where.length ? " WHERE " + where.join(" AND ") : "";
 const total = db.prepare("SELECT COUNT(*) n FROM internships" + clause).get(...params).n;
 const rows = db.prepare("SELECT * FROM internships" + clause + " ORDER BY created_at DESC, id ASC LIMIT ? OFFSET ?").all(...params,pg.limit,pg.offset);
 res.json({ data: rows.map(out), pagination: { page:pg.page, limit:pg.limit, total, totalPages:Math.ceil(total/pg.limit) } });
});

app.get("/api/internships/:id", (req,res) => {
 const row = find(req.params.id);
 if (!row) return fail(res,404,"NOT_FOUND","Internship not found");
 res.json({ data: out(row) });
});

app.post("/api/internships", (req,res) => {
 const parsed = createSchema.safeParse(req.body);
 if (!parsed.success) return validationFail(res,parsed.error);
 const b = parsed.data, id = b.id || "INT-" + randomUUID().slice(0,8).toUpperCase();
 if (find(id)) return fail(res,409,"CONFLICT",`Internship ID '${id}' already exists`);
 db.prepare(`INSERT INTO internships(id,title,domain,mode,location,skills,openings,duration_weeks,applications_open)
 VALUES(@id,@title,@domain,@mode,@location,@skills,@openings,@duration_weeks,@applications_open)`).run({
  id,title:b.title,domain:b.domain,mode:b.mode,location:b.location,skills:JSON.stringify(b.skills ?? []),
  openings:b.openings,duration_weeks:b.duration_weeks ?? null,applications_open:b.applications_open === false ? 0 : 1
 });
 res.location(`/api/internships/${encodeURIComponent(id)}`).status(201).json({ data:out(find(id)) });
});

app.patch("/api/internships/:id", (req,res) => {
 if (!find(req.params.id)) return fail(res,404,"NOT_FOUND","Internship not found");
 const parsed = updateSchema.safeParse(req.body);
 if (!parsed.success) return validationFail(res,parsed.error);
 const b = parsed.data, keys = Object.keys(b);
 const values = { ...b, id:req.params.id };
 if (b.skills !== undefined) values.skills = JSON.stringify(b.skills);
 if (b.applications_open !== undefined) values.applications_open = b.applications_open ? 1 : 0;
 const allowed = ["title","domain","mode","location","skills","openings","duration_weeks","applications_open"];
 const assignments = keys.filter(k=>allowed.includes(k)).map(k=>`${k}=@${k}`);
 db.prepare(`UPDATE internships SET ${assignments.join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run(values);
 res.json({ data:out(find(req.params.id)) });
});

app.delete("/api/internships/:id", (req,res) => {
 const result = db.prepare("DELETE FROM internships WHERE id=?").run(req.params.id);
 if (!result.changes) return fail(res,404,"NOT_FOUND","Internship not found");
 res.status(204).end();
});

app.use((err,_req,res,_next) => {
 if (err instanceof SyntaxError && "body" in err) return fail(res,400,"INVALID_JSON","Request body must be valid JSON");
 console.error(err);
 return fail(res,500,"INTERNAL_SERVER_ERROR","An unexpected error occurred");
});
app.use((_req,res) => fail(res,404,"ROUTE_NOT_FOUND","Route not found"));
