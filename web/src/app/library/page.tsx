"use client";

import SearchAndFilters from "@/components/SearchAndFilters";
import ContentCard from "@/components/ContentCard";
import ContentListItem from "@/components/ContentListItem";
import DeleteDialog from "@/components/DeleteDialog";
import Toast from "@/components/Toast";
import EmptyState from "@/components/EmptyState";
import { useLibrary } from "@/hooks/useLibrary";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/button";
import Header from "@/components/commonheader";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const {
    filteredContent,
    filters,
    copiedId,
    deleteDialogOpen,
    itemToDelete,
    toast,
    handleFiltersChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleExportAsImage,
    handleCopyToClipboard,
    handleCopyHashtagsOnly,
    handleEdit,
    clearSearch,
  } = useLibrary();

  const router = useRouter();

  // Instead of direct scheduling, route to the dynamic scheduler page
  const handleSchedule = (assetId: string) => {
    router.push(`/scheduler/${assetId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {filteredContent.length > 0 && (
        <div className="container mx-auto px-4 py-4 flex justify-end">
          <Button asChild>
            <a href="/dashboard">
              <Sparkles className="w-4 h-4 mr-2" />
              Create New
            </a>
          </Button>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <SearchAndFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Content Grid/List */}
        {filters.viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContent.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                copiedId={copiedId}
                onExport={handleExportAsImage}
                onCopy={handleCopyToClipboard}
                onEdit={handleEdit}
                onSchedule={() => handleSchedule(item.id)} // route to scheduler
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        ) : (
          // List view
          <div className="space-y-4">
            {filteredContent.map((item) => (
              <ContentListItem
                key={item.id}
                item={item}
                copiedId={copiedId}
                onExport={handleExportAsImage}
                onCopy={handleCopyToClipboard}
                onCopyHashtags={handleCopyHashtagsOnly}
                onEdit={handleEdit}
                onSchedule={() => handleSchedule(item.id)} // route to scheduler
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredContent.length === 0 && (
          <EmptyState
            searchQuery={filters.searchQuery}
            onClearSearch={clearSearch}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteDialog
          isOpen={deleteDialogOpen}
          itemToDelete={itemToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />

        {/* Toast Notifications */}
        <Toast toast={toast} />
      </div>
    </div>
  );
}
