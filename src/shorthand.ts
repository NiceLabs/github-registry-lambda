import type { APIGatewayProxyResult } from 'aws-lambda'

export function json(data: unknown) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

export function error(statusCode: number, error: string): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({ error }),
  }
}

export function redirect(location: string | URL): APIGatewayProxyResult {
  return {
    statusCode: 302,
    body: '',
    headers: { location: location.toString() },
  }
}

export function empty(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    body: '',
  }
}
