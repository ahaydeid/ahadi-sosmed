"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rect";
}

export function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  const variantClasses = {
    circle: "rounded-full",
    text: "h-4 w-full rounded",
    rect: "rounded-md",
  };
  
  return (
    <div
      suppressHydrationWarning
      className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className || ""}`}
    />
  );
}

export function PostSkeleton() {
  return (
    <div suppressHydrationWarning className="bg-white border-b border-gray-100 p-4 animate-pulse">
      <div suppressHydrationWarning className="flex items-center gap-3 mb-4">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div suppressHydrationWarning className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/4 h-4" />
          <Skeleton variant="text" className="w-1/6 h-3" />
        </div>
      </div>
      <div suppressHydrationWarning className="space-y-3 mb-4">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-3/4 h-4" />
      </div>
      <Skeleton variant="rect" className="w-full aspect-video rounded-xl mb-4" />
      <div suppressHydrationWarning className="flex gap-6">
        <Skeleton variant="text" className="w-12 h-4" />
        <Skeleton variant="text" className="w-12 h-4" />
        <Skeleton variant="text" className="w-12 h-4" />
      </div>
    </div>
  );
}

export function NotifSkeleton() {
  return (
    <div suppressHydrationWarning className="flex items-center gap-4 p-4 border-b border-gray-50 animate-pulse">
      <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
      <div suppressHydrationWarning className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4 h-4" />
        <Skeleton variant="text" className="w-1/4 h-3" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div suppressHydrationWarning className="animate-pulse">
      <div suppressHydrationWarning className="h-48 bg-gray-200 w-full" />
      <div suppressHydrationWarning className="px-4 -mt-12">
        <div suppressHydrationWarning className="flex justify-between items-end mb-4">
          <Skeleton variant="circle" className="w-24 h-24 border-4 border-white" />
          <Skeleton variant="rect" className="w-28 h-9 rounded-full mb-2" />
        </div>
        <div suppressHydrationWarning className="space-y-4">
          <div suppressHydrationWarning className="space-y-2">
            <Skeleton variant="text" className="w-1/3 h-6" />
            <Skeleton variant="text" className="w-1/4 h-4" />
          </div>
          <Skeleton variant="text" className="w-2/3 h-4" />
          <div suppressHydrationWarning className="flex gap-4">
            <Skeleton variant="text" className="w-20 h-4" />
            <Skeleton variant="text" className="w-20 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div suppressHydrationWarning className="flex items-start mb-3 p-2 -mx-2 gap-3 animate-pulse">
      <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
      <div suppressHydrationWarning className="flex-1 space-y-2 py-1">
        <Skeleton variant="text" className="w-1/3 h-4" />
        <Skeleton variant="text" className="w-2/3 h-3" />
      </div>
      <div suppressHydrationWarning className="w-10 flex flex-col items-end pt-1">
        <Skeleton variant="text" className="w-8 h-3" />
      </div>
    </div>
  );
}

export function ChatDetailSkeleton() {
  return (
    <div suppressHydrationWarning className="flex flex-col gap-4 p-4 animate-pulse">
      <div suppressHydrationWarning className="flex justify-start">
        <div suppressHydrationWarning className="w-[70%] h-12 rounded-xl bg-gray-200" />
      </div>
      <div suppressHydrationWarning className="flex justify-end">
        <div suppressHydrationWarning className="w-[60%] h-10 rounded-xl bg-green-100" />
      </div>
      <div suppressHydrationWarning className="flex justify-start">
        <div suppressHydrationWarning className="w-[50%] h-16 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

export function RageSkeleton() {
  return (
    <div suppressHydrationWarning className="p-4 border-b border-gray-100 md:p-6 flex gap-3 animate-pulse">
      <div suppressHydrationWarning className="flex-1">
        <div suppressHydrationWarning className="flex items-center gap-2 mb-3">
          <Skeleton variant="circle" className="w-8 h-8" />
          <div suppressHydrationWarning className="flex flex-col gap-1">
            <Skeleton variant="text" className="w-24 h-4" />
            <Skeleton variant="text" className="w-20 h-3" />
          </div>
        </div>
        <div suppressHydrationWarning className="space-y-2">
          <Skeleton variant="text" className="w-full h-4" />
          <Skeleton variant="text" className="w-full h-4" />
          <Skeleton variant="text" className="w-2/3 h-4" />
        </div>
        <div suppressHydrationWarning className="flex items-center gap-4 mt-4">
          <Skeleton variant="rect" className="w-16 h-6 rounded-full" />
          <Skeleton variant="text" className="w-8 h-4" />
          <Skeleton variant="text" className="w-8 h-4" />
        </div>
      </div>
    </div>
  );
}
