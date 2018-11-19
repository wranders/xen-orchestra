/* eslint-env jest */

import { getHandler } from '.'
import fs from 'fs-extra'

let handler
const remoteId = '12345'
const defaultBasePath = `/tmp/xo-fs-mounts/${remoteId}`

describe('smb', () => {
  beforeEach(async () => {
    handler = await getHandler({
      url: 'smb://login:pass@WORKGROUP\\\\ip\\smb\u0000',
      id: remoteId,
    })
  })

  afterEach(async () => {
    await handler._umount()
  })

  it('should call _mount() when _sync() method is called', async () => {
    const result = await handler._mount()
    expect(result.url).toBe(handler.url)
  })

  it('should return correct content folder', async () => {
    const contentFolder = await fs.readdir(defaultBasePath)
    const list = await handler._list()
    expect(list).toEqual(contentFolder)
  })
})
