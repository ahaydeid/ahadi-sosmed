import { getPublicPosts } from "@/lib/services/postService";
import Feed from "./components/Feed";
import TopBar from "./components/TopBar";
import TrendingPosts from "./components/TrendingPosts";
import SuggestedUsers from "./components/SuggestedUsers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda | Ahadi - Wadah Ekspresi dan Tulisan",
  description: "Temukan tulisan, opini, dan ekspresi kreatif terbaru dari komunitas Ahadi. Bagikan pemikiran Anda secara bebas.",
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 60;

export default async function Page() {
  let initialPosts = [];
  try {
    initialPosts = await getPublicPosts();
  } catch (error) {
    console.error("Error loading posts:", error);
    return <p className="text-center text-gray-500 mt-10">Gagal memuat postingan</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50/10">
      <TopBar />
      
      <div className="max-w-7xl mx-auto px-2 md:px-4 md:py-4 py-1">
        <div className="flex gap-6 items-start justify-center">
          {/* Main Feed Content */}
          <div className="flex-1 min-w-0 max-w-4xl">
            <Feed initialPosts={initialPosts} />
          </div>

          {/* Sidebar - Desktop Only */}
          <aside className="hidden lg:block w-[350px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <TrendingPosts />
              <SuggestedUsers />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
