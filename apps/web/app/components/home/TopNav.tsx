export function TopNav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-8 py-5 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#1e3a5f] text-xs font-bold text-white">A</div>
            <span className="text-lg font-medium tracking-wide text-gray-900">aiment</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="px-5 py-2 font-medium text-[#1e3a5f]">ライブ</span>
            <span className="text-gray-300">|</span>
            <span className="px-5 py-2 text-gray-600">スケジュール</span>
            <span className="text-gray-300">|</span>
            <span className="px-5 py-2 text-gray-600">タレント</span>
            <span className="mx-1 text-gray-300">|</span>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-gray-50">
              <div className="h-7 w-7 overflow-hidden rounded-full border-2 border-[#1e3a5f]">
                <img
                  src="https://api.dicebear.com/7.x/adventurer/svg?seed=TaroTanaka&backgroundColor=e6f0ff&hair=short02"
                  alt="田中太郎"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-sm text-gray-900">田中太郎</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
