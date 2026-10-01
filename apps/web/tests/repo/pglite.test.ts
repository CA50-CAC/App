/**
 * The repository contract on PGlite (in memory). Runs in CI with `pnpm test`.
 */
import { randomBytes } from "node:crypto";
import { openPglite } from "@/lib/db/pglite";
import { createPgliteRepositories } from "@/lib/repo/pglite";
import { repositoryContract, stubPhotoUrl } from "./contract";

repositoryContract("pglite", async () => {
  const db = await openPglite();
  const runId = randomBytes(4).toString("hex");
  return {
    repos: createPgliteRepositories(db, { photoUrl: stubPhotoUrl }),
    runId,
    slugPrefix: `zz-test-${runId}-`,
    async newStaff(email) {
      const { rows } = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
      return { userId: rows[0].id, accessToken: null };
    },
    async auditActions(schoolId) {
      const { rows } = await db.query<{ action: string }>(
        "select action from public.audit_log where school_id = $1 order by id",
        [schoolId],
      );
      return rows.map((r) => r.action);
    },
    close: () => db.close(),
  };
});
