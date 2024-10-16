import { HTTPError } from './errors'

// (required) The is GitHub Personal Token as `read:package` permission
const ACCESS_TOKEN = process.env.ACCESS_TOKEN
// (optional) The host name for the response
const HOST = process.env.HOST
// (optional) The home page URL for the response
const HOMEPAGE_URL = process.env.HOMEPAGE_URL
// (optional) The list of npm scope for the response
const NPM_SCOPE_LIST = new Set<string>(
  process.env.NPM_SCOPE_LIST?.toLowerCase()
    .split(';')
    .map((scope) => scope.trim())
)

export function getAccessToken(scope = 'GLOBAL') {
  assertAllowedScope(scope)
  scope = scope.toUpperCase()
  const token = process.env[`ACCESS_TOKEN_${scope}`] ?? ACCESS_TOKEN
  if (token === undefined) throw new HTTPError(403, 'Invalid Access Token')
  // Personal access tokens (classic)
  if (token.startsWith('ghp_')) return token
  // Fine-grained personal access tokens
  if (token.startsWith('github_pat_')) return token
  throw new HTTPError(403, 'Invalid Access Token')
}

export function getHost(defaultHost?: string): string {
  if (HOST) return HOST
  if (defaultHost) return defaultHost
  return 'npm.pkg.github.com'
}

export function getHomepage() {
  if (HOMEPAGE_URL) return HOMEPAGE_URL
  return 'https://github.com/NiceLabs/github-registry-lambda'
}

export function assertAllowedScope(scope: string | undefined): asserts scope is string {
  if (scope === undefined) throw new HTTPError(403, 'Invalid Scope')
  if (NPM_SCOPE_LIST.size === 0) return
  if (NPM_SCOPE_LIST.has(scope)) return
  throw new HTTPError(403, `Not Allowed Scope: ${scope}`)
}
