// Deletes every Vercel deployment of this project except the newest one.
// Runs only when the newest deployment is a READY production deployment,
// so a failed or in-flight release never removes the live site.
const { VERCEL_TOKEN, VERCEL_PROJECT_ID } = process.env;
const teamId = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('VERCEL_TOKEN and VERCEL_PROJECT_ID are required');
  process.exit(1);
}
const api = async (path, init = {}) => {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
};

const all = [];
let until;
do {
  const page = await api(`/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=100${until ? `&until=${until}` : ''}`);
  all.push(...page.deployments);
  until = page.pagination?.next;
} while (until);

all.sort((a, b) => b.created - a.created);
const [latest, ...older] = all;
if (!latest) {
  console.log('No deployments found.');
  process.exit(0);
}
const state = latest.readyState || latest.state;
if (latest.target !== 'production' || state !== 'READY') {
  console.error(`Newest deployment ${latest.url} is ${latest.target || 'preview'}/${state}; nothing deleted.`);
  process.exit(1);
}
console.log(`Keeping ${latest.url} (${latest.uid})`);
for (const d of older) {
  await api(`/v13/deployments/${d.uid}`, { method: 'DELETE' });
  console.log(`Deleted ${d.url} (${d.uid})`);
}
console.log(`Done: removed ${older.length} old deployment(s).`);
