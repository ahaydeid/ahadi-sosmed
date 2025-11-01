import { ChevronLeft } from "lucide-react";

interface Props {
  author: string;
}

export default function PostHeader({ author }: Props) {
  return (
    <div className="sticky top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-10 flex items-center px-4 -mx-4">
      <button onClick={() => window.history.back()} className="absolute left-4 rounded-full hover:bg-gray-100 transition z-20" aria-label="Kembali">
        <ChevronLeft className="w-6 h-6 text-gray-800" />
      </button>
      <div className="flex-1 text-center">
        <h2 className="font-base text-gray-800 truncate">Tulisan {author}</h2>
      </div>
    </div>
  );
}
