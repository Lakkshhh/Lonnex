import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer.auth.resetPasswordForEmail(email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Check your email for a reset link.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while sending the reset link." },
      { status: 500 }
    );
  }
}
