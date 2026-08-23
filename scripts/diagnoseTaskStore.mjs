import pg from "pg";

const connectionString = process.env.SYNTHIA_POSTGRES_URL;

if (!connectionString) {
  console.log(JSON.stringify({ configured: false, reachable: false, taskTable: null }));
  process.exit(0);
}

const client = new pg.Client({ connectionString, ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false } });

try {
  await client.connect();
  const taskTable = await client.query("SELECT to_regclass('public.tasks') AS task_table");
  const taskColumns = taskTable.rows[0]?.task_table
    ? await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' ORDER BY ordinal_position")
    : { rows: [] };
  const taskStats = taskTable.rows[0]?.task_table
    ? await client.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 minutes')::int AS recent FROM tasks")
    : { rows: [{ total: 0, recent: 0 }] };
  const userTable = await client.query("SELECT to_regclass('public.users') AS user_table");
  const userStats = userTable.rows[0]?.user_table
    ? await client.query("SELECT COUNT(*)::int AS total FROM users")
    : { rows: [{ total: 0 }] };
  const requiredTaskCreationTables = ["tasks", "task_event_sequences", "task_events", "task_messages"];
  const taskCreationTables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
    [requiredTaskCreationTables],
  );
  const requiredColumns = ["id", "user_id", "title", "goal", "plan", "autonomy_settings", "deleted_at"];
  const requiredCreationColumns = {
    tasks: ["id", "user_id", "title", "goal", "plan", "autonomy_settings", "involves_code", "estimate_band", "estimated_credits_min", "estimated_credits_max"],
    task_event_sequences: ["task_id", "next_sequence_number", "updated_at"],
    task_events: ["id", "task_id", "sequence_number", "type", "payload"],
    task_messages: ["id", "task_id", "role", "content"],
  };
  const creationColumns = await client.query(
    "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name, ordinal_position",
    [requiredTaskCreationTables],
  );
  const creationConstraints = await client.query(
    "SELECT tc.table_name, tc.constraint_type, kcu.column_name FROM information_schema.table_constraints tc LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.table_schema = 'public' AND tc.table_name = ANY($1::text[]) AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY') ORDER BY tc.table_name, tc.constraint_type, kcu.ordinal_position",
    [requiredTaskCreationTables],
  );
  const presentColumns = new Set(taskColumns.rows.map(row => row.column_name));
  const presentTaskCreationTables = new Set(taskCreationTables.rows.map(row => row.table_name));
  const columnsByTable = Object.fromEntries(requiredTaskCreationTables.map(table => [table, creationColumns.rows.filter(row => row.table_name === table).map(row => row.column_name)]));
  const missingCreationColumns = Object.fromEntries(requiredTaskCreationTables.map(table => [table, (requiredCreationColumns[table] ?? []).filter(column => !columnsByTable[table].includes(column))]));
  console.log(JSON.stringify({
    configured: true,
    reachable: true,
    taskTable: Boolean(taskTable.rows[0]?.task_table),
    taskCount: taskStats.rows[0]?.total ?? 0,
    recentTaskCount: taskStats.rows[0]?.recent ?? 0,
    userTable: Boolean(userTable.rows[0]?.user_table),
    userCount: userStats.rows[0]?.total ?? 0,
    requiredTaskCreationTablesPresent: [...presentTaskCreationTables].sort(),
    missingTaskCreationTables: requiredTaskCreationTables.filter(table => !presentTaskCreationTables.has(table)),
    requiredTaskColumnsPresent: requiredColumns.every(column => presentColumns.has(column)),
    missingRequiredTaskColumns: requiredColumns.filter(column => !presentColumns.has(column)),
    taskCreationColumnsPresent: columnsByTable,
    missingTaskCreationColumns: missingCreationColumns,
    taskCreationKeyConstraints: creationConstraints.rows,
  }));
} catch (error) {
  console.log(JSON.stringify({ configured: true, reachable: false, taskTable: null, errorKind: error instanceof Error ? error.name : "UnknownError" }));
} finally {
  await client.end().catch(() => undefined);
}
