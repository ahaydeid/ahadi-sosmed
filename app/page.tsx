import { getPublicPosts } from "@/lib/services/postService";
import Feed from "./components/Feed";
import TopBar from "./components/TopBar";
import TrendingPosts from "./components/TrendingPosts";
import SuggestedUsers from "./components/SuggestedUsers";
import FeaturedSection from "./components/FeaturedSection";
import TopicsCarousel from "./components/TopicsCarousel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda | Ahadi - Wadah Ekspresi dan Tulisan",
  description: "Temukan tulisan, opini, cerita perjalanan, dan ekspresi kreatif terbaru dari komunitas penulis Indonesia. Bergabunglah dengan Ahadi untuk berbagi pengalaman, pendapat, dan kreativitas Anda secara bebas.",
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 60;

export default async function Page() {
  let initialPosts: any[] = [];
  let featuredPosts: any[] = [];
  try {
    // Parallelize fetches to reduce initial load time
    const [latestPosts, popularPosts] = await Promise.all([
      getPublicPosts(10, 0, 'latest'),
      getPublicPosts(5, 0, 'popular')
    ]);
    
    initialPosts = latestPosts;
    featuredPosts = popularPosts;
  } catch (error) {
    console.error("Error loading posts:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50/10">
      <TopBar />
      
      <div className="max-w-7xl mx-auto md:px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Featured Posts Section */}
            <FeaturedSection posts={featuredPosts} />
            
            {/* Topics Carousel */}
            <TopicsCarousel />
            
            {/* Main Feed */}
            <Feed initialPosts={initialPosts} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              <TrendingPosts />
              <SuggestedUsers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
