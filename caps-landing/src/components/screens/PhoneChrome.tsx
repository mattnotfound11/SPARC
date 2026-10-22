/** iOS status bar, drawn at the 390-wide design size. */
export function StatusBar({ tone = "light" }: { tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-ink" : "text-[#0b0d12]";
  const fill = tone === "light" ? "bg-ink" : "bg-[#0b0d12]";
  return (
    <div className={`flex items-center justify-between px-7 pt-3.5 pb-1 text-[15px] font-semibold ${color}`}>
      <span>9:41</span>
      <span className="flex items-end gap-1.5">
        {/* signal */}
        <span className="flex items-end gap-[2px]">
          {[6, 8, 10, 12].map((h) => (
            <span key={h} className={`w-[3px] rounded-[1px] ${fill}`} style={{ height: h }} />
          ))}
        </span>
        {/* wifi */}
        <svg viewBox="0 0 16 12" className="h-3 w-4" aria-hidden>
          <path
            d="M8 10.5 5.8 8.2a3.2 3.2 0 0 1 4.4 0L8 10.5Zm-4.3-4.4a7.2 7.2 0 0 1 8.6 0l-1.4 1.5a5.2 5.2 0 0 0-5.8 0L3.7 6.1ZM1.3 3.6a10.7 10.7 0 0 1 13.4 0l-1.4 1.5a8.7 8.7 0 0 0-10.6 0L1.3 3.6Z"
            fill="currentColor"
          />
        </svg>
        {/* battery */}
        <span className="relative inline-flex h-[13px] w-[26px] items-center rounded-[4px] border border-current px-[2px]">
          <span className={`h-[7px] w-[16px] rounded-[2px] ${fill}`} />
          <span className={`absolute -right-[3px] h-[5px] w-[2px] rounded-r-[1px] ${fill}`} />
        </span>
      </span>
    </div>
  );
}

/** Home indicator at the bottom of the screen. */
export function HomeBar() {
  return (
    <div className="flex justify-center pt-2 pb-2.5">
      <span className="h-[5px] w-[134px] rounded-full bg-white/35" />
    </div>
  );
}
