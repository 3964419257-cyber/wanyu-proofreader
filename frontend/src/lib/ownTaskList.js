function pageNumber(item) {
  const value = Number(item?.page_number)
  return Number.isFinite(value) ? value : 0
}

// 进行中的条目优先保留，避免同一条既可编辑又被当成只读回看。
export function mergeOwnTasks(active = [], reviewed = []) {
  const byId = new Map()
  for (const item of active) {
    if (!item?.id) continue
    byId.set(item.id, { id: item.id, page_number: pageNumber(item), kind: 'active' })
  }
  for (const item of reviewed) {
    if (!item?.id || byId.has(item.id)) continue
    byId.set(item.id, { id: item.id, page_number: pageNumber(item), kind: 'reviewed' })
  }
  return [...byId.values()].sort((left, right) => {
    if (left.page_number !== right.page_number) return left.page_number - right.page_number
    return String(left.id).localeCompare(String(right.id))
  })
}
