// lib/linkToPost.ts
import type { UrlObject } from "url";

export function linkToPost({ id, slug }: { id: string; slug?: string | null }): UrlObject {
  return { pathname: `/post/${slug ?? id}` };
}

// <Link href={linkToPost({ id: post.id, slug: post.slug })}>Baca</Link>
