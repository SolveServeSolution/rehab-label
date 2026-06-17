import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const driveUrl = searchParams.get("url");

  if (!driveUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Extract file ID from drive URL
  const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!fileIdMatch) {
    return NextResponse.json({ error: "Invalid Google Drive URL" }, { status: 400 });
  }

  const fileId = fileIdMatch[1];
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const downloadUrl = apiKey && apiKey !== "PASTE_YOUR_API_KEY_HERE"
    ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`
    : `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

  try {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    // Forward the video stream to the client
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "video/mp4");
    headers.set("Access-Control-Allow-Origin", "*");
    
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy video" }, { status: 500 });
  }
}
