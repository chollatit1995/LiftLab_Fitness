import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

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

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "Database not configured. Set POSTGRES_URL (Supabase connection string)."
    );
  }

  if (!client) {
    client = postgres(url, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return client;
}
