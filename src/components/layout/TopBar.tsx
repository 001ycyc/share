"use client";

import { Menu, LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui.store";
import { SearchBar } from "@/components/shared/SearchBar";

export function TopBar() {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6">
      {/* Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="shrink-0"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <SearchBar />

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 rounded-lg border bg-gray-50 p-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMode("grid")}
          className={cn(
            "h-7 w-7",
            viewMode === "grid"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMode("list")}
          className={cn(
            "h-7 w-7",
            viewMode === "list"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* New Clip Button */}
      <Button className="bg-brand-600 hover:bg-brand-700 text-white shrink-0">
        <Plus className="h-4 w-4" />
        新建
      </Button>
    </header>
  );
}
