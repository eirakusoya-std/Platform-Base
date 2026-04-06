"use client";

import { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger" | "success";
type ButtonSize = "sm" | "md";

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "ui-btn-primary",
  secondary: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  soft: "ui-btn-soft",
  danger: "ui-btn-danger",
  success: "ui-btn-success",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "ui-btn-sm",
  md: "ui-btn-md",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  return `ui-btn ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim();
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: PropsWithChildren<UiButtonProps>) {
  return (
    <button type={type} className={buttonClassName({ variant, size, fullWidth, className })} {...props}>
      {children}
    </button>
  );
}
