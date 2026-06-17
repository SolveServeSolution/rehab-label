import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/videos/[id]/labels — Get all labels for a video
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const labels = await prisma.label.findMany({
      where: { videoId: id },
      orderBy: { repetitionNum: "asc" },
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

// POST /api/videos/[id]/labels — Create or update a label
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { repetitionNum, startTime, endTime, score } = body;

    if (
      repetitionNum === undefined ||
      startTime === undefined ||
      endTime === undefined
    ) {
      return NextResponse.json(
        { error: "repetitionNum, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    if (repetitionNum < 1 || repetitionNum > 10) {
      return NextResponse.json(
        { error: "repetitionNum must be between 1 and 10" },
        { status: 400 }
      );
    }

    if (score !== undefined && score !== null && (score < 0 || score > 2)) {
      return NextResponse.json(
        { error: "score must be 0, 1, or 2" },
        { status: 400 }
      );
    }

    // Upsert — create or update
    const label = await prisma.label.upsert({
      where: {
        videoId_repetitionNum: {
          videoId: id,
          repetitionNum,
        },
      },
      update: {
        startTime,
        endTime,
        score: score ?? null,
      },
      create: {
        videoId: id,
        repetitionNum,
        startTime,
        endTime,
        score: score ?? null,
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error("Error saving label:", error);
    return NextResponse.json(
      { error: "Failed to save label" },
      { status: 500 }
    );
  }
}

// PUT /api/videos/[id]/labels — Batch update scores
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { labels } = body as {
      labels: Array<{
        repetitionNum: number;
        startTime: number;
        endTime: number;
        score: number | null;
      }>;
    };

    if (!Array.isArray(labels)) {
      return NextResponse.json(
        { error: "labels array is required" },
        { status: 400 }
      );
    }

    // Use a transaction for batch updates
    const results = await prisma.$transaction(
      labels.map((label) =>
        prisma.label.upsert({
          where: {
            videoId_repetitionNum: {
              videoId: id,
              repetitionNum: label.repetitionNum,
            },
          },
          update: {
            startTime: label.startTime,
            endTime: label.endTime,
            score: label.score,
          },
          create: {
            videoId: id,
            repetitionNum: label.repetitionNum,
            startTime: label.startTime,
            endTime: label.endTime,
            score: label.score,
          },
        })
      )
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error batch updating labels:", error);
    return NextResponse.json(
      { error: "Failed to batch update labels" },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id]/labels — Delete a label by repetitionNum
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const repNum = searchParams.get("repetitionNum");

    if (!repNum) {
      return NextResponse.json(
        { error: "repetitionNum query param is required" },
        { status: 400 }
      );
    }

    await prisma.label.delete({
      where: {
        videoId_repetitionNum: {
          videoId: id,
          repetitionNum: parseInt(repNum),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting label:", error);
    return NextResponse.json(
      { error: "Failed to delete label" },
      { status: 500 }
    );
  }
}
