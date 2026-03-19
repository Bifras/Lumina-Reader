export function resolveRestoredCollectionId(
  lastFilter: string,
  availableCollectionIds: string[],
): string {
  const targetFilter = lastFilter || 'all'
  if (targetFilter === 'all') {
    return 'all'
  }

  return availableCollectionIds.includes(targetFilter) ? targetFilter : 'all'
}
