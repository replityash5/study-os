export function SegmentedToggle({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex rounded-[16px] bg-slate-100 p-1">
      {options.map((option, index) => (
        <button
          key={option}
          onClick={() => onChange(index)}
          aria-pressed={value === index}
          className={`flex-1 rounded-[12px] px-2 py-2 text-xs font-semibold transition ${
            value === index
              ? 'bg-primary text-white shadow-soft-purple'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
