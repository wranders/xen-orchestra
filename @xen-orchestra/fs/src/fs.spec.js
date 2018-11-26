/* eslint-env jest */

import { getHandler } from '.'
import fs from 'fs-extra'

const handlerList = [
  { url: 'file://' + process.cwd() },
  // {
  //   url: 'smb://login:pass@WORKGROUP\\\\ip\\smb\u0000',
  //   id: '12345',
  // },
  // {
  //   url: 'nfs://ip:/tmp/test',
  //   id: '12345',
  // },
]

const pathFile = `${__dirname}/tests/file`
const pathFolder = `${__dirname}/tests/`

handlerList.forEach(element => {
  let handler

  beforeEach(async () => {
    handler = getHandler(element)
  })

  describe('test()', () => {
    it(`handler doesn't crash`, async () => {
      const result = await handler.test()

      expect(result.success).toBeTruthy()
    })
  })

  describe('outputFile()', () => {
    it(`should put the correct content in file`, async () => {
      const content = 'unit test'
      await handler.outputFile(pathFile, content)
      const contentFile = fs.readFileSync(pathFile, 'utf8')

      await expect(contentFile).toEqual(content)
    })
  })

  describe('readFile()', () => {
    it(`should read the correct content in file`, async () => {
      const content = await handler.readFile(pathFile, 'utf8')
      const contentFile = fs.readFileSync(pathFile, 'utf8')

      await expect(content).toEqual(contentFile)
    })
  })

  describe('list()', () => {
    it(`should list the content of folder`, async () => {
      const content = await handler.list(pathFolder)
      const contentFolder = fs.readdirSync(pathFolder)

      await expect(content).toEqual(contentFolder)
    })
  })

  describe('getSize()', () => {
    it(`should return the correct size`, async () => {
      const fileSize = await handler.getSize(pathFile)
      const stats = await fs.statSync(pathFile)

      expect(fileSize).toEqual(stats.size)
    })
  })

  // describe('createReadStream()', () => {
  //   it(`should return correct stream`, async () => {
  //     const stream = await handler.createReadStream(pathFile)
  //     const readStream = fs.createReadStream(pathFile)
  //     await expect(stream).toEqual(readStream)
  //   })
  // })
  // describe('openFile()', () => {
  //   it(`should return the correct file descriptor`, async () => {
  //     const content = await handler.openFile(pathFile, 'r')
  //     const fd = fs.openSync(pathFile, 'r')
  //     await expect(content.fd).toEqual(fd)
  //   })
  // })
})
