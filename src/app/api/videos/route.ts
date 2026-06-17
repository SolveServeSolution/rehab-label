import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/videos — List all videos with label counts
export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      include: {
        labels: {
          orderBy: { repetitionNum: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// POST /api/videos — Create a new video
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, driveUrl, duration } = body;

    if (!title || !driveUrl) {
      return NextResponse.json(
        { error: "Title and driveUrl are required" },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        title,
        driveUrl,
        duration: duration || null,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}
