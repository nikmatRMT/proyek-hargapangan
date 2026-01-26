export function cn(...a: Array<string|false|undefined|null>) {
  return a.filter(Boolean).join(' ')
}
