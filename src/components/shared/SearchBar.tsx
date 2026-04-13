"use client";

import { useRef, useEffect, useState } from "react";
import { Search, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores/ui.store";

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const searchHistory = useUIStore((s) => s.searchHistory);
  const addSearchHistory = useUIStore((s) => s.addSearchHistory);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleChange = (value: string) => {
    setSearchQuery(value);
    setShowHistory(value.length > 0 && searchHistory.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (searchQuery.trim()) {
        addSearchHistory(searchQuery.trim());
      }
      setShowHistory(false);
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setShowHistory(false);
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    addSearchHistory(query);
    setShowHistory(false);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="搜索剪贴板内容..."
        value={searchQuery}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchQuery.length === 0 && searchHistory.length > 0 && setShowHistory(true)}
        onBlur={() => setTimeout(() => setShowHistory(false), 200)}
        className="pl-9 pr-12"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">Ctrl</span>K
      </kbd>
      {/* 搜索历史下拉 */}
      {showHistory && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-white shadow-lg">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">搜索历史</p>
            {searchHistory.slice(0, 5).map((query, i) => (
              <button
                key={i}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleHistoryClick(query)}
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{query}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
