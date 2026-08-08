import postgres from "postgres";

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DATABASE_URL
  );
}

export function isDbConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function createSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "Database not configured. Set POSTGRES_URL (Supabase connection string)."
    );
  }

  return postgres(url, {
    ssl: "require",
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });
}

export async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const sql = createSql();
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 2 });
  }
}
