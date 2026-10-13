async (page) => {
  const { runPilotBatch } = await import('./playwright-runner.mjs');
  return runPilotBatch(page, { postIds: ['p0-family-sports-day'], publish: true });
}
