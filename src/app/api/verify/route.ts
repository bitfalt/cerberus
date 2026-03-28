import { NextRequest, NextResponse } from "next/server";

// World ID verification endpoint using direct API call
// This verifies the proof on the backend using the World ID Developer API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proof, nullifier_hash, merkle_root, verification_level, action, signal } = body;

    if (!proof || !nullifier_hash || !merkle_root) {
      return NextResponse.json(
        { success: false, error: "Missing required proof fields" },
        { status: 400 }
      );
    }

    const app_id = process.env.WORLDCOIN_APP_ID;
    
    if (!app_id) {
      return NextResponse.json(
        { success: false, error: "Server configuration error: Missing app_id" },
        { status: 500 }
      );
    }

    // Call World ID API v2 for verification
    // https://docs.world.org/id/reference/api
    // Handle both string proof (v3) and array proof (v4)
    const proofString = Array.isArray(proof) ? proof.join(",") : proof;
    
    const verificationBody = {
      app_id,
      action: action || "cerberus-verify",
      signal: signal || "",
      proof: proofString,
      nullifier_hash,
      merkle_root,
      verification_level: verification_level || "device",
    };

    console.log("Verifying with World ID API:", {
      ...verificationBody,
      proof: proof.slice(0, 20) + "...",
    });

    const response = await fetch("https://developer.worldcoin.org/api/v2/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationBody),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return NextResponse.json({
        success: true,
        nullifier_hash,
        verification_level,
        message: "World ID verification successful",
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("World ID verification failed:", result);
      return NextResponse.json(
        { 
          success: false, 
          error: result.detail || result.error || "Verification failed",
          code: result.code,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("World ID verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
