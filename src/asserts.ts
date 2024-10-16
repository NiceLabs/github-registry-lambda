import type { APIGatewayProxyEvent } from 'aws-lambda'
import { HTTPError } from './errors'

export function assertHTTPMethod(event: APIGatewayProxyEvent, method: string) {
  if (event.httpMethod === method) return
  throw new HTTPError(405, 'Method Not Allowed')
}
