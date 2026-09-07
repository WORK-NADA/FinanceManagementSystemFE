/**
 * Standardized field selection utility.
 *
 * Ensures that whenever a user clicks or focuses into any input or textarea
 * that contains an existing or default value (e.g. 0, default terms, or existing text),
 * the entire value is automatically selected/highlighted so the user can immediately
 * type or replace it without manually clearing or selecting the existing value.
 */

export function isSelectableField(
  el: unknown
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false;

  if (el instanceof HTMLInputElement) {
    const nonSelectableTypes = [
      'checkbox',
      'radio',
      'file',
      'button',
      'submit',
      'reset',
      'date',
      'hidden',
      'range',
      'color',
    ];
    return (
      !nonSelectableTypes.includes(el.type) && !el.readOnly && !el.disabled
    );
  }

  if (el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled;
  }

  return false;
}

export function selectInputText(el: HTMLInputElement | HTMLTextAreaElement) {
  try {
    if (el.value !== undefined && el.value !== null && el.value !== '') {
      el.select();
    }
  } catch {
    // Ignore any browser-specific input selection restrictions
  }
}

/**
 * Initializes global event listeners to apply consistent auto-selection behavior
 * across all form fields in all modules.
 */
export function setupFieldAutoSelect(): () => void {
  if (typeof document === 'undefined') return () => {};

  let justFocusedElement: (HTMLInputElement | HTMLTextAreaElement) | null = null;
  let focusTime = 0;

  const handleFocusIn = (e: FocusEvent) => {
    if (isSelectableField(e.target)) {
      justFocusedElement = e.target;
      focusTime = Date.now();
      selectInputText(e.target);
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    // If this mouseup event belongs to the input that just received focus,
    // re-select to overcome browser's native caret placement on mouseup.
    if (
      justFocusedElement &&
      justFocusedElement === e.target &&
      Date.now() - focusTime < 600
    ) {
      const target = justFocusedElement;
      justFocusedElement = null;

      selectInputText(target);
      requestAnimationFrame(() => {
        selectInputText(target);
      });
    }
  };

  const handleKeyDown = () => {
    justFocusedElement = null;
  };

  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('mouseup', handleMouseUp, true);
  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('focusin', handleFocusIn, true);
    document.removeEventListener('mouseup', handleMouseUp, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}
