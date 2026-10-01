/**
 * Serves locally stored photos (PGlite/dev/demo only; production uses signed
 * Supabase Storage URLs). A request needs a valid, unexpired signature made by
 * the server, so photos can't be listed or guessed.
 */
import { appEnv } from "@/lib/env";
import { contentTypeFor, readLocalPhoto, verifyLocalPhoto } from "@/lib/server/photos";

export async function GET(request: Request, { params }: RouteContext<"/api/photos/[...path]">) {
  const env = appEnv();
  if (env.dataAdapter !== "pglite") return new Response("Not found", { status: 404 });

  const photoPath = (await params).path.join("/");
  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  if (!verifyLocalPhoto(photoPath, exp, sig, env.sessionSecret)) return new Response("Not found", { status: 404 });

  const bytes = await readLocalPhoto(photoPath);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(photoPath),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // Even our own demo SVGs can't run scripts or load anything.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Robots-Tag": "noindex",
    },
  });
}
