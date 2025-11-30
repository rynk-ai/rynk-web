import { Skeleton } from "@/components/ui/skeleton"
import { Message } from "@/components/ui/message"

export function AssistantSkeleton() {
  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 items-start">
      <div className="group flex w-full flex-col gap-0">
        <div className="flex flex-col gap-2 w-full">
          {/* Skeleton lines simulating typing */}
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-[90%] bg-muted/50" />
            <Skeleton className="h-4 w-[85%] bg-muted/50" />
            <Skeleton className="h-4 w-[75%] bg-muted/50" />
            <Skeleton className="h-4 w-[80%] bg-muted/50" />
          </div>

          {/* Animated dot indicator */}
          <div className="flex items-center gap-1 pt-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </Message>
  )
}
