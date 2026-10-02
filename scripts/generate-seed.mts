import { writeFileSync } from "node:fs";
import { renderSeedSql } from "../src/integrations/database/seed-data.ts";

writeFileSync(new URL("../database/seed/seed.sql", import.meta.url), renderSeedSql());
console.log("Wrote database/seed/seed.sql");
