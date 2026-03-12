import { useState, useRef, useEffect } from "react";
import {
  Edit,
  Search,
  CalendarClock,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Pin,
  PinOff,
  Archive,
  ArchiveX,
  Trash2,
  PenLine,
  Check,
  X,
} from "lucide-react";
import type { TopicCard } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserTopicPrefs, useUpsertTopicPref } from "@/hooks/useRealtimeData";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface Props {
  topics: TopicCard[];
  selectedId: string | null;
  onSelect: (topic: TopicCard | null) => void;
  onTopicRemoved?: (topicId: string) => void;
  isLoading?: boolean;
  searchQuery?: string;
  onScheduleClick: () => void;
}

const TopicSidebar = ({
  topics,
  selectedId,
  onSelect,
  onTopicRemoved,
  isLoading,
  searchQuery,
  onScheduleClick,
}: Props) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Archived section toggle
  const [showArchived, setShowArchived] = useState(false);

  // Hooks
  const { data: prefsMap = new Map() } = useUserTopicPrefs();
  const upsertPref = useUpsertTopicPref();

  // Focus rename input when activated
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingId]);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  // Apply user prefs: filter deleted, apply custom title
  const visibleTopics = topics
    .filter((t) => {
      const pref = prefsMap.get(t.id);
      return !pref?.isDeleted && !pref?.isArchived;
    })
    .map((t) => {
      const pref = prefsMap.get(t.id);
      return {
        ...t,
        title: pref?.customTitle ?? t.title,
        isPinned: pref?.isPinned ?? false,
      };
    });

  // Archived topics list
  const archivedTopics = topics
    .filter((t) => {
      const pref = prefsMap.get(t.id);
      return pref?.isArchived && !pref?.isDeleted;
    })
    .map((t) => {
      const pref = prefsMap.get(t.id);
      return { ...t, title: pref?.customTitle ?? t.title, isPinned: false };
    });

  // Sort: pinned first, then by original order
  const pinnedTopics = visibleTopics.filter((t) => t.isPinned);
  const unpinnedTopics = visibleTopics.filter((t) => !t.isPinned);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handlePin = (topic: TopicCard & { isPinned: boolean }) => {
    const next = !topic.isPinned;
    upsertPref.mutate(
      { topicId: topic.id, is_pinned: next },
      {
        onSuccess: () =>
          toast({
            title: next ? "📌 Pinned" : "Unpinned",
            description: next
              ? `"${topic.title}" pinned to top.`
              : `"${topic.title}" unpinned.`,
          }),
        onError: () =>
          toast({
            title: "Error",
            description: "Could not update pin.",
            variant: "destructive",
          }),
      },
    );
  };

  const handleArchive = (topic: TopicCard) => {
    upsertPref.mutate(
      { topicId: topic.id, is_archived: true, is_pinned: false },
      {
        onSuccess: () => {
          toast({
            title: "📦 Archived",
            description: `"${topic.title}" moved to archive.`,
          });
          if (selectedId === topic.id) onTopicRemoved?.(topic.id);
        },
        onError: () =>
          toast({
            title: "Error",
            description: "Could not archive.",
            variant: "destructive",
          }),
      },
    );
  };

  const handleUnarchive = (topic: TopicCard) => {
    upsertPref.mutate(
      { topicId: topic.id, is_archived: false },
      {
        onSuccess: () =>
          toast({
            title: "Unarchived",
            description: `"${topic.title}" restored.`,
          }),
        onError: () =>
          toast({
            title: "Error",
            description: "Could not unarchive.",
            variant: "destructive",
          }),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    const topic = topics.find((t) => t.id === deleteConfirmId);
    upsertPref.mutate(
      {
        topicId: deleteConfirmId,
        is_deleted: true,
        is_pinned: false,
        is_archived: false,
      },
      {
        onSuccess: () => {
          toast({
            title: "🗑️ Deleted",
            description: `"${topic?.title}" removed from your history.`,
          });
          if (selectedId === deleteConfirmId) onTopicRemoved?.(deleteConfirmId);
          setDeleteConfirmId(null);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Could not delete.",
            variant: "destructive",
          });
          setDeleteConfirmId(null);
        },
      },
    );
  };

  const handleRenameStart = (topic: TopicCard & { title: string }) => {
    setRenamingId(topic.id);
    setRenameValue(topic.title);
  };

  const handleRenameCommit = (topicId: string, originalTitle: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === originalTitle) return;
    upsertPref.mutate(
      { topicId, custom_title: trimmed },
      {
        onSuccess: () =>
          toast({
            title: "✏️ Renamed",
            description: `Chat renamed to "${trimmed}".`,
          }),
        onError: () =>
          toast({
            title: "Error",
            description: "Could not rename.",
            variant: "destructive",
          }),
      },
    );
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  // ── Render a single topic row ─────────────────────────────────────────────

  const renderTopicItem = (
    topic: TopicCard & { isPinned: boolean },
    isArchiveSection = false,
  ) => {
    const isRenaming = renamingId === topic.id;
    const originalTopic = topics.find((t) => t.id === topic.id);

    return (
      <SidebarMenuItem key={topic.id}>
        {isRenaming ? (
          // ── Inline rename input ──────────────────────────────────────────
          <div className="flex items-center gap-1 px-2 py-1 w-full">
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  handleRenameCommit(
                    topic.id,
                    originalTopic?.title ?? topic.title,
                  );
                if (e.key === "Escape") handleRenameCancel();
              }}
              onBlur={() =>
                handleRenameCommit(
                  topic.id,
                  originalTopic?.title ?? topic.title,
                )
              }
              className="flex-1 min-w-0 text-sm bg-sidebar-accent border border-sidebar-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary text-foreground"
              placeholder="Chat name…"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleRenameCommit(
                  topic.id,
                  originalTopic?.title ?? topic.title,
                );
              }}
              className="shrink-0 text-primary hover:text-primary/80"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleRenameCancel();
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <SidebarMenuButton
              isActive={!isArchiveSection && selectedId === topic.id}
              onClick={() => !isArchiveSection && onSelect(topic)}
              tooltip={topic.title}
              className="text-sm text-foreground/80 hover:text-foreground hover:bg-sidebar-accent group/btn"
            >
              {topic.isPinned && !collapsed && (
                <Pin className="h-3 w-3 shrink-0 text-primary/60" />
              )}
              <span className="truncate">{topic.title}</span>
            </SidebarMenuButton>

            {/* ── Three-dot dropdown ───────────────────────────────────────── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="start"
                className="w-52 rounded-lg shadow-md border-border bg-popover"
                sideOffset={8}
              >
                {/* Rename */}
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-sm"
                  onSelect={() => handleRenameStart(topic)}
                >
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  <span>Rename</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                {/* Pin / Unpin */}
                {!isArchiveSection && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-sm"
                    onSelect={() => handlePin(topic)}
                  >
                    {topic.isPinned ? (
                      <>
                        <PinOff className="h-4 w-4 text-muted-foreground" />
                        <span>Unpin chat</span>
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 text-muted-foreground" />
                        <span>Pin chat</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {/* Archive / Unarchive */}
                {isArchiveSection ? (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-sm"
                    onSelect={() => handleUnarchive(topic)}
                  >
                    <ArchiveX className="h-4 w-4 text-muted-foreground" />
                    <span>Unarchive</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-sm"
                    onSelect={() => handleArchive(topic)}
                  >
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <span>Archive</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="my-1" />

                {/* Delete */}
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => setDeleteConfirmId(topic.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </SidebarMenuItem>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
        {/* Header */}
        <SidebarHeader className="pt-3 pb-2 px-2">
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New chat"
                onClick={() => onSelect(null)}
                className="text-foreground font-medium"
              >
                <Edit className="h-4 w-4" />
                <span>New chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Search chats"
                className="text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4" />
                <span>Search chats</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Schedule Analysis"
                onClick={onScheduleClick}
                className="text-muted-foreground hover:text-foreground"
              >
                <CalendarClock className="h-4 w-4" />
                <span>Schedule Analysis</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent className="px-2 mt-2">
          {/* ── Pinned section ── */}
          {!collapsed && pinnedTopics.length > 0 && (
            <SidebarGroup className="pb-0">
              <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 mb-1">
                Pinned
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {isLoading
                    ? null
                    : pinnedTopics.map((t) => renderTopicItem(t))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* ── Your chats section ── */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
              {!collapsed && <span>Your chats</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="h-8 animate-pulse rounded bg-muted/30 w-full" />
                    </SidebarMenuItem>
                  ))
                ) : unpinnedTopics.length === 0 && pinnedTopics.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="p-2 text-xs text-muted-foreground">
                      {collapsed
                        ? "—"
                        : `No history${searchQuery ? ` for "${searchQuery}"` : ""}`}
                    </div>
                  </SidebarMenuItem>
                ) : unpinnedTopics.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="p-2 text-xs text-muted-foreground">
                      All chats are pinned
                    </div>
                  </SidebarMenuItem>
                ) : (
                  unpinnedTopics.map((t) => renderTopicItem(t))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* ── Archived section ── */}
          {!collapsed && archivedTopics.length > 0 && (
            <SidebarGroup className="pt-0">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1 w-full text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-muted-foreground transition-colors"
              >
                <Archive className="h-3 w-3" />
                <span>Archived ({archivedTopics.length})</span>
                {showArchived ? (
                  <ChevronUp className="h-3 w-3 ml-auto" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-auto" />
                )}
              </button>
              {showArchived && (
                <SidebarGroupContent className="mt-1">
                  <SidebarMenu className="gap-1">
                    {archivedTopics.map((t) => (
                      <div
                        key={t.id}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        {renderTopicItem(t, true)}
                      </div>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Avatar className="h-7 w-7 rounded-sm shrink-0 border border-border">
                      <AvatarImage
                        src={
                          user?.user_metadata?.avatar_url ||
                          user?.user_metadata?.picture
                        }
                      />
                      <AvatarFallback className="rounded-sm bg-primary/10 text-primary text-[10px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 text-left text-sm leading-tight overflow-hidden">
                      <span className="truncate font-medium">
                        {user?.user_metadata?.full_name ||
                          user?.email ||
                          "Guest User"}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        Free plan
                      </span>
                    </div>
                    <ChevronUp className="h-4 w-4 opacity-50 ml-auto shrink-0" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      signOut();
                      navigate("/auth");
                    }}
                    className="text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ── Delete confirmation dialog (outside Sidebar to avoid stacking context issues) ── */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">
                "
                {topics.find((t) => t.id === deleteConfirmId)?.title ??
                  "this chat"}
                "
              </span>{" "}
              from your history. The topic data itself is not deleted — you can
              re-search it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TopicSidebar;
