import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle-structure/src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: ["roles", "branches", "departments", "users", "account", "session", "verificationToken"],
});
