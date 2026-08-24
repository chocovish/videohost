import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@videohost/db";

const STARTER_OFFERINGS = [
  {
    type: "PLAYLIST",
    title: "Next-Gen Full-Stack & Video Architecture Series",
    subtitle: "From Zero to Production-Ready Video Platform",
    description: "Learn how to build, transcode, stream, and monetize video applications with Next.js, HLS streaming, WebRTC live meetings, and distributed cloud object storage.",
    price: "$149",
    pricePeriod: "one-time",
    badge: "Bestseller",
    ctaText: "Explore Playlist",
    ctaUrl: "#inquiry",
    highlights: [
      "12+ Hours of HD Video Content",
      "Full Next.js + LiveKit Source Code",
      "Private Discord & Code Reviews",
      "Certificate of Completion",
    ],
    deliveryFormat: "Curated Playlist & Code Repo",
    order: 0,
    isFeatured: true,
    isPublished: true,
  },
  {
    type: "MEETING",
    title: "Live Architecture & System Review Meeting",
    subtitle: "Interactive live session & technical system consultation",
    description: "Deep dive into your project architecture, code bottlenecks, cloud streaming pipeline, or tech career roadmap with interactive live video consultation.",
    price: "$120",
    pricePeriod: "/ session",
    badge: "Limited Seats",
    ctaText: "Join Meeting",
    ctaUrl: "#inquiry",
    highlights: [
      "Live Interactive Video Session",
      "High-Definition Recording Included",
      "Architecture Diagram & Action Checklist",
      "Follow-up QA Support",
    ],
    meetingDuration: "45 mins",
    deliveryFormat: "Live Video Meeting",
    order: 1,
    isFeatured: true,
    isPublished: true,
  },
  {
    type: "VIDEO",
    title: "Production System Architecture Breakdown 2026",
    subtitle: "Deep-dive showreel & distributed streaming demo",
    description: "An exclusive walkthrough analyzing how multi-bitrate HLS adaptive renditions and real-time WebRTC conferencing work under high concurrency.",
    price: "Free",
    pricePeriod: "showcase",
    badge: "Featured Showreel",
    ctaText: "Watch Breakdown",
    ctaUrl: "#showcase",
    highlights: [
      "Complete Technical Walkthrough",
      "Real-World Concurrency Metrics",
      "Interactive Architecture Diagrams",
    ],
    deliveryFormat: "Free Video Showcase",
    order: 2,
    isFeatured: false,
    isPublished: true,
  },
  {
    type: "PRODUCT",
    title: "Ultra-Fast Video Streaming & UI Starter Kit",
    subtitle: "Production-ready templates with Tailwind & Radix UI",
    description: "A complete developer template with custom Video.js HLS players, adaptive bitrate switchers, screen recorders, and glassmorphic dashboards.",
    price: "$49",
    pricePeriod: "one-time",
    badge: "New Release",
    ctaText: "Get Starter Kit",
    ctaUrl: "#inquiry",
    highlights: [
      "Clean TypeScript & Next.js 16 Setup",
      "Glassmorphic Dark Mode Components",
      "Commercial Use License Included",
    ],
    deliveryFormat: "Instant GitHub & ZIP Download",
    order: 3,
    isFeatured: false,
    isPublished: true,
  },
  {
    type: "SERVICE",
    title: "Custom Cloud Infrastructure & Streaming Setup",
    subtitle: "End-to-end consulting and custom deployment",
    description: "We design, deploy, and optimize your organization's video hosting, transcoding cluster, and custom meeting rooms on AWS, R2, or Oracle Cloud.",
    price: "Custom",
    pricePeriod: "/ project",
    badge: "Enterprise",
    ctaText: "Request Proposal",
    ctaUrl: "#inquiry",
    highlights: [
      "Custom SLA & Infrastructure Design",
      "Cost Optimization (<$0.01/GB)",
      "Dedicated Engineering Support",
    ],
    deliveryFormat: "Custom Project Delivery",
    order: 4,
    isFeatured: false,
    isPublished: true,
  },
];

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user || !(session as any).organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session as any).organizationId;

    // Check if offerings already exist
    const count = await db.offeringItem.count({
      where: { organizationId },
    });

    if (count > 0) {
      return NextResponse.json({
        message: "Organization already has offerings.",
        seededCount: 0,
      });
    }

    const createdItems = await Promise.all(
      STARTER_OFFERINGS.map((item) =>
        db.offeringItem.create({
          data: {
            organizationId,
            ...item,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      seededCount: createdItems.length,
      items: createdItems,
    });
  } catch (err: any) {
    console.error("[POST Seed Offerings Error]:", err);
    return NextResponse.json({ error: "Failed to seed starter offerings." }, { status: 500 });
  }
}
