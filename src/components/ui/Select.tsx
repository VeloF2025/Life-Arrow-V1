import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[] | readonly string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Please select...',
  required = false,
  disabled = false,
  error,
  label,
  className = ''
}: SelectProps) {
  // Convert string array to SelectOption array if needed
  // Add null check to prevent errors when options is undefined
  const selectOptions: SelectOption[] = options?.map(option => 
    typeof option === 'string' ? { value: option, label: option } : option
  ) || [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Select changed:', e.target.value);
    // Log the selected option for debugging
    const selectedOption = selectOptions.find(opt => opt.value === e.target.value);
    console.log('Selected option:', selectedOption);
    onChange(e.target.value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label 
          htmlFor={id || name} 
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={id || name}
        name={name}
        value={value}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm 
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200
          ${error 
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 text-gray-900'
          }
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id || name}-error` : undefined}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p 
          id={`${id || name}-error`} 
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Also export as default for compatibility
export default Select; 