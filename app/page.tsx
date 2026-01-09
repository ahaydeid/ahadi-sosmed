import { getPublicPosts } from "@/lib/services/postService";
import Feed from "./components/Feed";
import TopBar from "./components/TopBar";
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
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <Feed initialPosts={initialPosts} />
    </div>
  );
}
