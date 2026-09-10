// Shared (non-component) helpers for the tools pages. Kept out of the .tsx
// component files so React Fast Refresh keeps working.

// 16px on phones so iOS Safari doesn't zoom into focused inputs.
export const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50';

export const buttonClass = {
  primary:
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60',
  danger:
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-white px-3.5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60',
  dangerSolid:
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60',
};

/** Opens WhatsApp (app on phones, WhatsApp Web on desktop) with the text ready to send. */
export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older mobile browsers / non-secure contexts: textarea fallback.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
