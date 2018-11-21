/* eslint-env jest */

import { getHandler } from '.'

beforeEach(async () => {})

afterEach(async () => {})

test("xoSmb test doesn't crash", async () => {
  const handler = getHandler({
    url: 'xoSmb://login:pass@WORKGROUP\\\\ip\\smb\u0000',
    id: '12345',
    type: 'xoSmb',
  })
  const result = await handler.test()
  expect(result.success).toBeTruthy()
})
