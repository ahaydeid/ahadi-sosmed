import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page") ?? "1";
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = 10;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
    }

    const authUserId = userData.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin.from("user_profile").select("id").eq("id", authUserId).single();

    if (profileError || !profile) {
      console.error("Profil tidak ditemukan:", profileError);
      return NextResponse.json({ error: "Profil pengguna tidak ditemukan" }, { status: 404 });
    }

    const profileId = profile.id;

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(
        `
        id,
        type,
        is_read,
        created_at,
        reference_post_id,
        reference_comment_id,
        actor:actor_id (
          id,
          display_name,
          avatar_url
        ),
        post:reference_post_id (
          post_id,
          title,
          slug
        ),
        comment:reference_comment_id (
          id,
          text,
          post_id
        )
      `
      )
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const raw = data ?? [];

    const flat = raw.map((n) => {
      const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
      const post = Array.isArray(n.post) ? n.post[0] : n.post;
      const comment = Array.isArray(n.comment) ? n.comment[0] : n.comment;

      return {
        id: n.id,
        type: n.type,
        is_read: n.is_read,
        created_at: n.created_at,
        actor: actor
          ? {
              id: actor.id,
              display_name: actor.display_name,
              avatar_url: actor.avatar_url,
            }
          : null,
        post: post
          ? {
              id: post.post_id,
              title: post.title,
              slug: post.slug,
            }
          : null,
        comment: comment
          ? {
              id: comment.id,
              text: comment.text,
            }
          : null,
        reference_post_id: n.reference_post_id ?? null,
        reference_comment_id: n.reference_comment_id ?? null,
      };
    });

    // 🔹 Grouping hanya untuk like & komentar post
    const groups = new Map<string, typeof flat>();

    for (const item of flat) {
      const isGroupable = item.type === "post_like" || item.type === "post_comment" || item.type === "comment_post";
      const key = isGroupable ? `${item.type}_${item.post?.id ?? ""}` : `${item.type}_${item.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const groupedNotifications = Array.from(groups.values()).map((items) => {
      const first = items[0];
      const actors = items.map((i) => i.actor).filter((a): a is NonNullable<typeof a> => !!a);
      const total = actors.length;

      let summary = "";
      if (total === 1) {
        summary = `<b>${actors[0].display_name}</b>`;
      } else if (total === 2) {
        summary = `<b>${actors[0].display_name}</b> dan <b>${actors[1].display_name}</b>`;
      } else {
        summary = `<b>${actors[0].display_name}</b>, <b>${actors[1].display_name}</b>, dan <b>${total - 2}</b> lainnya`;
      }

      if (first.type === "post_like") summary += " menyukai tulisan anda";
      else if (first.type === "post_comment" || first.type === "comment_post") summary += " mengomentari tulisan anda";
      else if (first.type === "comment_reply") summary += " membalas komentar anda";
      else if (first.type === "mention") summary += " menyebut anda dalam komentar";
      else if (first.type === "follow") summary += " mulai mengikuti anda";

      return {
        id: first.id,
        ids: items.map((i) => i.id), // 👈 tambahkan ini
        type: first.type,
        is_read: first.is_read,
        created_at: first.created_at,
        summary,
        actors,
        post: first.post,
        comment: first.comment,
        reference_post_id: first.reference_post_id ?? null,
        reference_comment_id: first.reference_comment_id ?? null,
      };
    });

    const hasMore = groupedNotifications.length === limit;
    return NextResponse.json({ notifications: groupedNotifications, hasMore });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
