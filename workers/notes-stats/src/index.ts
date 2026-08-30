/**
 * notes-stats — views / upvotes / hearts for Field Notes posts.
 *
 * One Durable Object per article slug. Each DO holds a single SQLite
 * table of (kind, visitor-hash) rows whose primary key IS the dedup:
 * INSERT OR IGNORE makes a repeat visitor structurally unable to count
 * twice, and every displayed number is COUNT(*) over the same rows, so
 * counter and dedup-set can never drift apart.
 *
 * The visitor hash is SHA-256(ip | user-agent | salt), truncated —
 * irreversible, no cookies set, no PII stored.
 */
import { DurableObject } from "cloudflare:workers";

export interface Env {
  NOTE: DurableObjectNamespace<NoteStats>;
}

const SLUG = /^[a-z0-9][a-z0-9-]{2,63}$/;
const KINDS = new Set(["up", "heart"]);

/** Upstream PR per post; status is fetched live and cached in the DO. */
const UPSTREAM: Record<string, { repo: string; pr: number }> = {
  "anatomy-of-an-undefined-symbol": { repo: "falcosecurity/plugins", pr: 1501 },
  "anatomy-of-a-race-condition": { repo: "sugarlabs/musicblocks", pr: 8099 },
  "anatomy-of-an-undeclared-caption-track": { repo: "video-dev/hls.js", pr: 8020 },
};
const UPSTREAM_TTL = 6 * 60 * 60 * 1000;

export interface Upstream {
  state: "open" | "merged" | "closed" | "unknown";
  url: string;
  /** repo and number, so the post can name the PR rather than just its state */
  repo?: string;
  number?: number;
  /** diff size, straight from the same API response as the state */
  additions?: number;
  deletions?: number;
  files?: number;
}

export interface Stats {
  views: number;
  up: number;
  heart: number;
  you: { up: boolean; heart: boolean };
  upstream?: Upstream;
}

export class NoteStats extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS seen (
          kind TEXT NOT NULL,
          vh   TEXT NOT NULL,
          ts   INTEGER NOT NULL,
          PRIMARY KEY (kind, vh)
        )
      `);
    });
  }

  private snapshot(vh: string): Stats {
    const rows = this.ctx.storage.sql
      .exec<{ kind: string; n: number }>(
        "SELECT kind, COUNT(*) AS n FROM seen GROUP BY kind",
      )
      .toArray();
    const by: Record<string, number> = { view: 0, up: 0, heart: 0 };
    for (const r of rows) by[r.kind] = r.n;
    const mine = new Set(
      this.ctx.storage.sql
        .exec<{ kind: string }>("SELECT kind FROM seen WHERE vh = ?", vh)
        .toArray()
        .map((r) => r.kind),
    );
    return {
      views: by.view,
      up: by.up,
      heart: by.heart,
      you: { up: mine.has("up"), heart: mine.has("heart") },
    };
  }

  async stats(vh: string, slug?: string): Promise<Stats> {
    const snap = this.snapshot(vh);
    if (slug && UPSTREAM[slug]) {
      snap.upstream = await this.upstream(UPSTREAM[slug]);
    }
    return snap;
  }

  /**
   * PR status, cached in DO storage for 6h; a failed GitHub fetch serves
   * whatever was cached last rather than erroring the whole response.
   */
  private async upstream(cfg: { repo: string; pr: number }): Promise<Upstream> {
    const url = `https://github.com/${cfg.repo}/pull/${cfg.pr}`;
    const ids = { url, repo: cfg.repo, number: cfg.pr };
    type Cached = {
      ts: number;
      state: Upstream["state"];
      additions?: number;
      deletions?: number;
      files?: number;
    };
    const cached = await this.ctx.storage.get<Cached>("upstream:v2");
    if (cached && Date.now() - cached.ts < UPSTREAM_TTL) {
      return {
        ...ids,
        state: cached.state,
        additions: cached.additions,
        deletions: cached.deletions,
        files: cached.files,
      };
    }
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${cfg.repo}/pulls/${cfg.pr}`,
        { headers: { "user-agent": "field-notes-stats", accept: "application/vnd.github+json" } },
      );
      if (!resp.ok) throw new Error(String(resp.status));
      const pr = (await resp.json()) as {
        state: string;
        merged_at: string | null;
        additions?: number;
        deletions?: number;
        changed_files?: number;
      };
      const state: Upstream["state"] = pr.merged_at
        ? "merged"
        : pr.state === "open"
          ? "open"
          : "closed";
      const entry: Cached = {
        ts: Date.now(),
        state,
        additions: pr.additions,
        deletions: pr.deletions,
        files: pr.changed_files,
      };
      await this.ctx.storage.put("upstream:v2", entry);
      return {
        ...ids,
        state,
        additions: entry.additions,
        deletions: entry.deletions,
        files: entry.files,
      };
    } catch {
      return {
        ...ids,
        state: cached?.state ?? "unknown",
        additions: cached?.additions,
        deletions: cached?.deletions,
        files: cached?.files,
      };
    }
  }

  async view(vh: string): Promise<Stats> {
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO seen (kind, vh, ts) VALUES ('view', ?, ?)",
      vh,
      Date.now(),
    );
    return this.snapshot(vh);
  }

  async react(vh: string, kind: string, on: boolean): Promise<Stats> {
    if (KINDS.has(kind)) {
      if (on) {
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO seen (kind, vh, ts) VALUES (?, ?, ?)",
          kind,
          vh,
          Date.now(),
        );
      } else {
        this.ctx.storage.sql.exec(
          "DELETE FROM seen WHERE kind = ? AND vh = ?",
          kind,
          vh,
        );
      }
    }
    return this.snapshot(vh);
  }
}

async function visitorHash(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const ua = request.headers.get("user-agent") ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}|${ua}|field-notes-v1`),
  );
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const ok =
    origin === "https://www.mannycastillo.dev" ||
    origin === "https://mannycastillo.dev" ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");
  return {
    "access-control-allow-origin": ok ? origin : "https://www.mannycastillo.dev",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    const url = new URL(request.url);
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status, headers: cors });

    try {
      const vh = await visitorHash(request);

      if (request.method === "GET" && url.pathname === "/stats") {
        const slugs = (url.searchParams.get("slugs") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => SLUG.test(s))
          .slice(0, 12);
        const out: Record<string, Stats> = {};
        await Promise.all(
          slugs.map(async (slug) => {
            out[slug] = await env.NOTE.getByName(slug).stats(vh, slug);
          }),
        );
        return json(out);
      }

      if (request.method === "POST" && url.pathname === "/view") {
        const { slug } = (await request.json()) as { slug?: string };
        if (!slug || !SLUG.test(slug)) return json({ error: "bad slug" }, 400);
        return json(await env.NOTE.getByName(slug).view(vh));
      }

      if (request.method === "POST" && url.pathname === "/react") {
        const { slug, kind, on } = (await request.json()) as {
          slug?: string;
          kind?: string;
          on?: boolean;
        };
        if (!slug || !SLUG.test(slug) || !kind || !KINDS.has(kind)) {
          return json({ error: "bad request" }, 400);
        }
        return json(await env.NOTE.getByName(slug).react(vh, kind, on !== false));
      }

      return json({ error: "not found" }, 404);
    } catch {
      return json({ error: "server error" }, 500);
    }
  },
};
