import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const invalidCredentialsMessage = "Incorrect email or password.";

export async function POST(request: Request) {
  try {
    const { email, identifier, password } = await request.json();

    if ((!email && !identifier) || !password) {
      return NextResponse.json(
        { error: "Email or username and password are required." },
        { status: 400 }
      );
    }

    let loginEmail = (email ?? identifier ?? "").trim().toLowerCase();

    if (!loginEmail.includes("@")) {
      const { data: profile, error: profileError } = await supabaseServer
        .from("profiles")
        .select("email")
        .eq("username", loginEmail)
        .maybeSingle();

      if (profileError || !profile?.email) {
        return NextResponse.json(
          { error: invalidCredentialsMessage },
          { status: 400 }
        );
      }

      loginEmail = profile.email;
    }

    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: invalidCredentialsMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      session: data.session,
      user: data.user,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while logging in." },
      { status: 500 }
    );
  }
}
