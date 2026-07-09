import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

const sqlHost = process.env.SQL_HOST || "localhost";
const sqlPort = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
const sqlDbName = process.env.SQL_DB_NAME || "placeholder_db";
const user = process.env.SQL_ADMIN_USER || "postgres";
const password = process.env.SQL_ADMIN_PASSWORD || "password";
const useSsl = process.env.SQL_SSL === "true";

if (!process.env.SQL_HOST) {
  console.log("Note: SQL_HOST environment variable not set. Using fallback values (safe for schema generation/build).");
} else {
  console.log(`Using user: ${user} to connect to database.`);
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    port: sqlPort,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  },
  verbose: true, // Enable verbose output.
});
