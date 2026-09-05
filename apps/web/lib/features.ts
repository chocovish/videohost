import {
  UploadCloud,
  LockKeyhole,
  BadgePercent,
  MonitorPlay,
  Video,
  ListVideo,
  LayoutPanelTop,
  Palette,
  type LucideIcon,
} from "lucide-react";

export interface FeatureBenefit {
  title: string;
  description: string;
}

export interface FeatureStep {
  title: string;
  description: string;
}

export interface FeatureFaq {
  question: string;
  answer: string;
}

export interface FeaturePage {
  slug: string;
  navLabel: string;
  title: string;
  tagline: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  icon: LucideIcon;
  benefits: FeatureBenefit[];
  steps: FeatureStep[];
  faqs: FeatureFaq[];
}

export const FEATURES: FeaturePage[] = [
  {
    slug: "host-videos",
    navLabel: "Host Videos",
    title: "Host Videos",
    tagline: "Private video hosting with adaptive streaming — upload once, play flawlessly everywhere.",
    description:
      "Taped gives every creator and team a secure home for video. Upload files up to 4K or capture directly in the browser, and every video is automatically transcoded into adaptive multi-bitrate HLS so viewers get instant, buffer-free playback on any device. Your library stays organized, searchable, and protected — with 2GB free storage to start.",
    seoTitle: "Host Videos Online — Private Video Hosting with Adaptive HLS | Taped",
    seoDescription:
      "Host videos securely on Taped: upload 4K files or record in-browser, automatic adaptive HLS transcoding, organized library, fast global streaming. 2GB free.",
    keywords: [
      "host videos online",
      "private video hosting",
      "video hosting platform",
      "adaptive HLS streaming",
      "upload videos securely",
      "4K video hosting",
    ],
    icon: UploadCloud,
    benefits: [
      {
        title: "Upload anything up to 4K",
        description:
          "Drag and drop MP4, WebM, MOV and more. Large files upload reliably with progress tracking and resume-friendly handling.",
      },
      {
        title: "Automatic adaptive HLS transcoding",
        description:
          "Every upload is transcoded into multi-bitrate HLS renditions. Viewers auto-switch quality based on bandwidth — no buffering, no manual exports.",
      },
      {
        title: "Organized, searchable library",
        description:
          "All uploads live in your dashboard library with thumbnails, status tracking, and instant preview. Find any video in seconds.",
      },
      {
        title: "Fast playback anywhere",
        description:
          "HLS segments stream over CDN-backed storage, so videos start fast on mobile, desktop, and low-bandwidth networks alike.",
      },
      {
        title: "Private by default",
        description:
          "New uploads are private until you decide otherwise. Share selectively, sell access, or publish publicly — nothing leaks by accident.",
      },
      {
        title: "2GB free to start",
        description:
          "Every account includes 2GB of free cloud storage with no credit card required. Upgrade to 50GB, 200GB, or unlimited as you grow.",
      },
    ],
    steps: [
      {
        title: "Create your free account",
        description:
          "Sign up at /auth/register. Your video library and 2GB of storage are ready immediately.",
      },
      {
        title: "Upload from your dashboard",
        description:
          "Go to Dashboard → Uploaded Videos and drag in your file, or open /record to capture screen, camera, and mic in the browser.",
      },
      {
        title: "Let transcoding finish",
        description:
          "Taped transcodes your video into adaptive HLS automatically. Track status on the video page until it shows READY.",
      },
      {
        title: "Share, brand, or sell",
        description:
          "Open the video to set access (private, selective emails, or public), customize the branded viewer page, or make it purchasable.",
      },
    ],
    faqs: [
      {
        question: "What video formats and resolutions can I host?",
        answer:
          "You can upload common formats such as MP4, WebM, and MOV, including resolutions up to 4K. Taped transcodes each upload into adaptive multi-bitrate HLS renditions and never upscales beyond the source quality.",
      },
      {
        question: "How much storage do I get for free?",
        answer:
          "Every account includes 2GB of free cloud storage with no credit card required. Paid plans expand this to 50GB, 200GB, or unlimited storage for teams and heavy publishers.",
      },
      {
        question: "Will my videos buffer on slow connections?",
        answer:
          "No. Adaptive HLS streaming automatically serves the best rendition for each viewer's bandwidth and device, so playback stays smooth on mobile networks as well as broadband.",
      },
      {
        question: "Are my hosted videos private?",
        answer:
          "Yes. New uploads are private by default. You explicitly choose whether a video stays private, is shared with selected email addresses, or is published publicly.",
      },
    ],
  },
  {
    slug: "selective-video-sharing",
    navLabel: "Share Selectively",
    title: "Share Videos Selectively",
    tagline: "Only the exact people you invite by email can ever watch. Forwarded links simply don't work.",
    description:
      "Selective sharing is Taped's core promise. Instead of unlisted links anyone can forward, you lock each video or playlist to an explicit list of email addresses. Viewers verify with a one-time passcode — if they are not on your list, they see nothing. And it all happens under your branding: every share page carries your logo, colors, banner, and call-to-action. Perfect for clients, students, teams, and paid buyers.",
    seoTitle: "Share Videos Selectively — Email-Gated Private Video Sharing | Taped",
    seoDescription:
      "Share videos with specific people only. Taped locks playback to exact email addresses with OTP verification — forwarded links never work. Ideal for clients, courses & teams.",
    keywords: [
      "share videos selectively",
      "private video sharing",
      "email gated video",
      "share video with specific people",
      "secure video sharing",
      "OTP verified video access",
    ],
    icon: LockKeyhole,
    benefits: [
      {
        title: "Exact-email access control",
        description:
          "Add the precise email addresses that may watch. No link guessing, no public discovery — access is an explicit allow-list.",
      },
      {
        title: "OTP verification for viewers",
        description:
          "Each viewer proves ownership of their email with a one-time passcode before playback begins. Shared passwords can't circulate.",
      },
      {
        title: "Forward-proof links",
        description:
          "Forwarding a share link to someone off the list shows them nothing. Access follows identity, not the URL.",
      },
      {
        title: "Works for videos and playlists",
        description:
          "Apply selective sharing to a single video or an entire playlist/course with one audience list.",
      },
      {
        title: "Instant revoke and audit",
        description:
          "Remove an email to revoke access immediately. See who was invited and who verified, without spreadsheets.",
      },
      {
        title: "All under your branding",
        description:
          "Every selective share page carries your logo, theme, banner, and CTA — viewers see you, never a generic link page. Set it once in Dashboard → Customize Share Page.",
      },
      {
        title: "Combines with monetization",
        description:
          "Buyers are automatically added to the allow-list after payment, so paid access and private access use the same secure rail.",
      },
    ],
    steps: [
      {
        title: "Open your video or playlist",
        description:
          "Go to Dashboard → Uploaded Videos or Playlists and open the item you want to share.",
      },
      {
        title: "Choose selective access",
        description:
          "Set Share Access Mode to RESTRICTED / selective and enter the exact viewer email addresses.",
      },
      {
        title: "Send the branded share link",
        description:
          "Copy the /share/[id] link — already styled with your logo, colors, and CTA — and send it to your invited viewers. Only listed emails can proceed.",
      },
      {
        title: "Viewers verify by OTP",
        description:
          "Each viewer opens your branded page, enters their email, receives a 6-digit passcode, and unlocks playback after verification.",
      },
    ],
    faqs: [
      {
        question: "How is selective sharing different from an unlisted link?",
        answer:
          "Unlisted links grant access to anyone who has the URL. Taped's selective sharing grants access only to explicitly listed email addresses, each verified by one-time passcode — forwarding the link grants nothing.",
      },
      {
        question: "Can I share a playlist selectively too?",
        answer:
          "Yes. Playlists support the same RESTRICTED mode. Add your student, client, or team emails once and the entire series stays locked to that audience.",
      },
      {
        question: "What does the viewer experience look like?",
        answer:
          "Viewers open your fully branded share page — your logo, theme, banner, and call-to-action — enter their invited email, receive a short-lived OTP, and start watching. No Taped account or install is required. Customize it all in Dashboard → Customize Share Page.",
      },
      {
        question: "Can I revoke someone's access later?",
        answer:
          "Yes. Remove their email from the audience list and their access stops immediately, even if they previously verified.",
      },
    ],
  },
  {
    slug: "monetize-content",
    navLabel: "Monetize Content",
    title: "Make Every Content Purchasable",
    tagline: "Sell any video, playlist, or meeting pass in one click — with commissions from just 3.5%.",
    description:
      "Turn your library into revenue. Any video, playlist-based course, or live meeting can be made purchasable in one click. Buyers check out securely and get instant email-gated access, while you keep more of every sale with the lowest platform commission in the market — starting at 6.5% and dropping to 3.5% as you grow.",
    seoTitle: "Sell Videos & Meeting Passes Online — Lowest 3.5% Commission | Taped",
    seoDescription:
      "Monetize videos, courses & live meetings on Taped. One-click purchasable content, secure checkout, instant buyer access, commissions from just 3.5%.",
    keywords: [
      "sell videos online",
      "monetize videos",
      "sell online courses",
      "sell meeting passes",
      "sell webinars",
      "lowest commission video platform",
    ],
    icon: BadgePercent,
    benefits: [
      {
        title: "One-click purchasable switch",
        description:
          "Price any video, playlist, or meeting without re-uploading. Toggle between free, private, and purchasable anytime.",
      },
      {
        title: "Sell videos, courses, and passes",
        description:
          "Monetize single videos, full playlist-based courses, and entry passes to scheduled or instant meetings from the same dashboard.",
      },
      {
        title: "Lowest commission in the market",
        description:
          "Platform fees start at 6.5% and drop to 3.5% on higher plans — versus 10–30% elsewhere. No hidden listing fees.",
      },
      {
        title: "Secure checkout + instant access",
        description:
          "Buyers pay through secure checkout and are instantly added to the email-gated allow-list. No manual fulfillment.",
      },
      {
        title: "Bank payouts and sales tracking",
        description:
          "Track orders, revenue, and payouts in Dashboard → Sales and Payouts, with direct bank settlement.",
      },
      {
        title: "Showcase on your offerings page",
        description:
          "Purchasable items surface automatically on your public offerings storefront with pricing badges and inquiry actions.",
      },
    ],
    steps: [
      {
        title: "Connect payouts",
        description:
          "Go to Dashboard → Settings / Sales and Payouts and connect your payout details so you can receive settlements.",
      },
      {
        title: "Open the content to sell",
        description:
          "Open any video in Uploaded Videos, any playlist in Playlists, or any room in Meetings.",
      },
      {
        title: "Set a price",
        description:
          "Switch the item to Purchasable mode, set a one-time price (or pass price for meetings), and save.",
      },
      {
        title: "Share your checkout link",
        description:
          "Share the /share/[id] link or list it on your /offerings page. Buyers pay and get instant verified access.",
      },
    ],
    faqs: [
      {
        question: "What can I sell on Taped?",
        answer:
          "Single videos, full playlists packaged as courses, and entry passes to scheduled or instant meetings. Each supports one-time pricing with secure checkout and instant email-gated access.",
      },
      {
        question: "What commission does Taped charge?",
        answer:
          "The platform fee starts at 6.5% and drops to 3.5% on higher tiers — the lowest in the market. Payment gateway fees apply separately and are shown transparently at checkout.",
      },
      {
        question: "How do buyers access what they purchased?",
        answer:
          "After successful payment, the buyer's email is added to that item's allow-list. They verify with a one-time passcode and watch immediately — no manual invite needed.",
      },
      {
        question: "Where do I track sales and payouts?",
        answer:
          "Open Dashboard → Sales and Payouts to see orders, platform and gateway fee breakdowns, and payout status with direct bank settlement.",
      },
    ],
  },
  {
    slug: "screen-recorder",
    navLabel: "Screen Recorder",
    title: "Record Screen with Camera Bubble",
    tagline: "Capture screen, camera, and mic in the browser — no installs, no extensions.",
    description:
      "Taped's free Studio Recorder runs entirely in your browser. Record your full screen, a window, or a tab with a draggable webcam bubble overlay and microphone audio. Preview instantly, then save straight into your hosted library for selective sharing or sale — perfect for demos, tutorials, and async updates.",
    seoTitle: "Free Online Screen Recorder with Camera Bubble — No Download | Taped",
    seoDescription:
      "Record screen with webcam bubble & mic free in your browser. No installs or extensions. Save to secure hosting, share selectively or sell. Try Taped Studio.",
    keywords: [
      "screen recorder online",
      "record screen with camera bubble",
      "webcam overlay recorder",
      "free screen recorder no download",
      "record tutorial videos",
      "browser screen recorder",
    ],
    icon: MonitorPlay,
    benefits: [
      {
        title: "100% browser-based, free",
        description:
          "Record at /record with no downloads, extensions, or desktop apps. Works in any modern Chrome/Edge/Firefox browser.",
      },
      {
        title: "Screen + camera bubble + mic",
        description:
          "Combine full-screen, window, or tab capture with a movable webcam overlay and microphone narration in one take.",
      },
      {
        title: "Instant preview and retake",
        description:
          "Review your take immediately, trim confidence with quick retakes, then save only the version you love.",
      },
      {
        title: "Saves to your hosted library",
        description:
          "One click sends the recording into your Taped library for HLS transcoding, branded sharing, and optional monetization.",
      },
      {
        title: "Perfect for demos and lessons",
        description:
          "Product walkthroughs, course lessons, client Loom-style updates, and bug reports — recorded and shareable in minutes.",
      },
    ],
    steps: [
      {
        title: "Open the Studio Recorder",
        description:
          "Go to /record (free, no login required to try) and allow screen, camera, and microphone permissions.",
      },
      {
        title: "Pick what to capture",
        description:
          "Choose entire screen, application window, or browser tab. Enable the camera bubble and position it anywhere.",
      },
      {
        title: "Record and preview",
        description:
          "Hit record, narrate with your mic, then stop to preview. Retake if needed until it feels right.",
      },
      {
        title: "Save to your library",
        description:
          "Sign in and save. Taped uploads, transcodes to adaptive HLS, and lets you share selectively or sell the recording.",
      },
    ],
    faqs: [
      {
        question: "Do I need to install anything to record?",
        answer:
          "No. The Studio Recorder at /record runs entirely in your browser using native screen-capture APIs. There are no downloads, extensions, or desktop apps.",
      },
      {
        question: "Can I move the camera bubble while recording?",
        answer:
          "Yes. The webcam overlay is draggable, resizable, and can be toggled on or off, so you can keep it clear of important UI while you present.",
      },
      {
        question: "Where do my recordings go?",
        answer:
          "When you save, the recording uploads to your Taped library like any hosted video — transcoded to adaptive HLS and ready for branded, selective, or purchasable sharing.",
      },
      {
        question: "Is the recorder really free?",
        answer:
          "Yes. Browser recording is free to try, and saving to your library counts against your storage quota, which includes 2GB free forever.",
      },
    ],
  },
  {
    slug: "online-meetings",
    navLabel: "Meetings & Recording",
    title: "Host Meetings & Record",
    tagline: "HD meeting rooms with screen sharing — record the room or isolated speakers to your library.",
    description:
      "Spin up HD WebRTC meeting rooms in one click — guests join from a link with no installs. Share your screen, moderate participants, and record the full room gallery or individual speakers straight into your video library. Everything runs under your branding — meeting lobby, invites, share pages, and replays carry your logo and theme. Sell entry passes to webinars and consults, then resell the recordings.",
    seoTitle: "Host Online Meetings & Record — HD WebRTC Rooms, No Install | Taped",
    seoDescription:
      "Host HD browser meetings with screen sharing & one-click recording. Guests join with no install. Record full room or speakers, sell passes, resell replays.",
    keywords: [
      "host online meetings",
      "record online meetings",
      "webrtc meeting rooms",
      "webinar hosting platform",
      "sell meeting passes",
      "meeting recording to library",
    ],
    icon: Video,
    benefits: [
      {
        title: "Instant HD rooms, no installs",
        description:
          "Create scheduled or instant rooms from Dashboard → Meetings. Guests join from a /meet/[id] link in their browser.",
      },
      {
        title: "Screen sharing built in",
        description:
          "Present slides, demos, or code with one-click screen share alongside HD camera and mic.",
      },
      {
        title: "Room or speaker recording",
        description:
          "Record the whole-room gallery or isolate individual speakers. Recordings land automatically in your library.",
      },
      {
        title: "Moderation and invites",
        description:
          "Invite by email, manage participants, and control who can present — ideal for classes, consults, and client calls.",
      },
      {
        title: "All under your branding",
        description:
          "Meeting lobby, email invites, share pages, and replays all carry your logo, colors, banner, and CTA — guests experience your brand end to end. Configure it in Dashboard → Customize Share Page.",
      },
      {
        title: "Sell passes, resell replays",
        description:
          "Price any meeting as a purchasable pass. After the live session, the recording becomes a sellable replay.",
      },
    ],
    steps: [
      {
        title: "Create a meeting",
        description:
          "Go to Dashboard → Meetings and create an instant room or schedule one with title, time, and description.",
      },
      {
        title: "Invite guests",
        description:
          "Share the /meet/[id] link directly, or invite specific emails. For paid events, set a pass price first.",
      },
      {
        title: "Meet and record",
        description:
          "Join in your browser, share your screen, and hit Record — choose full-room or individual-speaker capture.",
      },
      {
        title: "Reuse the recording",
        description:
          "Find the recording in Uploaded Videos. It inherits your branding automatically — share it selectively, or list it as a purchasable replay on your branded pages.",
      },
    ],
    faqs: [
      {
        question: "Do guests need to install anything?",
        answer:
          "No. Guests join from a /meet/[id] link in any modern browser. There are no downloads, plugins, or accounts required for viewers.",
      },
      {
        question: "Where do meeting recordings go?",
        answer:
          "Recordings are saved automatically to your Uploaded Videos library once processing completes, ready for selective sharing or sale as replays — all presented on your branded viewer pages with your logo, theme, and CTA.",
      },
      {
        question: "Is the meeting experience branded?",
        answer:
          "Yes. The meeting lobby, invites, share pages, and replays all run under your branding set in Dashboard → Customize Share Page, so guests see your identity throughout.",
      },
      {
        question: "Can I sell tickets to my meetings?",
        answer:
          "Yes. Set any scheduled or instant meeting to purchasable with a pass price. Buyers get instant access to the live room, and you can resell the recording afterward.",
      },
      {
        question: "Can I record just one speaker?",
        answer:
          "Yes. Choose whole-room gallery recording or isolate individual speakers — useful for interviews, testimonials, and course lessons.",
      },
    ],
  },
  {
    slug: "playlists-courses",
    navLabel: "Playlists & Courses",
    title: "Create Playlists & Courses",
    tagline: "Bundle videos into a polished series — share privately or sell as a complete course.",
    description:
      "Playlists turn scattered videos into a structured journey. Order lessons, add cover art and descriptions, then share the whole series with selected emails or price it as a purchasable course. Viewers get a continuous player with progress-friendly navigation — all under your branding, with your logo, theme, banner, and CTA on every lesson page — and you can embed it anywhere.",
    seoTitle: "Create Video Playlists & Sell Online Courses — Branded Player | Taped",
    seoDescription:
      "Bundle videos into playlists & sell as courses. Ordered lessons, cover art, continuous branded player, selective sharing or one-click monetization.",
    keywords: [
      "create video playlist",
      "sell online courses",
      "video course platform",
      "playlist video player",
      "create course from videos",
      "sell playlist course",
    ],
    icon: ListVideo,
    benefits: [
      {
        title: "Ordered, polished series",
        description:
          "Arrange videos into chapters with titles, descriptions, and cover art — a real course structure, not a folder of files.",
      },
      {
        title: "Continuous branded player",
        description:
          "Viewers watch lesson-to-lesson in one embeddable player that carries your logo, theme, and CTA.",
      },
      {
        title: "All under your branding",
        description:
          "Every playlist share page and lesson inherits your logo, colors, banner, avatar, and CTA from Dashboard → Customize Share Page — your course looks like your own product.",
      },
      {
        title: "Selective or purchasable",
        description:
          "Share the playlist with exact emails for cohorts and clients, or price the entire playlist as a one-click course.",
      },
      {
        title: "Embed anywhere",
        description:
          "Drop the continuous player on your own site while keeping branding, access control, and checkout intact.",
      },
      {
        title: "Reuse hosted videos",
        description:
          "Build playlists from videos already in your library — no re-uploads, no duplicate storage.",
      },
    ],
    steps: [
      {
        title: "Host your lesson videos",
        description:
          "Upload or record each lesson so it lives in Dashboard → Uploaded Videos with READY status.",
      },
      {
        title: "Create a playlist",
        description:
          "Go to Dashboard → Playlists → New Playlist. Name it, add cover art and a description, then add videos in lesson order.",
      },
      {
        title: "Set access or price",
        description:
          "Keep it private, add selective viewer emails, or switch to purchasable and set the course price.",
      },
      {
        title: "Share or embed",
        description:
          "Share the /share/[playlistId] link — already styled with your branding — with your cohort, list it on your offerings page, or embed the branded player on your site.",
      },
    ],
    faqs: [
      {
        question: "How is a playlist different from a folder?",
        answer:
          "A playlist is a watchable product: ordered lessons, cover art, a continuous player, its own share link, and its own access or price — not just organization.",
      },
      {
        question: "Can I sell a playlist as a course?",
        answer:
          "Yes. Switch any playlist to purchasable, set a one-time price, and buyers unlock the entire series with instant email-verified access.",
      },
      {
        question: "Can I share a course with only my students?",
        answer:
          "Yes. Use RESTRICTED mode with your cohort's email addresses. Only those students can verify and watch, even if the link is forwarded.",
      },
      {
        question: "Can I embed the playlist player on my website?",
        answer:
          "Yes. Embed the continuous player on your own domain while keeping your branding, access rules, and checkout behavior.",
      },
      {
        question: "Are playlist pages branded?",
        answer:
          "Yes. Every playlist share page and lesson carries your logo, theme, banner, and CTA from Dashboard → Customize Share Page, so your course always looks like your own product.",
      },
    ],
  },
  {
    slug: "offerings-page",
    navLabel: "Offerings Page",
    title: "Create a Customizable Offerings Page",
    tagline: "One public storefront for your courses, services, products, and upcoming events.",
    description:
      "Every Taped account gets its own public offerings page at /offerings/[your-slug] — a polished storefront where your audience discovers everything you offer. List courses and playlists, 1:1 services, digital or physical products, and upcoming events with schedules and seat badges, plus testimonials, FAQs, and inquiry actions.",
    seoTitle: "Create an Offerings Page — Courses, Services, Events Storefront | Taped",
    seoDescription:
      "Publish a customizable offerings page: list courses, services, products & events with pricing, testimonials & FAQs at your own /offerings URL.",
    keywords: [
      "offerings page",
      "creator storefront",
      "list online courses",
      "sell services online",
      "upcoming events page",
      "digital products storefront",
    ],
    icon: LayoutPanelTop,
    benefits: [
      {
        title: "Your own public URL",
        description:
          "Publish at /offerings/[your-slug] — one link for your bio, proposals, and campaigns that always stays current.",
      },
      {
        title: "Courses, services, products, events",
        description:
          "Showcase playlist-courses with pricing badges, services with duration and rates, products, and time-bound events with seat limits.",
      },
      {
        title: "Built to convert",
        description:
          "Add hero copy, featured videos, testimonials, FAQs, social links, and inquiry forms that route buyers to checkout or contact.",
      },
      {
        title: "Auto-syncs with your library",
        description:
          "Purchasable videos, playlists, and meeting passes surface with live pricing — no manual duplication.",
      },
      {
        title: "Fully configurable, no code",
        description:
          "Edit sections, visibility, and ordering from Dashboard → Offerings and publish when ready.",
      },
    ],
    steps: [
      {
        title: "Open Offerings settings",
        description:
          "Go to Dashboard → Offerings (Offerings Portfolio) to configure your public storefront.",
      },
      {
        title: "Add your offerings",
        description:
          "Create entries for courses/playlists, services/sessions, products, and upcoming events with prices, schedules, and cover art.",
      },
      {
        title: "Add trust sections",
        description:
          "Add testimonials, FAQs, featured videos, social links, and an inquiry form so visitors can evaluate and contact you.",
      },
      {
        title: "Publish and share",
        description:
          "Toggle to published and share your /offerings/[slug] link. Updates go live instantly whenever you edit.",
      },
    ],
    faqs: [
      {
        question: "What is the offerings page?",
        answer:
          "It is your public storefront at /offerings/[your-slug] listing everything you offer — courses, services, products, and upcoming events — with pricing, testimonials, FAQs, and inquiry actions.",
      },
      {
        question: "How do events work on the offerings page?",
        answer:
          "Create upcoming events with date, time, format, and seat limits. Visitors see limited-seat badges and can inquire or purchase passes where enabled.",
      },
      {
        question: "Does it update when I add new content?",
        answer:
          "Yes. Purchasable videos, playlists, and meetings linked to your offerings sync their pricing and availability automatically.",
      },
      {
        question: "Can I unpublish my offerings page?",
        answer:
          "Yes. Toggle visibility in Dashboard → Offerings at any time. Unpublished pages are excluded from search and sitemap discovery.",
      },
    ],
  },
  {
    slug: "branded-pages",
    navLabel: "Branded Pages",
    title: "Customize Pages with Your Branding",
    tagline: "Every viewer page looks like you built it — your logo, colors, banner, and CTA.",
    description:
      "White-label every touchpoint. Customize the content view page for videos and playlists with your logo, theme preset or accent color, welcome banner, creator avatar, and a call-to-action button to your calendar, site, or offer. Embed the player on your own site and the experience still feels unmistakably yours.",
    seoTitle: "White-Label Video Pages — Custom Branding, Logo & Themes | Taped",
    seoDescription:
      "Brand every viewer page: logo, themes, banners, avatars & CTA buttons. White-label share pages & embeds that look like your own product.",
    keywords: [
      "white label video player",
      "custom branded video page",
      "video page branding",
      "custom logo video sharing",
      "branded video experience",
      "embed branded video player",
    ],
    icon: Palette,
    benefits: [
      {
        title: "Your logo, front and center",
        description:
          "Place your company or creator logo in the viewer page header so audiences remember you, not the platform.",
      },
      {
        title: "Themes and accent colors",
        description:
          "Start from premium theme presets or set your own accent color to match your site and deck palette.",
      },
      {
        title: "Banners and avatars",
        description:
          "Upload welcome banners and profile avatars for creators, teams, and organizations across share pages and offerings.",
      },
      {
        title: "Call-to-action button",
        description:
          "Point viewers to book a call, visit your offer, or join your list — right beside the player where attention is highest.",
      },
      {
        title: "Branded embeds too",
        description:
          "Embed the player on your own website and keep your logo, theme, and CTA intact outside taped.in.",
      },
    ],
    steps: [
      {
        title: "Open branding settings",
        description:
          "Go to Dashboard → Customize Share Page (and Organization profile for logo, banner, and avatar).",
      },
      {
        title: "Add logo and theme",
        description:
          "Upload your logo, pick a theme preset or accent color, and add an optional welcome banner.",
      },
      {
        title: "Set your CTA",
        description:
          "Add a call-to-action label and destination URL — for example Book a Demo, Join the Course, or Visit Store.",
      },
      {
        title: "Preview and publish",
        description:
          "Preview any /share/[id] page to confirm the branded look, then share. Every current and future video inherits it.",
      },
    ],
    faqs: [
      {
        question: "What exactly can I brand?",
        answer:
          "The content view (share) pages for videos and playlists: header logo, theme preset or accent color, welcome banner, creator avatar, and a CTA button — plus branded embeds on your own site.",
      },
      {
        question: "Will viewers see Taped branding?",
        answer:
          "Your identity leads the experience: your logo, colors, banner, and CTA dominate the viewer page. Platform chrome is minimal by design.",
      },
      {
        question: "Does branding apply to all my videos?",
        answer:
          "Yes. Branding set in Dashboard → Customize Share Page applies across your share pages, so new uploads inherit it automatically.",
      },
      {
        question: "Can I use my branding when I embed elsewhere?",
        answer:
          "Yes. Embedded players preserve your logo, theme, and CTA on your own domain while respecting the same access rules.",
      },
    ],
  },
];

export function getFeatureBySlug(slug: string): FeaturePage | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

export function getFeatureSlugs(): string[] {
  return FEATURES.map((f) => f.slug);
}

export function getRelatedFeatures(slug: string, count = 3): FeaturePage[] {
  const others = FEATURES.filter((f) => f.slug !== slug);
  return others.slice(0, count);
}
