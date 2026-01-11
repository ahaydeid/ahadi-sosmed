import { createClient } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:adihadi270@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    const { receiverId, text, messageId, senderName, senderAvatar } = await req.json();

    if (!receiverId) {
      return NextResponse.json({ error: "Receiver ID required" }, { status: 400 });
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", receiverId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title: `Pesan dari ${senderName || "Seseorang"}`,
      body: text || "[Gambar]",
      icon: senderAvatar || "/icon.png",
      url: `/chat/${session.user.id}`,
      tag: messageId,
    });

    const results = await Promise.allSettled(
      subs.map((s) => webpush.sendNotification(s.subscription as any, payload))
    );

    const expiredSubs = results
      .map((res, index) => {
        if (res.status === "rejected" && ((res as any).reason.statusCode === 404 || (res as any).reason.statusCode === 410)) {
          return subs[index].subscription;
        }
        return null;
      })
      .filter(Boolean);

    if (expiredSubs.length > 0) {
        // Optional: Implement cleanup for expired subscriptions here
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
