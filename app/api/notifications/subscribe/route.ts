import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: "Subscription required" }, { status: 400 });
    }

    // Save to database
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: session.user.id,
        subscription: subscription,
      }, { onConflict: "user_id,subscription" });

    if (error) {
      console.error("Error saving subscription:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      const { subscription } = await req.json();
  
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", session.user.id)
        .eq("subscription", JSON.stringify(subscription));
  
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
  
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
