import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/"],
  ignoredRoutes: [
    "/favicon.ico",
    "/_next/static/(.*)",
    "/_next/image",
    "/api/webhooks/(.*)"
  ]
});

