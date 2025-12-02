"use client"

import { useState } from "react"
import { Plus, Folder, MoreVertical, Pencil, Trash2, FolderOpen, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ProjectDialog } from "./project-dialog"
import { Project } from "@/lib/services/indexeddb"
import { cn } from "@/lib/utils"
import { useIndexingQueue } from "@/lib/hooks/use-indexing-queue"

interface ProjectListProps {
  projects: Project[]
  activeProjectId?: string
  onSelectProject: (projectId: string) => void
  onCreateProject: (name: string, description: string, instructions: string, attachments: File[]) => Promise<any>
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>
  onDeleteProject: (id: string) => Promise<void>
  className?: string
}

export function ProjectList({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  className
}: ProjectListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  
  // Use indexing queue for background file processing
  const { enqueueProjectFile, jobs } = useIndexingQueue()

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProject(project)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project?')) {
      await onDeleteProject(id)
    }
  }

  const handleCreateProject = async (name: string, description: string, instructions: string, attachments: File[]) => {
    // Create project and get back the files to enqueue
    const result = await onCreateProject(name, description, instructions, attachments)
    
    // If there are uploaded files, enqueue them for background indexing
    if (result.uploadedFiles && result.uploadedFiles.length > 0 && result.uploadResults) {
      console.log('[ProjectList] Enqueueing files for indexing:', result.uploadedFiles.length)
      
      for (let i = 0; i < result.uploadedFiles.length; i++) {
        const file = result.uploadedFiles[i]
        const uploadResult = result.uploadResults[i]
        
        if (uploadResult?.url) {
          // Enqueue each file for background processing
          await enqueueProjectFile(file, result.project.id, uploadResult.url)
        }
      }
    }
    
    // Don't close immediately, let the dialog handle it based on processing status
    // setIsCreateOpen(false) 
    return result.project.id
  }

  const handleUpdateProject = async (name: string, description: string, instructions: string, attachments: File[]) => {
    if (editingProject) {
      await onUpdateProject(editingProject.id, { name, description, instructions, attachments })
      setEditingProject(null)
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-muted-foreground tracking-tight">Projects</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4">
                <HelpCircle className="h-2 w-2  text-muted-foreground" />
                <span className="sr-only">What are projects?</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <p>
                Projects are custom AI workspaces like Custom GPTs. They include predefined
                instructions, files, and can be configured with custom prompts to make the AI
                behave in specific ways for various use cases.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">New Project</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 pb-2">
        <div className="space-y-1 p-2">
          {projects.length === 0 ? (
            <div className="text-xs text-center text-muted-foreground py-4">
              No projects yet.
              <br />
              Create one to organize chats!
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1 text-sm font-medium rounded-md cursor-pointer transition-colors",
                  activeProjectId === project.id
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onSelectProject(project.id)}
              >
                {activeProjectId === project.id ? (
                  <FolderOpen className="h-4 w-4 shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0" />
                )}
                <span className="flex-1 truncate">{project.name}</span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleEdit(project, e)}>
                      <Pencil className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleDelete(project.id, e)}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <ProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateProject}
        mode="create"
        indexingJobs={jobs}
      />

      <ProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSubmit={handleUpdateProject}
        initialData={editingProject || undefined}
        mode="edit"
      />
    </div>
  )
}
