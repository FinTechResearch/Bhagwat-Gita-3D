import { handleApiRequest } from '../server/gita-router.mjs'

export default function handler(request, response) {
  return handleApiRequest(request, response)
}
