import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  id?: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  className = '',
  disabled = false,
}) => {
  const selectId = id || `select-dropdown-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={selectId} className="block text-sm font-semibold text-cyan-200 mb-1">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="block w-full appearance-none rounded-lg border border-[#2f4064] bg-[#12203f] px-3 py-2 pr-10 text-cyan-100 shadow-inner outline-none transition-all duration-150 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#12203f] text-cyan-100">
            {option.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-cyan-200">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};
