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

    const userResp = await supabaseAdmin.auth.getUser(token);
    const userId = userResp.data?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, actor_id, type, reference_id, reference_type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const actorIds = data.map((n) => n.actor_id).filter((v): v is string => Boolean(v));
    const postIds = data
      .filter((n) => n.reference_type === "post")
      .map((n) => n.reference_id)
      .filter((v): v is string => Boolean(v));
    const commentIds = data
      .filter((n) => n.reference_type === "comment")
      .map((n) => n.reference_id)
      .filter((v): v is string => Boolean(v));

    const profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin.from("user_profile").select("id, display_name, avatar_url").in("id", actorIds);
      profiles?.forEach((p) => {
        profilesMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
      });
    }

    const commentsMap = new Map<string, { id: string; text: string | null; post_id: string | null }>();
    if (commentIds.length > 0) {
      const { data: comments } = await supabaseAdmin.from("comments").select("id, text, post_id").in("id", commentIds);
      comments?.forEach((c) => {
        commentsMap.set(c.id, { id: c.id, text: c.text, post_id: c.post_id });
      });
    }

    const allPostIds = Array.from(
      new Set([
        ...postIds,
        ...Array.from(commentsMap.values())
          .map((c) => c.post_id)
          .filter((v): v is string => Boolean(v)),
      ])
    );

    const postsMap = new Map<string, { id: string; title: string | null; slug: string | null }>();
    if (allPostIds.length > 0) {
      const { data: posts } = await supabaseAdmin.from("post_content").select("post_id, title, slug").in("post_id", allPostIds);
      posts?.forEach((p) => {
        postsMap.set(p.post_id, { id: p.post_id, title: p.title, slug: p.slug });
      });
    }

    const notifications = [];
    for (const r of data) {
      const actor = r.actor_id ? profilesMap.get(r.actor_id) ?? null : null;
      const refType = r.reference_type ?? "post";
      const notifType = r.type?.toLowerCase() ?? "";

      let post: { id: string; title: string | null; slug: string | null } | null = null;
      let comment: { id: string; text: string | null } | null = null;

      if (refType === "post") {
        const postData = postsMap.get(r.reference_id ?? "");
        if (postData) post = { id: postData.id, title: postData.title, slug: postData.slug };

        if (["post_comment", "comment_post", "comment_reply"].includes(notifType)) {
          let commentData = null;

          // 1️⃣ kalau reference_type = 'comment', ambil langsung berdasarkan id
          if (r.reference_type === "comment" && r.reference_id) {
            const { data } = await supabaseAdmin.from("comments").select("id, text, post_id").eq("id", r.reference_id).single();
            commentData = data;
          }

          // 2️⃣ fallback kalau reference_type = 'post' (ambil komentar actor di post tsb)
          if (!commentData) {
            const { data } = await supabaseAdmin.from("comments").select("id, text, post_id").eq("post_id", r.reference_id).eq("user_id", r.actor_id).order("created_at", { ascending: false }).limit(1).single();
            commentData = data;
          }

          if (commentData) {
            comment = { id: commentData.id, text: commentData.text };
          }
        }
      } else if (refType === "comment") {
        const commentData = commentsMap.get(r.reference_id ?? "");
        if (commentData) {
          comment = { id: commentData.id, text: commentData.text };
          const relatedPost = commentData.post_id ? postsMap.get(commentData.post_id) : null;
          if (relatedPost) post = { id: relatedPost.id, title: relatedPost.title, slug: relatedPost.slug };
        }
      }

      notifications.push({
        id: r.id,
        user_id: r.user_id,
        actor_id: r.actor_id,
        type: r.type,
        reference_type: refType,
        reference_id: r.reference_id,
        is_read: r.is_read,
        created_at: r.created_at,
        actor,
        comment,
        post,
      });
    }

    const hasMore = notifications.length === limit;
    return NextResponse.json({ notifications, hasMore });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
