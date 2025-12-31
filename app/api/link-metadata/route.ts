import { NextResponse } from "next/server";
import { parse } from "node-html-parser";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const html = await response.text();
    const root = parse(html);

    const getMeta = (name: string) => {
      return (
        root.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
        root.querySelector(`meta[name="${name}"]`)?.getAttribute("content")
      );
    };

    const title = getMeta("og:title") || root.querySelector("title")?.text || url;
    const description = getMeta("og:description") || getMeta("description") || "";
    const image = getMeta("og:image") || "";
    const siteName = getMeta("og:site_name") || new URL(url).hostname;

    return NextResponse.json({
      title,
      description,
      image,
      siteName,
      url,
    });
  } catch (error) {
    console.error("Link metadata error:", error);
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
