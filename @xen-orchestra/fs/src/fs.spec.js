/* eslint-env jest */

import { getHandler } from '.'

const handlerList = [
  { url: 'file://' + process.cwd() },
  {
    url: 'smb://login:pass@WORKGROUP\\\\ip\\smb\u0000',
    id: '12345',
  },
  {
    url: 'nfs://ip:/tmp/test',
    id: '12345',
  },
]

handlerList.forEach(element => {
  describe('test()', () => {
    it(`handler doesn't crash`, async () => {
      const handler = getHandler(element)
      const result = await handler.test()
      expect(result.success).toBeTruthy()
    })
  })
})
