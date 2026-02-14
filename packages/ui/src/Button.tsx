import type { ButtonHTMLAttributes } from 'react';

/** Placeholder button for future design system */
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}
