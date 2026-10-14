import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges class names and resolves Tailwind conflicts (used by all shadcn components).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
