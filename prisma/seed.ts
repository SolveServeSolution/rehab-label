import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const sampleVideos = [
  {
    title: "Patient A - Shoulder Flexion Exercise",
    driveUrl: "https://drive.google.com/file/d/EXAMPLE_ID_1/preview",
  },
  {
    title: "Patient B - Knee Extension Exercise",
    driveUrl: "https://drive.google.com/file/d/EXAMPLE_ID_2/preview",
  },
  {
    title: "Patient C - Elbow Flexion Exercise",
    driveUrl: "https://drive.google.com/file/d/EXAMPLE_ID_3/preview",
  },
  {
    title: "Patient D - Wrist Rotation Exercise",
    driveUrl: "https://drive.google.com/file/d/EXAMPLE_ID_4/preview",
  },
  {
    title: "Patient E - Hip Abduction Exercise",
    driveUrl: "https://drive.google.com/file/d/EXAMPLE_ID_5/preview",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.label.deleteMany();
  await prisma.video.deleteMany();

  // Create videos
  for (const video of sampleVideos) {
    const created = await prisma.video.create({
      data: video,
    });
    console.log(`  ✓ Created video: ${created.title}`);
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
