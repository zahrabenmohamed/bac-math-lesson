import { USE_MOCK } from './auth'
import { mockApi } from './mock/api'
import { restApi } from './rest/api'
import type { Api } from './types'

export const api: Api = USE_MOCK ? mockApi : restApi
