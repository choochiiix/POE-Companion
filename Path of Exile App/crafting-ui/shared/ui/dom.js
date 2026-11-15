// Scoped helpers keep text rendering safe and support alternate owner documents.
const backdropDocuments = new WeakSet();
export function enableBackdropDismiss(doc) {
  if (backdropDocuments.has(doc)) return;
  backdropDocuments.add(doc);
  let pressed = null;
  const outside = (event, dialog) => {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom;
  };
  doc.addEventListener('pointerdown', event => {
    const dialog = event.target;
    pressed = event.button === 0 && dialog?.tagName === 'DIALOG' &&
      dialog.open && outside(event, dialog) ? dialog : null;
  }, true);
  doc.addEventListener('pointercancel', () => { pressed = null; }, true);
  doc.addEventListener('click', event => {
    const dialog = pressed;
    pressed = null;
    if (!dialog?.open || event.target !== dialog || !outside(event, dialog)) return;
    event.preventDefault();
    event.stopPropagation();
    // Use the same cancel pathway as Escape, including animated close handlers.
    if (typeof dialog.requestClose === 'function') dialog.requestClose();
    else if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  }, true);
}

export function createElementFactory(root) {
  enableBackdropDismiss(root.ownerDocument);
  return function el(tag, text = '', parent = root) {
    const node = parent.ownerDocument.createElement(tag);
    node.textContent = text;
    parent.append(node);
    return node;
  };
}
