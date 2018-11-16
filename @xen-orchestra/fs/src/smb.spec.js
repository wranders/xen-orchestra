/* eslint-env jest */

import { getHandler } from '.'

let handler
const remoteId = '12345'
const defaultBasePath = `/tmp/xo-fs-mounts/${remoteId}`

beforeEach(async () => {
  handler = getHandler({
    url: 'smb://login:pass@WORKGROUP\\\\192.168.0.0',
    id: remoteId,
  })
})

test('should return the correct type', async () => {
  expect(handler.type).toBe('smb')
})

test('realPath return the correct path', async () => {
  const realPath = handler._getRealPath()
  expect(realPath).toBe(defaultBasePath)
})

test('should call _mount() when _sync() method is called', async () => {
  handler._mount = jest.fn()
  handler._sync()
  expect(handler._mount).toHaveBeenCalled()
})

test('should call _umount() when _forget() method is called', async () => {
  handler._umount = jest.fn()
  handler._forget()
  expect(handler._umount).toHaveBeenCalled()
})
