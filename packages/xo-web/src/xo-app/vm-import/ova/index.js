import fromEvent from 'promise-toolbox/fromEvent'
import { parseOVAFile } from 'xo-ova'

// ===================================================================

/* global FileReader */

class BrowserParsableFile {
  constructor (file) {
    console.log('constructor')
    this._file = file
  }

  slice (start, end) {
    console.log('slice', start, end)
    return new BrowserParsableFile(this._file.slice(start, end))
  }

  async read () {
    console.log('read')
    const reader = new FileReader()
    reader.readAsArrayBuffer(this._file)
    return (await fromEvent(reader, 'loadend')).target.result
  }
}

export default async function parse (file) {
  try {
    const browserParsableFile = new BrowserParsableFile(file)
    const result = await parseOVAFile(browserParsableFile)
    console.log('result', result)
    return result
  } catch (e) {
    console.log(e)
    throw e
  }
}
