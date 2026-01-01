import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { validateFile } from "@/lib/utils/file-converter";
import { textToFile, LONG_TEXT_THRESHOLD } from "@/lib/utils/text-to-file-converter";
import { Attachment } from "@/components/file-preview";
import { ContextItem } from "@/lib/hooks/use-context-search";
import type { SurfaceType } from "@/lib/services/domain-types";

// Debounce delay for surface suggestion API calls
const SURFACE_SUGGESTION_DEBOUNCE_MS = 600;

// Surfaces allowed for guest users
const GUEST_ALLOWED_SURFACES: (SurfaceType | 'chat')[] = ['chat', 'wiki', 'quiz'];

export interface UseSmartInputProps {
  initialValue?: string;
  initialAttachments?: (File | Attachment)[];
  initialContext?: ContextItem[];
  onValueChange?: (value: string) => void;
  onFilesChange?: (files: (File | Attachment)[]) => void;
  onContextChange?: (context: ContextItem[]) => void;
  onSubmit?: (text: string, files: File[]) => void;
  // For suggestion logic
  surfaceMode?: SurfaceType | 'chat';
  onSurfaceModeChange?: (mode: SurfaceType | 'chat') => void;
  isGuest?: boolean;
  currentConversationId?: string | null;
}

export function useSmartInput({
  initialValue = "",
  initialAttachments = [],
  initialContext = [],
  onValueChange,
  onFilesChange,
  onContextChange,
  onSubmit,
  surfaceMode = 'chat',
  onSurfaceModeChange,
  isGuest = false,
  currentConversationId
}: UseSmartInputProps) {
  // --- State ---
  const [prompt, setPrompt] = useState(initialValue);
  const [files, setFiles] = useState<(File | Attachment)[]>(initialAttachments);
  const [context, setContext] = useState<ContextItem[]>(initialContext);
  
  // Suggestion State
  const [suggestedSurface, setSuggestedSurface] = useState<{
    type: SurfaceType;
    message: string;
  } | null>(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState<string | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);

  // --- Effects ---

  // Sync initial values (e.g. when editing)
  useEffect(() => {
    setPrompt(initialValue);
  }, [initialValue]);

  useEffect(() => {
    setFiles(initialAttachments);
  }, [initialAttachments]);

  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Handlers ---

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    onValueChange?.(value);

    // Surface Suggestion Logic
    if (surfaceMode === 'chat' && value.length > 10) {
      // Clear existing timeout
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      
      // Abort previous request
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
      }

      // Debounced API call
      suggestionTimeoutRef.current = setTimeout(async () => {
        try {
          setIsFetchingSuggestion(true);
          suggestionAbortRef.current = new AbortController();
          
          const response = await fetch('/api/suggest-surface', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: value }),
            signal: suggestionAbortRef.current.signal
          });
          
          if (!response.ok) {
            setSuggestedSurface(null);
            return;
          }
          
          const data = await response.json() as { 
            suggestedSurface?: SurfaceType | null; 
            reason?: string; 
          };
          
          if (data.suggestedSurface && data.suggestedSurface !== dismissedSuggestion) {
            // Check guest restrictions
            if (!isGuest || GUEST_ALLOWED_SURFACES.includes(data.suggestedSurface)) {
              setSuggestedSurface({
                type: data.suggestedSurface,
                message: data.reason || 'Suggested surface'
              });
            }
          } else {
            setSuggestedSurface(null);
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Surface suggestion error:', error);
          }
          setSuggestedSurface(null);
        } finally {
          setIsFetchingSuggestion(false);
        }
      }, SURFACE_SUGGESTION_DEBOUNCE_MS);

    } else if (value.length <= 10) {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      setSuggestedSurface(null);
    }
  }, [surfaceMode, dismissedSuggestion, isGuest, onValueChange]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const results = newFiles.map(file => ({
      file,
      validation: validateFile(file)
    }));
    
    const invalidFiles = results.filter(r => !r.validation.valid);
    
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, validation }) => {
        toast.error(validation.error || 'Invalid file', {
          description: file.name,
        });
      });
      
      const validFiles = results.filter(r => r.validation.valid).map(r => r.file);
      if (validFiles.length > 0) {
        setFiles(prev => {
          const updated = [...prev, ...validFiles];
          onFilesChange?.(updated);
          return updated;
        });
      }
      return;
    }
    
    setFiles(prev => {
      const updated = [...prev, ...newFiles];
      onFilesChange?.(updated);
      return updated;
    });
  }, [onFilesChange]);

  const handleRemoveFile = useCallback((fileToRemove: File | Attachment) => {
    setFiles(prev => {
      const updated = prev.filter(f => f !== fileToRemove);
      onFilesChange?.(updated);
      return updated;
    });
  }, [onFilesChange]);

  const handleRemoveContext = useCallback((itemToRemove: ContextItem) => {
    setContext(prev => {
      const updated = prev.filter(c => c.id !== itemToRemove.id);
      onContextChange?.(updated);
      return updated;
    });
  }, [onContextChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain');
    
    if (pastedText && pastedText.length > LONG_TEXT_THRESHOLD) {
      e.preventDefault();
      const textFile = textToFile(pastedText);
      handleFilesAdded([textFile]);
      toast.info("Long text converted to file attachment");
    }
  }, [handleFilesAdded]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestedSurface && onSurfaceModeChange) {
      onSurfaceModeChange(suggestedSurface.type);
      setSuggestedSurface(null);
      setDismissedSuggestion(null);
    }
  }, [suggestedSurface, onSurfaceModeChange]);

  const handleDismissSuggestion = useCallback(() => {
    if (suggestedSurface) {
      setDismissedSuggestion(suggestedSurface.type);
      setSuggestedSurface(null);
    }
  }, [suggestedSurface]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() && files.length === 0) return;

    if (onSubmit) {
      // Filter out non-File attachments (e.g. existing attachments in edit mode)
      // Logic might need adjustment depending on how edit mode handles mixed types
      // generally onSubmit expects File[] for new uploads
      const newFiles = files.filter((f): f is File => f instanceof File);
      onSubmit(prompt.trim(), newFiles);
      
      // Clear state after submit
      setPrompt("");
      setFiles([]);
    }
  }, [prompt, files, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      // Mobile: Enter inserts newline (send button required to submit)
      // Desktop: Default behavior - Enter = submit, Shift+Enter = newline
      if (e.key === 'Enter' && isMobile && !e.shiftKey) {
        e.preventDefault();
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = prompt.slice(0, start) + '\n' + prompt.slice(end);
        setPrompt(newValue);
        onValueChange?.(newValue);
        
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        });
      }
  }, [isMobile, prompt, onValueChange]);
  
  // Public setters
  const setText = (val: string) => {
      setPrompt(val);
      onValueChange?.(val);
  };

  return {
    prompt,
    setPrompt: setText,
    files,
    setFiles,
    context,
    setContext,
    isMobile,
    
    // Suggestions
    suggestedSurface,
    isFetchingSuggestion,
    
    // Handlers
    handlePromptChange,
    handleFilesAdded,
    handleRemoveFile,
    handleRemoveContext,
    handlePaste,
    handleAcceptSuggestion,
    handleDismissSuggestion,
    handleSubmit,
    handleKeyDown
  };
}
