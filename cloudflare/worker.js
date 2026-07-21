const VERSION = "4.6.0-worker";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/status") {
      return Response.json({
        ok: true,
        game: "植物大战僵尸融合欠费版",
        version: VERSION,
        mode: "dynamic-cloudflare-worker",
        generatedAt: new Date().toISOString(),
        colo: request.cf?.colo || "unknown"
      }, {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "X-Xiaowan-Version": VERSION
        }
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    const isVersionedAsset = url.searchParams.has("v") && !url.pathname.endsWith(".html") && url.pathname !== "/";
    headers.set("Cache-Control", isVersionedAsset ? "public, max-age=31536000, immutable" : "no-cache, no-store, must-revalidate");
    headers.set("X-Xiaowan-Version", VERSION);
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers
    });
  }
};
