import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

const drive = google.drive({
  version: "v3",
  auth: API_KEY,
});

async function getAllFilesFromFolder(folderId: string, currentFolderName: string = ""): Promise<{ name: string; id: string; folderName: string }[]> {
  const allFiles: { name: string; id: string; folderName: string }[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageToken,
    });

    const files = res.data.files || [];
    
    for (const file of files) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        // Recursively get files from subfolders, pass subfolder name
        const subFiles = await getAllFilesFromFolder(file.id!, file.name!);
        allFiles.push(...subFiles);
      } else if (file.mimeType?.startsWith("video/")) {
        // It's a video file
        allFiles.push({ name: file.name!, id: file.id!, folderName: currentFolderName });
      }
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return allFiles;
}

export async function POST(request: Request) {
  try {
    if (!API_KEY || API_KEY === "PASTE_YOUR_API_KEY_HERE") {
      return NextResponse.json(
        { error: "Google Drive API Key is not configured." },
        { status: 500 }
      );
    }

    const { folderUrl } = await request.json();

    if (!folderUrl) {
      return NextResponse.json({ error: "folderUrl is required" }, { status: 400 });
    }

    // Extract folder ID from URL
    const folderIdMatch = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    let folderId = "";
    if (folderIdMatch) {
      folderId = folderIdMatch[1];
    } else {
      // Sometimes it might just be the ID or a different format
      const idMatch = folderUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch) folderId = idMatch[1];
      else folderId = folderUrl.trim(); // Assume it's an ID if no match
    }

    if (!folderId) {
      return NextResponse.json({ error: "Could not extract Folder ID from URL" }, { status: 400 });
    }

    // Fetch all video files recursively
    const videoFiles = await getAllFilesFromFolder(folderId);

    if (videoFiles.length === 0) {
      return NextResponse.json({ message: "No video files found in the folder." }, { status: 404 });
    }

    // Prepare data for database
    const videosToCreate = videoFiles.map((file) => ({
      title: file.name,
      driveUrl: `https://drive.google.com/file/d/${file.id}/preview`,
      folderName: file.folderName || null,
    }));

    // Insert into database
    // Prisma createMany does not return the created records, so we will create them individually to return them if needed,
    // or just use createMany and then fetch them or just return success count.
    const createdCount = await prisma.video.createMany({
      data: videosToCreate,
      skipDuplicates: true, // Avoid inserting exact duplicates if title and driveUrl were unique (we don't have unique constraint, but it's safe)
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${createdCount.count} videos.`,
      count: createdCount.count 
    });

  } catch (error: any) {
    console.error("Error importing folder:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import folder" },
      { status: 500 }
    );
  }
}
