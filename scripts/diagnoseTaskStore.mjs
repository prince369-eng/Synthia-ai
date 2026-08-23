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
  const requiredColumns = ["id", "user_id", "title", "goal", "plan", "autonomy_settings", "deleted_at"];
  const presentColumns = new Set(taskColumns.rows.map(row => row.column_name));
  console.log(JSON.stringify({
    configured: true,
    reachable: true,
    taskTable: Boolean(taskTable.rows[0]?.task_table),
    taskCount: taskStats.rows[0]?.total ?? 0,
    recentTaskCount: taskStats.rows[0]?.recent ?? 0,
    userTable: Boolean(userTable.rows[0]?.user_table),
    userCount: userStats.rows[0]?.total ?? 0,
    requiredTaskColumnsPresent: requiredColumns.every(column => presentColumns.has(column)),
    missingRequiredTaskColumns: requiredColumns.filter(column => !presentColumns.has(column)),
  }));
} catch (error) {
  console.log(JSON.stringify({ configured: true, reachable: false, taskTable: null, errorKind: error instanceof Error ? error.name : "UnknownError" }));
} finally {
  await client.end().catch(() => undefined);
}
