import { useState, useEffect, useCallback } from "react";
import { LibraryItem, ToastState, FilterState } from "@/types/library";
import libraryService from "@/services/libraryService";

export function useLibrary() {
  const [libraryContent, setLibraryContent] = useState<LibraryItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<LibraryItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    filterType: "all",
    filterPlatform: "all",
    viewMode: "grid",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LibraryItem | null>(null);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ show: true, message, type });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        3000
      );
    },
    []
  );

  const loadLibraryContent = useCallback(async () => {
    try {
      const content = await libraryService.getLibraryContent();
      setLibraryContent(content);
    } catch {
      console.error("Failed to load library content");
      showToast("Failed to load library content", "error");
    }
  }, [showToast]);

  // Load content on mount
  useEffect(() => {
    loadLibraryContent();
  }, [loadLibraryContent]);

  // Filter content when filters change
  useEffect(() => {
    const filtered = libraryService.filterContent(
      libraryContent,
      filters.searchQuery,
      filters.filterType,
      filters.filterPlatform
    );
    setFilteredContent(filtered);
  }, [libraryContent, filters]);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<FilterState>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleDeleteClick = useCallback((item: LibraryItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      await libraryService.deleteLibraryItem(itemToDelete.id);
      await loadLibraryContent();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      showToast(
        `"${itemToDelete.title}" has been deleted successfully`,
        "success"
      );
    } catch {
      showToast("Failed to delete item", "error");
    }
  }, [itemToDelete, loadLibraryContent, showToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  }, []);

  const handleExportAsImage = useCallback(
    async (item: LibraryItem) => {
      try {
        if (item.videoUrl) {
          try {
            await libraryService.downloadVideo(
              item.videoUrl,
              `${item.title.replace(/\s+/g, "_")}.mp4`
            );
            showToast(
              `"${item.title}" video downloaded successfully`,
              "success"
            );
            return;
          } catch {
            if (item.imageUrl) {
              await libraryService.exportImage(
                item.imageUrl,
                `${item.title.replace(/\s+/g, "_")}.png`
              );
              showToast(
                `Video unavailable. Downloaded image for "${item.title}"`,
                "success"
              );
              return;
            }
            throw new Error("Video and image unavailable");
          }
        }

        if (item.imageUrl) {
          await libraryService.exportImage(
            item.imageUrl,
            `${item.title.replace(/\s+/g, "_")}.png`
          );
          showToast(`"${item.title}" image downloaded successfully`, "success");
          return;
        }

        showToast("No content to export", "error");
      } catch {
        showToast("Failed to export content", "error");
      }
    },
    [showToast]
  );

  const handleCopyToClipboard = useCallback(
    async (item: LibraryItem) => {
      const textToCopy = `${item.caption}\n\n${item.hashtags
        .map((tag) => `#${tag}`)
        .join(" ")}`;

      try {
        await libraryService.copyToClipboard(textToCopy);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
        showToast("Caption and hashtags copied to clipboard", "success");
      } catch {
        showToast("Failed to copy to clipboard", "error");
      }
    },
    [showToast]
  );

  const handleCopyHashtagsOnly = useCallback(
    async (item: LibraryItem) => {
      const hashtagsText = item.hashtags.map((tag) => `#${tag}`).join(" ");

      try {
        await libraryService.copyToClipboard(hashtagsText);
        showToast("Hashtags copied to clipboard", "success");
      } catch {
        showToast("Failed to copy hashtags", "error");
      }
    },
    [showToast]
  );

  const handleEdit = useCallback((item: LibraryItem) => {
    libraryService.saveEditorContent({
      id: item.id,
      caption: item.caption,
      hashtags: item.hashtags,
      imageUrl: item.imageUrl,
      platform: item.platform,
      contentType: item.type,
      title: item.title,
    });
    window.location.href = `/editor/${item.id}`;
  }, []);

  const handleSchedule = useCallback((item: LibraryItem) => {
    libraryService.saveSchedulerContent({
      id: item.id,
      caption: item.caption,
      hashtags: item.hashtags,
      imageUrl: item.imageUrl,
      platform: item.platform,
      contentType: item.type,
      title: item.title,
    });
    window.location.href = `/scheduler/${item.id}`;
  }, []);

  const clearSearch = useCallback(() => {
    handleFiltersChange({ searchQuery: "" });
  }, [handleFiltersChange]);

  return {
    // State
    libraryContent,
    filteredContent,
    filters,
    copiedId,
    deleteDialogOpen,
    itemToDelete,
    toast,

    // Actions
    handleFiltersChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleExportAsImage,
    handleCopyToClipboard,
    handleCopyHashtagsOnly,
    handleEdit,
    handleSchedule,
    clearSearch,
    showToast,
  };
}
