async (page) => {
  const { runPilotBatch, appendLedger } = await import('./playwright-runner.mjs');
  const out = await runPilotBatch(page, {
    postIds: ['p0-family-sports-day', 'p0-keyum-center-spomove', 'conv-maedong-neulbom'],
    publish: true,
  });
  try {
    appendLedger(out);
  } catch {
    /* ledger optional in MCP cwd */
  }
  return out;
}
