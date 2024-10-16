import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { assertHTTPMethod } from './asserts'
import { getAccessToken, getHomepage, getHost } from './environ'
import { HTTPError } from './errors'
import { modifyPackument } from './packument'
import { empty, error, json, redirect } from './shorthand'

import advisories from './advisories.json'
import audits from './audits.json'

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (event.path.startsWith('/-/')) {
      assertHTTPMethod(event, 'POST')
      if (event.path === '/-/ping') return empty()
      if (event.path === '/-/npm/v1/security/advisories/bulk') return json(advisories)
      if (event.path === '/-/npm/v1/security/audits/quick') return json(audits)
      return error(403, 'Forbidden')
    } else {
      const scope = getScope(event.path)
      const token = getAccessToken(scope)
      if (!isNPMRequest(event)) return redirect(new URL(scope, 'https://github.com'))
      if (event.path.startsWith('/@')) return forwardPackageInfo(event, token)
      if (event.path.startsWith('/download/@')) return forwardDownload(event)
    }
    return redirect(getHomepage())
  } catch (err: unknown) {
    if (err instanceof HTTPError) return err.toJSON()
    if (err instanceof Error) return error(500, err.message)
    return error(500, 'Internal Server Error')
  }
}

async function forwardDownload(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  assertHTTPMethod(event, 'GET')
  const url = new URL(event.path, 'https://npm.pkg.github.com')
  const headers = toHeaders(event)
  headers.set('host', url.host)
  const response = await fetch(url.toString(), { redirect: 'manual', headers })
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  }
}

async function forwardPackageInfo(event: APIGatewayProxyEvent, token: string): Promise<APIGatewayProxyResult> {
  assertHTTPMethod(event, 'GET')
  const host = getHost(event.requestContext.domainName)
  const url = new URL(event.path, 'https://npm.pkg.github.com')
  const headers = toHeaders(event)
  headers.set('host', url.host)
  headers.set('accept', 'application/json')
  headers.set('accept-encoding', 'gzip')
  headers.set('authorization', `Bearer ${token}`)
  const response = await fetch(url.toString(), { redirect: 'manual', headers })
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body: JSON.stringify(modifyPackument(await response.json(), host)),
  }
}

function getScope(pathname: string) {
  pathname = decodeURIComponent(pathname)

  let startIndex: number, endIndex: number

  startIndex = pathname.indexOf('/@')
  if (startIndex === -1) throw new HTTPError(403, 'Invalid Scope')

  endIndex = pathname.indexOf('/', startIndex + 2)
  if (endIndex === -1) throw new HTTPError(403, 'Invalid Scope')

  return pathname.slice(startIndex + 2, endIndex).toLowerCase()
}

function isNPMRequest(event: APIGatewayProxyEvent) {
  return toHeaders(event).get('user-agent')?.startsWith('npm/') ?? false
}

function toHeaders(event: APIGatewayProxyEvent) {
  const headers = new Headers()
  for (const name of Object.keys(event.headers)) {
    if (!event.headers[name]) continue
    headers.set(name, event.headers[name])
  }
  return headers
}
