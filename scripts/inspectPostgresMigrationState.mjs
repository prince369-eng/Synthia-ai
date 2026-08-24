import pg from "pg";

const { Client } = pg;

if (!process.env.SYNTHIA_POSTGRES_URL) {
  throw new Error("SYNTHIA_POSTGRES_URL is not configured");
}

const client = new Client({ connectionString: process.env.SYNTHIA_POSTGRES_URL });

try {
  await client.connect();
  const migrationLedger = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name = '__drizzle_migrations'
    ORDER BY table_schema
  `);
  const enumTypes = await client.query(`
    SELECT t.typname AS name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e' AND n.nspname = 'public'
    ORDER BY t.typname
  `);
  const applicationTables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  let ledger = { present: migrationLedger.rowCount > 0, schemas: migrationLedger.rows.map((row) => row.table_schema), entries: 0 };
  if (ledger.present) {
    const schema = ledger.schemas[0].replaceAll('"', '""');
    const result = await client.query(`SELECT count(*)::int AS count FROM "${schema}"."__drizzle_migrations"`);
    ledger = { present: true, schemas: ledger.schemas, entries: result.rows[0].count };
  }

  console.log(JSON.stringify({
    migrationLedger: ledger,
    enumTypes: enumTypes.rows.map((row) => row.name),
    applicationTables: applicationTables.rows.map((row) => row.table_name),
  }));
} finally {
  await client.end();
}
