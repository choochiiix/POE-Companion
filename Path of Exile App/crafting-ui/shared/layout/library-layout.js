import { createElementFactory } from '../ui/dom.js';

export function installInspector(layout, title = 'Record details', initial) {
  const el = createElementFactory(layout);
  layout.classList.add('library-workspace');
  const pane = el('aside');
  pane.className = 'library-inspector';
  pane.setAttribute('aria-label', title);
  el('h3', title, pane);
  const tools = el('div', '', pane);
  tools.className = 'inspector-tools';
  const body = el('div', '', pane);
  const close = el('button', 'Hide inspector', tools);
  close.type = 'button';
  const show = el('button', 'Show inspector');
  show.type = 'button';
  show.className = 'show-inspector';
  show.hidden = true;
  layout.before(show);
  let trigger;

  close.onclick = () => {
    pane.hidden = true;
    show.hidden = false;
    layout.classList.add('inspector-hidden');
    (trigger?.isConnected ? trigger : show).focus();
  };
  show.onclick = () => {
    pane.hidden = false;
    show.hidden = true;
    layout.classList.remove('inspector-hidden');
    close.focus();
  };

  function reset() {
    body.replaceChildren();
    if (initial) body.append(initial);
    else el('p', 'Select Inspect on a record to see its details here.', body);
  }
  if (initial) {
    const back = el('button', 'Skill setup', tools);
    back.type = 'button';
    back.onclick = reset;
    tools.prepend(back);
  }
  reset();

  return {
    body,
    reset,
    inspect(card, button) {
      trigger = button;
      show.onclick();
      body.replaceChildren();
      const copy = card.cloneNode(true);
      // Copied references are read-only; restore text before re-annotating terms.
      copy.querySelectorAll('.definition-term').forEach(node => node.replaceWith(layout.ownerDocument.createTextNode(node.textContent)));
      copy.querySelectorAll('button, [role=tooltip], .gem-source-details').forEach(node => node.remove());
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      body.append(copy);
      el('p', 'Reference details · use the library controls to change your setup.', body);
    },
  };
}
