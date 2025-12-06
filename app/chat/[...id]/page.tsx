"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { use } from "react";

export default function ChatIdPage({ params }: { params: Promise<{ id: string[] }> }) {
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    // Join all params segments with '/'
    const chatId = resolvedParams.id.join('/');
    // Use replace to avoid adding to history, preventing back button loops
    router.replace(`/chat?id=${encodeURIComponent(chatId)}`);
  }, [resolvedParams.id, router]);

  return null;
}
