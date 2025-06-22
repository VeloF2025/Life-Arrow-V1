import React from 'react';

export interface CheckboxProps {
  id?: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  labelClassName?: string;
}

export function Checkbox({
  id,
  name,
  checked,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
  className = '',
  labelClassName = ''
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={id || name}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            required={required}
            disabled={disabled}
            className={`
              h-4 w-4 rounded border-gray-300 
              text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-300' : 'border-gray-300'}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id || name}-error` : undefined}
          />
        </div>
        
        {label && (
          <div className="ml-3">
            <label 
              htmlFor={id || name} 
              className={`text-sm text-gray-700 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${labelClassName}`}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={`${id || name}-error`} 
          className="text-sm text-red-600 ml-7"
        >
          {error}
        </p>
      )}
    </div>
  );
} 