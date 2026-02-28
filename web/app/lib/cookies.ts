/** Parse a named cookie from the request's Cookie header. */
export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') || ''
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}
