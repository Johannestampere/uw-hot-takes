import { SortOption } from "@/lib/api";

interface SortToggleProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const options: { value: SortOption; label: string }[] = [
  { value: "hottest_24h", label: "Hot 24h" },
  { value: "hottest_7d", label: "Hot 7d" },
  { value: "newest", label: "New" },
];

export default function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-zinc-800 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
            value === option.value
              ? "bg-[#ffd700] text-black shadow-sm"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
