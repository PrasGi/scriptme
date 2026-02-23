import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker/Kubernetes and load balancers.
 * Used by docker healthcheck and Jenkins deployment verification.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "script-minder",
    timestamp: new Date().toISOString(),
  });
}
