import type { Metadata } from "next";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Start chatting with AI. Upload files, reference conversations, and collaborate with rynk.'s advanced AI assistant.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
