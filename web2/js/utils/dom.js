/**
 * Create an element with optional attributes and children.
 * @param {string} tag
 * @param {Object} [attrs] - Attributes/properties. 'class' sets className, 'on' is an event map.
 * @param  {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'on') {
      for (const [event, handler] of Object.entries(value)) {
        element.addEventListener(event, handler);
      }
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child == null) continue;
    element.append(typeof child === 'string' ? child : child);
  }

  return element;
}

/** @param {string} selector */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** @param {string} selector */
export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}
