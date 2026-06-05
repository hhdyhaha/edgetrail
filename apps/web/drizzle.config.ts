import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "../../packages/db/migrations/generated",
  schema: "../../packages/db/src/schema.ts",
  dialect: "sqlite",
});
