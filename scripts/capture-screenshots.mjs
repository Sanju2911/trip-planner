import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Capture the real React UI with fictional API responses. No remote database is contacted.
const baseURL = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173'
const output = new URL('../docs/screenshots/', import.meta.url)
await mkdir(output, { recursive: true })
const userId = '11111111-1111-4111-8111-111111111111'
const tripId = '22222222-2222-4222-8222-222222222222'
const profile = { id: userId, email: 'alex@example.com', display_name: 'Alex', username: 'alex_travels', role: 'admin', is_approved: true, avatar_url: null, created_at: '2026-10-01T10:00:00Z' }
const friend = { ...profile, id: '33333333-3333-4333-8333-333333333333', email: 'maya@example.com', display_name: 'Maya', username: 'maya', role: 'user' }
const members = [profile, friend].map((p, i) => ({ id: `member-${i}`, trip_id: tripId, user_id: p.id, profiles: p, transport_modes: ['Train'], carpool_user_id: null }))
const trip = {
  id: tripId, title: 'A weekend in Coorg', description: 'Coffee trails, waterfalls, and good company. A relaxed three-day escape with friends.',
  target_location: 'Coorg, Karnataka', target_lat: null, target_lng: null,
  finalized_date: '2026-10-16', end_date: '2026-10-18', total_days: 3,
  possible_dates: [], reschedule_dates: [], home_exit_time: '06:00', return_home_time: '21:00',
  starting_point: 'Bengaluru railway station', meeting_options: ['Station main entrance', 'Central bus stand'], meet_condition: 'Arrive 15 minutes early',
  breakfast_point: 'Coffee estate cafe', breakfast_time: '09:00', lunch_point: 'Local Karnataka thali', lunch_time: '13:00', dinner_point: 'Dinner at the homestay', dinner_time: '19:30',
  budget_per_person: '6500', created_by: userId, created_at: '2026-10-01T10:00:00Z', cover_image_url: null,
  accommodations: [{ location: 'Coffee Grove Homestay', days: 2, reach_time: '14:00', cost: '₹2,400 per person' }],
  trip_members: members, profiles: profile,
}
const fixtures = {
  profiles: [profile, friend, { ...friend, id: 'pending-user', display_name: 'Jordan', username: 'jordan', email: 'jordan@example.com', is_approved: false }],
  trips: [trip, { ...trip, id: '44444444-4444-4444-8444-444444444444', title: 'Sunrise at Nandi Hills', target_location: 'Nandi Hills, Karnataka', finalized_date: '2026-10-24', end_date: null, total_days: 1, budget_per_person: '1200' }],
  trip_members: members,
  trip_images: [], trip_links: [],
  trip_meeting_votes: [{ id: 'vote-1', trip_id: tripId, user_id: userId, voted_option: 'Station main entrance' }],
  trip_comments: [{ id: 'comment-1', trip_id: tripId, user_id: friend.id, content: 'Looking forward to the coffee estate walk! I will bring snacks for the journey.', profiles: friend, created_at: '2026-10-12T10:30:00Z' }],
  trip_itinerary: [
    { id: 'activity-1', day_number: 1, title: 'Coffee estate walk', description: 'Explore the plantation and enjoy a fresh brew.', start_time: '09:00', location: 'Madikeri', activity_type: 'sightseeing', estimated_cost: 350 },
    { id: 'activity-2', day_number: 1, title: 'Waterfall viewpoint', description: 'An easy afternoon walk with photo stops.', start_time: '15:00', location: 'Abbey Falls', activity_type: 'adventure', estimated_cost: 100 },
    { id: 'activity-3', day_number: 2, title: 'Local food trail', description: 'Try regional dishes and explore the market.', start_time: '12:00', location: 'Town centre', activity_type: 'food', estimated_cost: 500 },
  ],
  trip_expenses: [
    { id: 'expense-1', title: 'Homestay booking', amount: 4800, category: 'accommodation', profiles: profile, paid_by: userId, split_with: [userId, friend.id], description: 'Two nights, shared equally.' },
    { id: 'expense-2', title: 'Train tickets', amount: 1800, category: 'transport', profiles: friend, paid_by: friend.id, split_with: [userId, friend.id], description: 'Return tickets for two.' },
  ],
  trip_transport: [{ id: 'transport-1', type: 'train', booking_details: 'Weekend express · seats 21 and 22', departure_time: '2026-10-16T06:30', arrival_time: '2026-10-16T11:30', pickup_location: 'Station main entrance', cost_per_person: 900 }],
  trip_packing: [{ id: 'packing-1', item_name: 'Walking shoes', type: 'personal', is_checked: true }, { id: 'packing-2', item_name: 'Rain jacket', type: 'personal', is_checked: false }, { id: 'packing-3', item_name: 'First aid kit', type: 'shared', is_checked: false }],
}
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' })
// Intercept before navigating, including mutations triggered by effects.
await context.route('**/*', async route => {
  const request = route.request()
  const url = new URL(request.url())
  if (url.pathname.includes('/rest/v1/')) {
    const table = url.pathname.split('/rest/v1/')[1].split('/')[0]
    const single = (request.headers().accept || '').includes('vnd.pgrst.object')
    const rows = fixtures[table] || []
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? rows[0] || null : rows) })
  }
  if (url.origin === new URL(baseURL).origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue()
  if (url.hostname === 'maps.google.com') return route.fulfill({ contentType: 'text/html', body: '<html><body style="font:14px system-ui;color:#65747a;background:#f4f6f6;display:grid;place-items:center;height:90vh">Map preview omitted in screenshot demo</body></html>' })
  return route.abort()
})
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.clock.install({ time: new Date('2026-10-14T04:30:00Z') })
async function capture(name, locator) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  if (locator) await locator.screenshot({ path: fileURLToPath(new URL(name, output)) })
  else await page.screenshot({ path: fileURLToPath(new URL(name, output)), fullPage: false })
  console.log(`Captured ${name}`)
}
try {
  await page.goto(`${baseURL}/auth`)
  await page.getByRole('button', { name: 'Sign In', exact: true }).last().waitFor()
  await capture('01-sign-in.png')
  await context.addInitScript(({ user, origin }) => {
    if (window.location.origin === origin) localStorage.setItem('trip_planner_user', JSON.stringify(user))
  }, { user: { id: userId, email: profile.email }, origin: new URL(baseURL).origin })
  await page.goto(baseURL)
  await page.getByRole('heading', { name: /Alex/ }).waitFor()
  await page.getByText('A weekend in Coorg').first().waitFor()
  await page.setViewportSize({ width: 1920, height: 1440 })
  await capture('02-dashboard.png')
  await page.setViewportSize({ width: 1920, height: 1200 })
  await page.goto(`${baseURL}/trips/${tripId}/edit`)
  await page.locator('input[value="A weekend in Coorg"]').waitFor()
  await capture('03-trip-wizard.png')
  await page.goto(`${baseURL}/trips/${tripId}`)
  await page.getByRole('heading', { name: 'A weekend in Coorg' }).waitFor()
  await page.getByText('Coffee estate walk', { exact: true }).waitFor()
  await capture('04-trip-overview.png')
  const tabs = page.locator('.trip-tabs-container')
  await capture('05-day-plan.png', tabs)
  await page.getByRole('button', { name: 'Expenses', exact: true }).click()
  await page.getByText('Homestay booking', { exact: true }).waitFor()
  await capture('06-expenses.png', tabs)
  await page.getByRole('button', { name: 'Packing', exact: true }).click()
  await page.getByText('Rain jacket', { exact: true }).waitFor()
  await capture('07-packing.png', tabs)
  await page.goto(`${baseURL}/admin`)
  await page.getByText('jordan@example.com', { exact: true }).waitFor()
  await capture('08-admin.png')
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
} finally {
  await browser.close()
}
