import { createClient } from "@/lib/supabase/server";
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

    // 1. Fetch subscriptions for the receiver
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", receiverId);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: "No subscriptions found" });
    }

    // 2. Prepare payload
    const payload = JSON.stringify({
      title: `Pesan dari ${senderName || "Seseorang"}`,
      body: text || "[Gambar]",
      icon: senderAvatar || "/icon.png",
      url: `/chat/${session.user.id}`, // Redirect ke pengirim
      tag: messageId,
    });

    // 3. Send notifications
    const results = await Promise.allSettled(
      subs.map((s) => webpush.sendNotification(s.subscription as any, payload))
    );

    // 4. Handle expired subscriptions
    const expiredSubs = results
      .map((res, index) => {
        if (res.status === "rejected" && (res.reason.statusCode === 404 || res.reason.statusCode === 410)) {
          return subs[index].subscription;
        }
        return null;
      })
      .filter(Boolean);

    if (expiredSubs.length > 0) {
      // Cleanup database
      // This is a bit complex since subscription is a JSONB, we might need a better way to delete
      // For now, we'll just log it
      console.log(`Found ${expiredSubs.length} expired subscriptions`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
