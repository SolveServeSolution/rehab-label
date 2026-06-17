import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Reset all scores to null
    await prisma.label.updateMany({
      data: { score: null },
    });

    return NextResponse.json({ message: "All scores cleared successfully" });
  } catch (error) {
    console.error("Failed to clear scores:", error);
    return NextResponse.json(
      { error: "Failed to clear scores" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Delete all videos (cascade will delete labels)
    await prisma.video.deleteMany({});

    return NextResponse.json({ message: "All videos deleted successfully" });
  } catch (error) {
    console.error("Failed to delete videos:", error);
    return NextResponse.json(
      { error: "Failed to delete videos" },
      { status: 500 }
    );
  }
}
