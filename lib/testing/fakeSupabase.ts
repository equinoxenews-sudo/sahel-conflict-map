// Base factice en mémoire, qui imite la partie de l'API supabase-js utilisée par le site (select, upsert, delete, filtres
// eq / in / like / not like, tri, comptage). Elle sert aux tests automatiques et aux essais locaux (EQUINOXE_FAKE_DB=1,
// jamais en production, voir lib/supabaseAdmin.ts) : on peut ainsi vérifier le cloisonnement des comptes sans écrire un
// seul octet dans la vraie base. Elle ne cherche pas à tout imiter : une requête qu'elle ne comprend pas lève une erreur.
import { hashPassword } from "../accounts";
import { TEST_ACCOUNTS } from "./testAccounts";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null; count?: number | null };

const PRIMARY_KEYS: Record<string, string[]> = {
  accounts: ["identifier"],
  investigation_cloud: ["dossier_id"],
  investigation_cloud_chunks: ["dossier_id", "upload_id", "seq"],
};

export interface FakeDb {
  tables: Map<string, Row[]>;
}

export function createFakeDb(options: { seedAccounts?: boolean } = {}): FakeDb {
  const db: FakeDb = { tables: new Map() };
  if (options.seedAccounts) {
    db.tables.set(
      "accounts",
      TEST_ACCOUNTS.map((account) => ({
        identifier: account.identifier,
        display_name: account.displayName,
        password_hash: hashPassword(account.password),
        tier: account.tier,
        timezone: "Europe/Paris",
        disabled: false,
      })),
    );
  }
  return db;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Motif LIKE de Postgres (% = suite quelconque, _ = un caractère, \ = échappement) converti en expression régulière. */
function likeToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "\\" && i + 1 < pattern.length) source += escapeRegExp(pattern[++i]);
    else if (char === "%") source += ".*";
    else if (char === "_") source += ".";
    else source += escapeRegExp(char);
  }
  return new RegExp(`^${source}$`, "s");
}

type Filter = (row: Row) => boolean;

class Query implements PromiseLike<Result> {
  private action: "select" | "upsert" | "delete" = "select";
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;
  private payload: Row[] = [];
  private returning = false;
  private head = false;
  private wantCount = false;
  private cardinality: "many" | "maybe" | "one" = "many";

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
  ) {}

  private rows(): Row[] {
    let rows = this.db.tables.get(this.table);
    if (!rows) {
      rows = [];
      this.db.tables.set(this.table, rows);
    }
    return rows;
  }

  select(_columns?: string, options?: { count?: "exact"; head?: boolean }): this {
    if (this.action !== "select") this.returning = true;
    this.head = options?.head === true;
    this.wantCount = options?.count === "exact";
    return this;
  }

  upsert(value: Row | Row[]): this {
    this.action = "upsert";
    this.payload = Array.isArray(value) ? value : [value];
    return this;
  }

  delete(): this {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  like(column: string, pattern: string): this {
    const expression = likeToRegExp(pattern);
    this.filters.push((row) => typeof row[column] === "string" && expression.test(row[column] as string));
    return this;
  }

  not(column: string, operator: string, pattern: string): this {
    if (operator !== "like") throw new Error(`fakeSupabase : not(${operator}) non géré`);
    const expression = likeToRegExp(pattern);
    this.filters.push((row) => !(typeof row[column] === "string" && expression.test(row[column] as string)));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this.max = count;
    return this;
  }

  maybeSingle(): this {
    this.cardinality = "maybe";
    return this;
  }

  single(): this {
    this.cardinality = "one";
    return this;
  }

  private run(): Result {
    const rows = this.rows();
    const matches = (row: Row) => this.filters.every((filter) => filter(row));
    if (this.action === "delete") {
      this.db.tables.set(
        this.table,
        rows.filter((row) => !matches(row)),
      );
      return { data: null, error: null };
    }
    let affected: Row[];
    if (this.action === "upsert") {
      const keys = PRIMARY_KEYS[this.table] ?? ["id"];
      affected = this.payload.map((incoming) => {
        const index = rows.findIndex((row) => keys.every((key) => row[key] === incoming[key]));
        if (index >= 0) {
          rows[index] = { ...rows[index], ...incoming };
          return rows[index];
        }
        const created: Row = { ...incoming };
        // Comme la colonne « created_at default now() » des morceaux en production.
        if (this.table === "investigation_cloud_chunks" && created.created_at === undefined) created.created_at = new Date().toISOString();
        rows.push(created);
        return created;
      });
      if (!this.returning) return { data: null, error: null };
    } else {
      affected = rows.filter(matches);
    }
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      affected = [...affected].sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        return ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    if (this.max !== null) affected = affected.slice(0, this.max);
    const copies = affected.map((row) => ({ ...row }));
    const count = this.wantCount ? copies.length : null;
    if (this.head) return { data: null, error: null, count };
    if (this.cardinality === "many") return { data: copies, error: null, count };
    if (copies.length > 1) return { data: null, error: { message: "plusieurs lignes pour un résultat unique" }, count };
    if (copies.length === 0) {
      return this.cardinality === "maybe" ? { data: null, error: null, count } : { data: null, error: { message: "aucune ligne" }, count };
    }
    return { data: copies[0], error: null, count };
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}

export interface FakeClient {
  from(table: string): Query;
}

export function createFakeClient(db: FakeDb): FakeClient {
  return { from: (table) => new Query(db, table) };
}

// La base factice vit sur globalThis : le serveur de développement charge les routes dans des modules séparés, qui doivent
// pourtant voir les mêmes données.
const GLOBAL_KEY = "__equinoxeFakeDb";

function holder(): { [GLOBAL_KEY]?: FakeDb } {
  return globalThis as { [GLOBAL_KEY]?: FakeDb };
}

/** Le client factice partagé (créé au premier appel, avec les comptes de test). */
export function sharedFakeClient(): FakeClient {
  const scope = holder();
  scope[GLOBAL_KEY] ??= createFakeDb({ seedAccounts: true });
  return createFakeClient(scope[GLOBAL_KEY]);
}

/** Repart d'une base factice vierge (comptes de test seulement). */
export function resetFakeDb(): void {
  holder()[GLOBAL_KEY] = createFakeDb({ seedAccounts: true });
}
