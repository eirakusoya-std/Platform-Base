type SearchFilterBarProps = {
  tags: string[];
  searchQuery: string;
  activeTags: string[];
  onSearchChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
};

export function SearchFilterBar({
  tags,
  searchQuery,
  activeTags,
  onSearchChange,
  onToggleTag,
  onClearTags,
}: SearchFilterBarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-8 py-3">
        <div className="relative max-w-sm flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="VTuber名・配信タイトルで検索"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm text-gray-800 placeholder-gray-400 transition-all focus:border-[#1e3a5f] focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeTags.includes(tag) ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {activeTags.length > 0 && (
          <button onClick={onClearTags} className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600">
            ✕ クリア
          </button>
        )}
      </div>
    </div>
  );
}
