"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-foreground mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-background border border-border-color rounded-xl
              px-3 py-2 text-sm text-foreground
              placeholder:text-muted
              transition-colors duration-150
              focus:outline-none focus:border-foreground
              hover:border-brand-300
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? "pl-9" : ""}
              ${error ? "border-foreground" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-foreground">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
