export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    question: "What is included in the free tier of Taped?",
    answer:
      "Every new account receives 2GB of free cloud video storage forever with zero credit card required. This includes unlimited access to our in-browser studio screen & webcam recorder, multi-video playlists, granular email access controls, WebRTC conference rooms, and white-label share page customizer.",
  },
  {
    question: "How does selective email-based access control work?",
    answer:
      "Unlike ordinary video links that anyone can forward, Taped allows you to restrict playback strictly to authorized email addresses. Viewers authenticate seamlessly using a one-time passcode (OTP) sent to their inbox, ensuring only verified recipients can stream your sensitive videos.",
  },
  {
    question: "Do I need to install any desktop software or browser extensions to record?",
    answer:
      "No! Taped features a native, in-browser studio screen recorder. You can capture your entire desktop, specific application windows, or browser tabs alongside microphone audio and a customizable webcam bubble overlay directly in Chrome, Edge, Brave, Safari, or Firefox.",
  },
  {
    question: "How do the conference rooms and dual-mode recording work?",
    answer:
      "Taped includes built-in real-time video conference rooms powered by WebRTC. You can host scheduled or instant meetings with crystal-clear audio, HD video, and screen sharing. With our dual-mode cloud recording, you can choose to record the whole meeting room gallery or isolate specific individual participants as dedicated video tracks, automatically saved directly into your Taped library.",
  },
  {
    question: "Can I customize the video share page with my own company branding?",
    answer:
      "Yes! Taped gives you complete white-label customization. You can upload your custom organization logo, attach a welcome banner image, select luxury theme presets (such as Obsidian Dark, Neon Cyberpunk, Vaporwave Glow, or Ocean Breeze), and configure a custom Call-to-Action button directing viewers to your demo calendar or website.",
  },
  {
    question: "Can I create and embed multi-video playlists?",
    answer:
      "Yes. You can organize videos into sequential playlists ideal for onboarding modules, online courses, and video documentation. Playlists can be shared via single URLs or embedded directly onto your website, blog, or Notion workspace with automated continuous playback.",
  },
  {
    question: "Do I get a dedicated page to list my offerings and events?",
    answer:
      "Yes. Every account includes its own public offerings page under your own slug — a polished storefront where you can list courses, playlists, services, 1:1 sessions, products, and upcoming events with pricing, badges, highlights and cover images. Visitors can send inquiries directly, and the whole page is configurable with your headline, bio, avatar, testimonials, FAQs and social links.",
  },
  {
    question: "Can I sell my videos, playlists, and meeting passes on Taped?",
    answer:
      "Yes. Taped lets you price any video — or an entire playlist as a course — as a one-time purchase, and sell passes to your live meeting rooms. Buyers pay securely through our payment gateway and get instant access. Platform commissions start at just 6.5% and drop to as low as 3.5% on paid plans — the lowest commission in the market.",
  },
  {
    question: "Can I integrate Taped with my own applications via API and webhooks?",
    answer:
      "Yes! Taped provides standard REST API endpoints for uploading and managing videos programmatically, along with real-time webhooks that notify your backend system whenever video processing completes.",
  },
];
