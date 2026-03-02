export function getObjectIdFromEvent(event: { target: EventTarget | null }): string | null {
  const target = event.target as SVGElement
  const objectId = target.closest('[data-object-id]')?.getAttribute('data-object-id')
  return objectId ?? null
}
