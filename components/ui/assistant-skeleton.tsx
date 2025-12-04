import { Message } from "@/components/ui/message"
import { SmartSkeleton } from "@/components/chat/smart-skeleton"

export function AssistantSkeleton() {
  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 items-start">
      <div className="group flex w-full flex-col gap-0">
        <SmartSkeleton />
      </div>
    </Message>
  )
}
