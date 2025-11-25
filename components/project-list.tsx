"use client"

import { useState } from "react"
import { Plus, Folder, MoreVertical, Pencil, Trash2, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectDialog } from "./project-dialog"
import { Project } from "@/lib/services/indexeddb"
import { cn } from "@/lib/utils"

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

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProject(project)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project? Chats will be preserved but unlinked.')) {
      await onDeleteProject(id)
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-tight">Projects</h2>
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
        onSubmit={onCreateProject}
        mode="create"
      />

      <ProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSubmit={async (name, description, instructions, attachments) => {
          if (editingProject) {
            await onUpdateProject(editingProject.id, { name, description, instructions, attachments })
            setEditingProject(null)
          }
        }}
        initialData={editingProject || undefined}
        mode="edit"
      />
    </div>
  )
}
