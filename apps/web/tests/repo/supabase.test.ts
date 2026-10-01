/**
 * The repository contract on a hosted Supabase project. Opt-in only:
 * `pnpm test:supabase` (see vitest.supabase.config.mts). Never runs in CI.
 *
 * Staff users are real Supabase Auth users. To get a login token without
 * sending an email, the test asks the admin API for a magic-link token and
 * redeems it, which is the same thing clicking the emailed link does.
 * Everything is tagged with a "zz-test-<run>" prefix and deleted afterwards.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient, createSupabaseRepositories } from "@/lib/repo/supabase";
import { repositoryContract, stubPhotoUrl } from "./contract";

repositoryContract("supabase", async () => {
  const url = process.env.SUPABASE_TEST_API_URL;
  const secretKey = process.env.SUPABASE_TEST_SECRET_KEY;
  const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
  if (!url || !secretKey || !publishableKey) {
    throw new Error(
      "pnpm test:supabase needs SUPABASE_TEST_API_URL, SUPABASE_TEST_SECRET_KEY, and SUPABASE_TEST_PUBLISHABLE_KEY in apps/web/.env.local",
    );
  }
  const admin = createServiceClient(url, secretKey);
  const runId = randomBytes(4).toString("hex");
  const slugPrefix = `zz-test-${runId}-`;
  const userIds: string[] = [];

  return {
    repos: createSupabaseRepositories({ url, publishableKey, secretKey, photoUrl: stubPhotoUrl }),
    runId,
    slugPrefix,
    async newStaff(email) {
      const created = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (created.error || !created.data.user) throw new Error(`createUser ${email}: ${created.error?.message}`);
      userIds.push(created.data.user.id);

      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error) throw new Error(`generateLink ${email}: ${link.error.message}`);
      const anon = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const verified = await anon.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
      if (verified.error || !verified.data.session) throw new Error(`verifyOtp ${email}: ${verified.error?.message}`);
      return { userId: created.data.user.id, accessToken: verified.data.session.access_token };
    },
    async auditActions(schoolId) {
      const { data, error } = await admin.from("audit_log").select("action").eq("school_id", schoolId).order("id");
      if (error) throw error;
      return (data ?? []).map((r) => String(r.action));
    },
    async close() {
      await admin.from("schools").delete().like("slug", `${slugPrefix}%`);
      await admin.from("rate_limits").delete().like("key", `test:${runId}:%`);
      for (const id of userIds) await admin.auth.admin.deleteUser(id);
    },
  };
});
