// All screen buttons expose their panel through aria-controls.
const tabs = document.querySelector('.workspace-tabs');
tabs.addEventListener('click', event => {
  const selected = event.target.closest('button[aria-controls]');
  if (!selected || !tabs.contains(selected)) return;
  const panelId = selected.getAttribute('aria-controls');
  if (!document.getElementById(panelId)) return;
  for (const button of tabs.querySelectorAll('button[aria-controls]')) {
    const active = button === selected;
    button.setAttribute('aria-pressed', String(active));
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (panel) panel.hidden = !active;
  }
  document.querySelector('#treeExportPanel').hidden = panelId !== 'treePanel';
  document.querySelector('#workspaceLocation').textContent = selected.textContent.trim();
  document.dispatchEvent(new CustomEvent('workspace:change', { detail: { panelId } }));
});
