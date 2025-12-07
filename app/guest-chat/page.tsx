"use client";

import { Suspense } from "react";
import { GuestChatContent } from "./GuestChatContent";

export default function GuestChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
      <GuestChatContent />
    </Suspense>
  );
}
