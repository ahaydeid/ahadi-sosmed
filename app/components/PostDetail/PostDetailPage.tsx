"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MoreVertical, Edit, User } from "lucide-react";
import PostActions from "./PostActions";
import PostComments from "../PostComments";
import CommentInput from "../CommentInput";
import ModalLikes from "@/app/components/ModalLikes";
import { usePostDetailData } from "./usePostDetailData";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RepostModal from "@/app/components/RepostModal";
import { extractPreviewText, extractFirstImage } from "@/lib/utils/html";

export default function PostDetailPage({ initialPostId, initialSlug }: { initialPostId?: string; initialSlug?: string }) {
  const { post, user, loading, authChecked, hasApresiasi, showLikes, likeCount, authorId, isFollowing, followBusy, setShowLikes, handleApresiasi, handleToggleFollow, handleShare, redirectToLogin } = usePostDetailData(
    initialPostId,
    initialSlug
  );

  const [showMenu, setShowMenu] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const router = useRouter();

  const handleRepostClick = () => {
    if (!user) {
        redirectToLogin();
        return;
    }
    setShowRepostModal(true);
  };

  const submitRepost = async (comment: string) => {
    if (!post || !user) return;

    try {
        // 1. Create new Post entry with repost_of
        const { data: newPost, error: postError } = await supabase
            .from("post")
            .insert([{ 
                user_id: user.id,
                repost_of: post.id // Link to original post
            }])
            .select("id")
            .single();

        if (postError) throw postError;

        // 2. Create content for the repost (the comment becomes the title/desc of the repost wrapper?)
        // Repost structure: 
        // Title: "Reposting [Original Title]" (or user custom title?)
        // Description: The comment the user typed.
        // Slug: generated.
        // Actually, for reposts, typically the 'content' is the user's thought.
        
        const slug = `repost-${Date.now().toString(36)}`;
        
        const { error: contentError } = await supabase
            .from("post_content")
            .insert([{
                post_id: newPost.id,
                title: user.user_metadata?.full_name || "Repost", // Generic title or user name?
                description: comment, // User's comment
                author_image: user.user_metadata?.avatar_url,
                slug: slug
            }]);

        if (contentError) throw contentError;

        alert("Berhasil me-repost!");
        // Navigate to the new repost or stay? Usually stay or go to profile.
        // router.push(`/post/${slug}`); 
    } catch (error: any) {
        console.error("Repost error:", error);
        alert("Gagal me-repost: " + (error.message || "Terjadi kesalahan"));
    }
  };

  if (loading || !post) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat postingan...</div>;
  }

  const showFollow = authorId && (!user || (user && authorId !== user.id));
  const isSelf = !!user && authorId === user.id;


  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ahadi.my.id";
  const postUrl = `${baseUrl}/post/${post.slug || post.id}`;
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
    "author": {
      "@type": "Person",
      "name": post.author,
    },
    "image": post.description.match(/<img[^>]*\s+src=["']([^"'>]+)["']/i)?.[1] || `${baseUrl}/icon.png`,
    "datePublished": post.date, // Assuming post.date is ISO or localized but valid enough for schema
    "url": postUrl,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": postUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ahadi",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/icon.png`
      }
    }
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Beranda",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": post.title,
        "item": postUrl
      }
    ]
  };

  return (
    <div className="min-h-screen p-4 ">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Header atas dengan tombol kembali */}
      <nav className="sticky top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-10 flex items-center px-4 -mx-4 justify-between" aria-label="Navigasi Post">
        <button onClick={() => window.history.back()} className="rounded-full hover:bg-gray-100 transition p-1" aria-label="Kembali ke halaman sebelumnya">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center mx-2 truncate">
          <p className="font-base text-gray-800 truncate" aria-hidden="true">Tulisan {post.author}</p>
        </div>
        
        {/* Right side spacer or Menu */}
        <div className="w-8 flex justify-end">
          {isSelf && (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="p-1 rounded-full hover:bg-gray-100 transition"
                aria-label="Menu Opsi Post"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white shadow-lg rounded-md border border-gray-100 z-50 py-1">
                    <Link href={`/edit/${post.id}`} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                       <Edit className="w-4 h-4" />
                       <span>Edit</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      <article>
        <header>
          {/* Judul & tanggal */}
          {!post.repost_of && (
              <h1 className="text-2xl text-gray-800 mt-5 font-bold leading-snug mb-2">{post.title}</h1>
          )}
          <time className="text-sm text-gray-600 mb-3 block" dateTime={post.date}>{post.date}</time>

          {/* BAGIAN AUTHOR dipindahkan ke sini */}
          <div className="flex items-center gap-2 mb-4 mt-4">
            {authorId ? (
              <Link href={`/profile/${authorId}`} className="flex items-center gap-2 group cursor-pointer" aria-label={`Lihat profil ${post.author}`}>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center ring-1 ring-transparent group-hover:ring-gray-300 transition">
                  {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <User className="w-5 h-5 text-gray-500 m-auto" />}
                </div>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  {post.author}
                  {post.author_verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
                </span>
              </Link>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center">
                  {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
                </div>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  {post.author}
                  {post.author_verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
                </span>
              </>
            )}

            {isSelf ? (
              <span className="text-sm rounded-full px-3 py-0.5 border border-gray-300 italic bg-gray-50 text-gray-600">saya</span>
            ) : (
              showFollow && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followBusy}
                  className={`text-sm rounded-full px-3 py-0.5 transition ${isFollowing ? "border border-gray-300 text-gray-600 italic hover:bg-gray-100" : "border border-sky-500 text-sky-500 hover:bg-sky-50"}`}
                >
                  {isFollowing ? "mengikuti" : "ikuti"}
                </button>
              )
            )}
          </div>
        </header>

        {/* Deskripsi */}
        <div className="text-base text-gray-800 leading-relaxed space-y-4 mb-6 prose max-w-none">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.description }} />
        </div>

        {/* Repost Content - Quote Style - MOVED OUTSIDE PROSE TO AVOID CSS CONFLICTS */}
          {post.repost_of && (
            <div className="mt-2 mb-6 pl-4 border-l-4 border-gray-900 flex gap-4 transition cursor-pointer group hover:bg-gray-50 p-2 rounded-r-lg" onClick={(e) => {
                e.preventDefault();
                router.push(`/post/${post.repost_of!.id}`); 
            }}>
                <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 bg-gray-200 rounded-full overflow-hidden shrink-0">
                            {post.repost_of.authorImage ? (
                                <Image 
                                    src={post.repost_of.authorImage} 
                                    alt={post.repost_of.author} 
                                    width={20} 
                                    height={20} 
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <User className="w-3 h-3 text-gray-500 m-auto mt-1" />
                            )}
                        </div>
                        <span className="font-bold text-sm text-gray-900 truncate">{post.repost_of.author}</span>
                    </div>
                    
                    <p className="font-bold text-lg text-gray-900 leading-snug mb-1 line-clamp-2">{post.repost_of.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {extractPreviewText(post.repost_of.description)}
                    </p>
                </div>

                 {/* Thumbnail Image if exists */}
                 {post.repost_of.imageUrl && (
                    <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 overflow-hidden bg-gray-100 block">
                        <img 
                            src={post.repost_of.imageUrl} 
                            alt={post.repost_of.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                    </div>
                 )}
            </div>
          )}
      </article>

      {/* Sumber / Links Footer */}
      {(() => {
        const links = new Set<string>();
        // 1. Ambil dari href (link biasa)
        const hrefMatches = post.description.matchAll(/href="([^"]+)"/g);
        for (const m of hrefMatches) links.add(m[1]);
        
        // 2. Ambil dari tautan gambar eksternal (yang dipaste, bukan diupload)
        const srcMatches = post.description.matchAll(/src="([^"]+)"/g);
        for (const m of srcMatches) {
          const url = m[1];
          // Kecualikan gambar yang diupload ke storage internal kita (supabase post-images)
          if (url.startsWith('http') && !url.includes('/storage/v1/object/public/post-images/')) {
            links.add(url);
          }
        }
        
        // 3. Ambil dari atribut LinkCard (Link Preview)
        const urlMatches = post.description.matchAll(/url="([^"]+)"/g);
        for (const m of urlMatches) {
          if (m[1].startsWith('http')) links.add(m[1]);
        }

        if (links.size === 0) return null;

        return (
          <div className="mt-8 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Sumber:</h3>
            <ul className="space-y-1">
              {Array.from(links).map((link, idx) => {
                let displayLabel = link;
                try {
                  const urlObj = new URL(link);
                  displayLabel = urlObj.hostname.replace(/^www\./, '');
                } catch (e) {
                  // Fallback to original if not a valid URL
                }
                
                return (
                  <li key={idx} className="truncate">
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-sky-600 hover:underline"
                    >
                      {displayLabel}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {/* Aksi post */}
      {/* Aksi post */}
      <PostActions 
        hasApresiasi={hasApresiasi} 
        likeCount={likeCount} 
        views={post.views} 
        comments={post.comments} 
        onApresiasi={handleApresiasi} 
        onShowLikes={() => setShowLikes(true)} 
        onShare={handleShare} 
        onRepost={handleRepostClick}
      />

      <hr className="my-4 border-gray-200" />

      {/* Komentar */}
      {authChecked &&
        (user ? (
          <CommentInput postId={post.id} />
        ) : (
          <button onClick={redirectToLogin} className="px-4 py-2 text-left text-sky-600 hover:bg-sky-50 rounded transition text-sm">
            Login untuk berkomentar
          </button>
        ))}

      <h2 className="text-lg font-bold mb-4 mt-4">Komentar</h2>
      <PostComments key={post.id} postId={post.id} />

      {/* Modal Likes */}
      <ModalLikes postId={post.id} open={showLikes} onClose={() => setShowLikes(false)} />
      
      {/* Modal Repost */}
      <RepostModal 
        isOpen={showRepostModal} 
        onClose={() => setShowRepostModal(false)}
        onSubmit={submitRepost}
        originalPost={{
            id: post.id,
            author: post.author,
            author_image: post.author_image,
            title: post.title,
            date: post.date
        }}
      />
    </div>
  );
}
