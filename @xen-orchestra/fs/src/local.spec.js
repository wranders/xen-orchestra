/* eslint-env jest */

import { getHandler } from '.'

let handler
const defaultBasePath = `/tmp/xo-fs-mounts`

beforeEach(async () => {
  handler = getHandler({ url: 'file://tmp/xo-fs-mounts/' })
})

test('realPath return the correct path', async () => {
  const realPath = await handler._getRealPath()
  expect(realPath).toBe(`/tmp/xo-fs-mounts/`)
})

test('should return the correct path of a file', async () => {
  const result = await handler._getFilePath('filename')
  expect(result).toBe(`${defaultBasePath}/filename`)
})
