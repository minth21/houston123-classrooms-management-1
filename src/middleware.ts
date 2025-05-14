import { NextRequest, NextResponse } from "next/server";

// This middleware function will add CORS headers to responses
export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Get the origin from the request
  const origin = requestHeaders.get("origin") || "*";

  // Create a new response with the CORS headers
  const response = NextResponse.next({
    request: {
      // Pass through the original headers
      headers: requestHeaders,
    },
  });

  // Add CORS headers for all routes starting with /api
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/auth/token")
  ) {
    // Add CORS headers
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

// Configure the middleware to run only for API routes and auth token route
export const config = {
  matcher: ["/api/:path*", "/auth/token"],
};
