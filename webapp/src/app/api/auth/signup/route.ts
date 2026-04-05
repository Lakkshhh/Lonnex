import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const takenAccountMessage = "An account with this email already exists.";

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Username, email, and password are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
    });

    if (error) {
      const errorMessage = error.message.toLowerCase().includes("already")
        ? takenAccountMessage
        : error.message;

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Unable to create account right now." },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseServer.from("profiles").insert({
      id: data.user.id,
      email,
      username,
    });

    if (profileError) {
      const errorMessage = profileError.message
        .toLowerCase()
        .includes("duplicate")
        ? takenAccountMessage
        : profileError.message;

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({
      session: data.session,
      user: data.user,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while creating your account." },
      { status: 500 }
    );
  }
}
