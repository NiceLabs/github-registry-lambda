import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

// (required) The is GitHub Personal Token as `read:package` permission
const ACCESS_TOKEN = process.env.ACCESS_TOKEN!
// (required) The host name for the response
const HOST = process.env.HOST ?? 'npm.example.com'
// (optional) The home page URL for the response
const HOMEPAGE_URL = process.env.HOMEPAGE_URL ?? 'https://github.com/NiceLabs/github-registry-lambda'
// (optional) The list of npm scope for the response
const NPM_SCOPE_LIST = new Set<string>(
  process.env.NPM_SCOPE_LIST?.split(';').map((scope) => scope.toLowerCase().trim())
)

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod !== 'GET') return error(405, 'Method Not Allowed')
  if (event.path === '/') return redirect(HOMEPAGE_URL)
  if (event.path === '/-/ping') return empty()
  if (event.path.startsWith('/-/')) return error(403, 'Not Allowed')
  const scope = getScope(event.path)
  if (!isAllowedScope(scope)) return error(403, `Not Allowed Scope: ${scope}`)
  const url = new URL(event.path, 'https://npm.pkg.github.com')
  const isDownloaded = url.pathname.startsWith('/download')
  const headers = new Headers({
    ...event.headers,
    'Host': url.host,
    'Accept': isDownloaded ? '*/*' : 'application/json',
    'Accept-Encoding': 'gzip',
    'Authorization': `Bearer ${getAccessToken(scope)}`,
  })
  const response = await fetch(url.toString(), { headers, redirect: 'manual' })
  const body = await response.text()
  return {
    statusCode: response.status,
    headers: Object.fromEntries(Array.from(response.headers)),
    body: body.replaceAll(url.host, HOST),
  }
}

function getAccessToken(scope: string): string {
  if (!scope) return ACCESS_TOKEN
  const token = process.env[`ACCESS_TOKEN_${scope.toUpperCase()}`]
  return token ? token : ACCESS_TOKEN
}

function getScope(pathname: string) {
  pathname = decodeURIComponent(pathname)
  const startIndex = pathname.indexOf('/@')
  if (startIndex === -1) return undefined
  const endIndex = pathname.indexOf('/', startIndex + 2)
  return pathname.slice(startIndex + 2, endIndex).toLowerCase()
}

function isAllowedScope(scope: string | undefined): scope is string {
  if (NPM_SCOPE_LIST.size === 0) return true
  if (scope === undefined) return false
  return NPM_SCOPE_LIST.has(scope)
}

function error(statusCode: number, error: string): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({ error }),
  }
}

function redirect(location: string | URL): APIGatewayProxyResult {
  return {
    statusCode: 302,
    body: '',
    headers: { location: location.toString() },
  }
}

function empty(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    body: '',
  }
}
