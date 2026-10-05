/**
 * Minimal in-memory stand-in for the Supabase query builder: just enough for
 * fetchCatalogRows (from/select/eq/neq/is/not/or/order/limit, awaitable).
 * Selecting projects columns, so unselected columns (e.g. `draft`) never leak.
 */
type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };

export type FakeCall = { table: string; columns: string; filters: string[] };

export type FakeSupabase = {
  from(table: string): FakeQuery;
  tables: Record<string, Row[]>;
  calls: FakeCall[];
  /** Make every query on `table` (default: all tables) fail. Pass null to clear. */
  failWith(error: string | null, table?: string): void;
  /** Delay every query by `ms` (uses timers, so fake timers work). */
  delay(ms: number): void;
  /** Make every query reject (network failure). Pass null to clear. */
  rejectWith(error: Error | null): void;
};

type Predicate = (row: Row) => boolean;
type State = { failures: Map<string, string>; delayMs: number; reject: Error | null };

function parseValue(raw: string): unknown {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

/** Parses PostgREST-style `col.op.value` / `col.not.op.value`. */
function conditionToPredicate(cond: string): Predicate {
  const parts = cond.split(".");
  const col = parts[0];
  let negate = false;
  let rest = parts.slice(1);
  if (rest[0] === "not") {
    negate = true;
    rest = rest.slice(1);
  }
  const op = rest[0];
  const value = parseValue(rest.slice(1).join("."));
  const test = (row: Row): boolean => {
    const actual = row[col] ?? null;
    if (op === "eq" || op === "is") return actual === value;
    if (op === "neq") return actual !== value;
    throw new Error(`fake-supabase: unsupported operator ${op}`);
  };
  return (row) => (negate ? !test(row) : test(row));
}

class FakeQuery implements PromiseLike<Result> {
  private columns = "*";
  private predicates: Predicate[] = [];
  private filters: string[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private max = Infinity;

  constructor(
    private readonly table: string,
    private readonly db: FakeSupabase,
    private readonly state: State,
  ) {}

  select(columns = "*"): this {
    this.columns = columns;
    return this;
  }
  eq(col: string, value: unknown): this {
    this.filters.push(`${col}.eq.${String(value)}`);
    this.predicates.push((r) => (r[col] ?? null) === value);
    return this;
  }
  neq(col: string, value: unknown): this {
    this.filters.push(`${col}.neq.${String(value)}`);
    this.predicates.push((r) => (r[col] ?? null) !== value);
    return this;
  }
  is(col: string, value: unknown): this {
    this.filters.push(`${col}.is.${String(value)}`);
    this.predicates.push((r) => (r[col] ?? null) === value);
    return this;
  }
  not(col: string, op: string, value: unknown): this {
    this.filters.push(`${col}.not.${op}.${String(value)}`);
    const p = conditionToPredicate(`${col}.${op}.${String(value)}`);
    this.predicates.push((r) => !p(r));
    return this;
  }
  or(expression: string): this {
    this.filters.push(`or(${expression})`);
    const ps = expression.split(",").map(conditionToPredicate);
    this.predicates.push((r) => ps.some((p) => p(r)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number): this {
    this.max = n;
    return this;
  }

  private run(): Result {
    this.db.calls.push({ table: this.table, columns: this.columns, filters: this.filters });
    const failure = this.state.failures.get(this.table) ?? this.state.failures.get("*");
    if (failure) return { data: null, error: { message: failure } };
    let rows = (this.db.tables[this.table] ?? []).filter((r) => this.predicates.every((p) => p(r)));
    // Apply the last order() first so the first one is the primary key.
    for (const { col, asc } of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => {
        const x = a[col] as string | number | undefined;
        const y = b[col] as string | number | undefined;
        if (x === y) return 0;
        if (x === undefined) return 1;
        if (y === undefined) return -1;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    rows = rows.slice(0, this.max);
    const cols =
      this.columns === "*" ? null : this.columns.split(",").map((c) => c.trim()).filter(Boolean);
    const data = rows.map((row) => {
      if (!cols) return structuredClone(row);
      const out: Row = {};
      for (const c of cols) if (c in row) out[c] = structuredClone(row[c]);
      return out;
    });
    return { data, error: null };
  }

  then<R1 = Result, R2 = never>(
    onfulfilled?: ((value: Result) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    const exec = (): Promise<Result> =>
      this.state.reject ? Promise.reject(this.state.reject) : Promise.resolve(this.run());
    const promise =
      this.state.delayMs > 0
        ? new Promise<Result>((resolve, reject) =>
            setTimeout(() => exec().then(resolve, reject), this.state.delayMs),
          )
        : exec();
    return promise.then(onfulfilled, onrejected);
  }
}

export function createFakeSupabase(tables: Record<string, Row[]> = {}): FakeSupabase {
  const state: State = { failures: new Map(), delayMs: 0, reject: null };
  const db: FakeSupabase = {
    tables,
    calls: [],
    from: (table) => new FakeQuery(table, db, state),
    failWith(error, table = "*") {
      if (error === null) state.failures.delete(table);
      else state.failures.set(table, error);
    },
    delay(ms) {
      state.delayMs = ms;
    },
    rejectWith(error) {
      state.reject = error;
    },
  };
  return db;
}
