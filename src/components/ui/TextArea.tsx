import React, { forwardRef } from 'react';

export interface TextAreaProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  helpText?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>((
  {
    id,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    label,
    rows = 4,
    maxLength,
    className = '',
    helpText
  },
  ref
) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const characterCount = value?.length || 0;
  const showCharacterCount = maxLength && maxLength > 0;

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
      
      <textarea
        ref={ref}
        id={id || name}
        name={name}
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm resize-vertical
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200
          ${error 
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 text-gray-900'
          }
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error 
            ? `${id || name}-error` 
            : helpText 
              ? `${id || name}-help` 
              : undefined
        }
      />
      
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {helpText && !error && (
            <p 
              id={`${id || name}-help`} 
              className="text-sm text-gray-500"
            >
              {helpText}
            </p>
          )}
          
          {error && (
            <p 
              id={`${id || name}-error`} 
              className="text-sm text-red-600"
            >
              {error}
            </p>
          )}
        </div>
        
        {showCharacterCount && (
          <p className={`text-sm ml-2 ${
            characterCount > maxLength! * 0.9 
              ? characterCount >= maxLength! 
                ? 'text-red-600' 
                : 'text-orange-600'
              : 'text-gray-500'
          }`}>
            {characterCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}); 