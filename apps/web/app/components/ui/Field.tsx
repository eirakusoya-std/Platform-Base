"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldLabelProps = {
  children: string;
  className?: string;
};

export function FieldLabel({ children, className = "" }: FieldLabelProps) {
  return <span className={`text-xs font-semibold text-[var(--brand-text-muted)] ${className}`.trim()}>{children}</span>;
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;
export function TextInput({ className = "", ...props }: TextInputProps) {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextArea({ className = "", ...props }: TextAreaProps) {
  return <textarea className={`ui-textarea ${className}`.trim()} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
export function SelectField({ className = "", ...props }: SelectProps) {
  return <select className={`ui-select ${className}`.trim()} {...props} />;
}
