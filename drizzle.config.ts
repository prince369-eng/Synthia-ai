import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SYNTHIA_POSTGRES_URL ?? "postgresql://synthia:synthia@localhost:5432/synthia";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
