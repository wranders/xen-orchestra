import fromEvent from 'promise-toolbox/fromEvent'
import { parseOVAFile } from 'xo-ova'

// ===================================================================

/* global FileReader, TextDecoder */

class BrowserParsableFile {
  constructor (file) {
    this._file = file
  }

  slice (start, end) {
    return new BrowserParsableFile(this._file.slice(start, end))
  }

  async read () {
    const reader = new FileReader()
    reader.readAsArrayBuffer(this._file)
    return (await fromEvent(reader, 'loadend')).target.result
  }
}

export default async function parse (file) {
  try {
    const browserParsableFile = new BrowserParsableFile(file)
    const decoder = (array, encoding) => new TextDecoder(encoding).decode(array)
    return await parseOVAFile(browserParsableFile, decoder)
  } catch (e) {
    console.log(e)
    throw e
  }
}
