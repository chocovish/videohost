import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
