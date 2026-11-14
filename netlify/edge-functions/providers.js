import { handleProviderRequest } from "../../provider-api.mjs";

export default function handler(request) {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  return handleProviderRequest(new URL(request.url), name => Netlify.env.get(name));
}

export const config = {
  path: [
    "/api/provider-status", "/flight/api/provider-status",
    "/api/aviationstack", "/flight/api/aviationstack",
    "/api/carto/*", "/flight/api/carto/*",
  ],
};
