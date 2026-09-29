import assert from 'node:assert/strict'

const base = process.env.PB_URL

async function api(path, { method = 'GET', token = '', body, status = 200 } = {}) {
  const form = body instanceof FormData
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: token, ...(!form && body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (form ? body : JSON.stringify(body)) : undefined
  })
  const data = await response.json()
  assert.equal(response.status, status, JSON.stringify(data))
  return data
}

const admin = await api('/api/collections/users/auth-with-password', {
  method: 'POST',
  body: { identity: process.env.APP_ADMIN_EMAIL, password: process.env.APP_ADMIN_PASSWORD }
})
const token = admin.token
const project = await api('/api/fangji/projects', { method: 'POST', token, body: { name: '列角色夹具' }, status: 201 })
const form = new FormData()
form.set('file', new Blob(['词头,释义,PDF页码\n样例,合成释义,1\n']), 'roles.csv')
form.set('inspect_only', 'true')
const job = await api(`/api/fangji/projects/${project.id}/imports/csv`, { method: 'POST', token, body: form, status: 202 })

async function wait(status) {
  for (let i = 0; i < 100; i++) {
    const current = await api(`/api/collections/import_jobs/records/${job.id}`, { token })
    if (current.status === status) return current
    assert.notEqual(current.status, 'failed', JSON.stringify(current))
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('import timeout')
}

await wait('validated')
await api(`/api/fangji/imports/${job.id}/commit`, { method: 'POST', token, status: 202 })
await wait('completed')

const before = await api(`/api/fangji/projects/${project.id}/column-roles`, { token })
assert.equal(before.roles.词头, 'unspecified')
assert.equal(before.roles.释义, 'unspecified')
assert.equal(before.roles.PDF页码, undefined)

const pages = await api(`/api/collections/pages/records?filter=${encodeURIComponent(`project="${project.id}"`)}`, { token })
const page = pages.items[0]
const ocrBefore = page.ocr_row_json
const proofBefore = page.proofread_row_json
const headersBefore = page.row_headers_json

const saved = await api(`/api/fangji/projects/${project.id}/column-roles`, {
  method: 'PUT',
  token,
  body: { roles: { 词头: 'headword', 释义: 'meaning', 旧列: 'reading' } }
})
assert.equal(saved.roles.词头, 'headword')
assert.equal(saved.roles.释义, 'meaning')
assert.equal(saved.roles.旧列, 'reading')
assert.equal(saved.columns.find((column) => column.name === '旧列').present, false)
assert.equal(saved.columns.find((column) => column.name === '词头').present, true)

const after = await api(`/api/collections/pages/records/${page.id}`, { token })
assert.equal(after.ocr_row_json, ocrBefore)
assert.equal(after.proofread_row_json, proofBefore)
assert.equal(after.row_headers_json, headersBefore)

await api(`/api/fangji/projects/${project.id}/column-roles`, {
  method: 'PUT',
  token,
  status: 400,
  body: { roles: { 词头: 'not-a-role' } }
})

console.log('PASS: column roles are metadata and do not change imported or proofread row bytes')
