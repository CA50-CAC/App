/**
 * The app's data layer, picked by DATA_ADAPTER. Pages and actions call
 * `repos()` and never import an adapter directly.
 */
import "server-only";
import type { Repositories } from "@/lib/repo/interface";
import { createPgliteRepositories } from "@/lib/repo/pglite";
import { createSupabaseRepositories } from "@/lib/repo/supabase";
import { appEnv } from "@/lib/env";
import { supabaseConfig } from "@/lib/supabase/config";
import { getPglite } from "./pglite-instance";
import { photoStore } from "./photos";

const globalForRepos = globalThis as unknown as { lostboxRepos?: Promise<Repositories> };

async function create(): Promise<Repositories> {
  const photoUrl = (p: string) => photoStore().url(p);
  if (appEnv().dataAdapter === "supabase") {
    const config = supabaseConfig()!;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!secretKey) throw new Error("DATA_ADAPTER=supabase needs SUPABASE_SECRET_KEY (server-only)");
    return createSupabaseRepositories({ ...config, secretKey, photoUrl });
  }
  return createPgliteRepositories(await getPglite(), { photoUrl });
}

export function repos(): Promise<Repositories> {
  globalForRepos.lostboxRepos ??= create().catch((e) => {
    globalForRepos.lostboxRepos = undefined;
    throw e;
  });
  return globalForRepos.lostboxRepos;
}
