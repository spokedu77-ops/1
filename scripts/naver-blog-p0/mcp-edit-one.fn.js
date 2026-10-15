/* eslint-disable @typescript-eslint/no-unused-expressions -- evaluated as an MCP function expression */
async (page) => {
  const postId = process.env.NAVER_P0_POST_ID || 'p0-family-sports-day';
  const { runPilotBatch } = await import('./playwright-runner.mjs');
  return runPilotBatch(page, { postIds: [postId], publish: true });
}
