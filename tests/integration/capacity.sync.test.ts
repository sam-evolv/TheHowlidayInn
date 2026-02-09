import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const date = '2025-10-09';

const j = (u: string, o?: any) =>
  fetch(`${BASE_URL}${u}`, o && { ...o, headers: { 'Content-Type': 'application/json', ...o.headers } });

test('Capacity overview reflects defaults & overrides instantly', async () => {
  // 1. Update defaults: daycare=11, boardingSmall=10, boardingLarge=8, trial=10
  const updateDefaultsRes = await j('/api/capacity/defaults', {
    method: 'PUT',
    body: JSON.stringify({ daycare: 11, boardingSmall: 10, boardingLarge: 8, trial: 10 })
  });
  assert.equal(updateDefaultsRes.status, 200, 'PUT /api/capacity/defaults should return 200');

  // 2. Verify overview shows defaults
  let overviewRes = await j(`/api/capacity/overview?date=${date}`);
  assert.equal(overviewRes.status, 200, 'GET /api/capacity/overview should return 200');
  
  let r = await overviewRes.json();
  assert.equal(r.resources.daycare.capacity, 11, 'Daycare capacity should be 11');
  assert.equal(r.aggregate.boarding.capacity, 18, 'Boarding aggregate should be 18 (10+8)');
  assert.equal(r.resources['trial:day'].capacity, 10, 'Trial Day capacity should be 10');

  // 3. Create override: daycare=12 for the date
  const createOverrideRes = await j('/api/admin/capacity', {
    method: 'POST',
    body: JSON.stringify({ 
      service: 'Daycare', 
      date_start: date, 
      date_end: date, 
      slot: 'ALL_DAY',
      capacity: 12 
    })
  });
  assert.equal(createOverrideRes.status, 200, 'POST /api/admin/capacity should return 200');

  // 4. Verify overview shows override
  overviewRes = await j(`/api/capacity/overview?date=${date}`);
  r = await overviewRes.json();
  assert.equal(r.resources.daycare.capacity, 12, 'Daycare capacity should be 12 (override applied)');

  // 5. Delete the override
  const deleteOverrideRes = await j(`/api/admin/capacity?service=Daycare&date_start=${date}&date_end=${date}&slot=ALL_DAY`, { 
    method: 'DELETE' 
  });
  assert.equal(deleteOverrideRes.status, 200, 'DELETE /api/admin/capacity should return 200');

  // 6. Verify overview reverts to defaults
  overviewRes = await j(`/api/capacity/overview?date=${date}`);
  r = await overviewRes.json();
  assert.equal(r.resources.daycare.capacity, 11, 'Daycare capacity should revert to 11 (default)');

  console.log('[OK] Capacity overview reflects defaults & overrides instantly.');
});
