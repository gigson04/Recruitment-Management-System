document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;
  const active = document.body.dataset.active || 'Dashboard';
  renderShell({ active });
  await loadUserProfile();
});
