import { Loader } from "../prompt-kit/loader";


export function AssistantSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto py-2 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader variant="typing" size="sm"  />
        <span className="font-medium">Thinking</span>
      </div>
    </div>
  )
}
