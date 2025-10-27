"use client";

import { Suspense } from "react";
import Feed from "./components/Feed";

export default function Page() {
  return (
    <Suspense>
      <Feed />
    </Suspense>
  );
}
