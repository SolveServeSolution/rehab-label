import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, driveUrl } = body;

    if (!title || !driveUrl) {
      return NextResponse.json(
        { error: "Title and Drive URL are required" },
        { status: 400 }
      );
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        title,
        driveUrl,
      },
    });

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error("Failed to update video:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
