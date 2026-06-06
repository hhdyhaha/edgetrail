import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "#/paraglide/server";

export default {
  fetch(request: Request): Response | Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return handler.fetch(request);
    }
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
