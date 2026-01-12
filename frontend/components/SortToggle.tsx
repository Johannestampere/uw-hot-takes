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
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === option.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
