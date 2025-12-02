import type { Metadata } from "next";

;

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Chat with intelligent AI that remembers everything. Upload files for instant understanding, reference past conversations for context, and tap into your project's collective knowledge. Your AI assistant with perfect memory.",
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
