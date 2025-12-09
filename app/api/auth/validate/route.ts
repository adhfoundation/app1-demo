import { NextRequest, NextResponse } from "next/server";
import { validateJWT } from "@/lib/jwt-validator";

const cache = new Map<string, { valid: boolean; payload?: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Verifica cache
    const cached = cache.get(token);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ valid: cached.valid, payload: cached.payload });
    }

    // Valida JWT usando JWKS
    const result = await validateJWT(token);

    // Atualiza cache
    cache.set(token, {
      valid: result.valid,
      payload: result.payload,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      valid: result.valid,
      payload: result.payload,
    });
  } catch (error) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
