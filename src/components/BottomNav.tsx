interface NavButton {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface Props {
  buttons: NavButton[];
}

export function BottomNav({ buttons }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 bg-surface border-t border-divider shadow-[0_-4px_12px_rgba(0,0,0,0.5)] z-40">
      {buttons.map(b => (
        <button
          key={b.label}
          onClick={b.onClick}
          disabled={b.disabled}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-bold uppercase active:scale-90 transition-all
            ${b.active ? 'text-accent' : 'text-text hover:text-white hover:bg-divider'}
            ${b.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span
            className="material-symbols-outlined mb-1"
            style={b.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {b.icon}
          </span>
          {b.label}
        </button>
      ))}
    </nav>
  );
}
