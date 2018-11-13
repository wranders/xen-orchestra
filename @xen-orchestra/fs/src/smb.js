import execa from 'execa'
import fs from 'fs-extra'
import { join } from 'path'
import { tmpdir } from 'os'

import RemoteHandlerAbstract from './abstract'

const noop = () => {}

export default class SmbHandler extends RemoteHandlerAbstract {
  constructor (
    remote,
    { mountsDir = join(tmpdir(), 'xo-fs-mounts'), ...opts } = {}
  ) {
    super(remote, opts)

    this._realPath = join(mountsDir, remote.id)
    this._forget = noop
  }

  get type () {
    return 'smb'
  }

  _getRealPath () {
    return this._realPath
  }

  async _mount () {
    const { host, path, username, password, domain } = this._remote
    await fs.ensureDir(path || this._getRealPath())
    console.log('smb', '33', this._remote)
    return execa(
      'mount',
      [
        '-t',
        'cifs',
        `\\\\${host}`,
        path || this._getRealPath(),
        '-o',
        `user=${username},password=${password},domain=${domain}`,
      ],
      {
        env: {
          LANG: 'C',
        },
      }
    ).catch(error => {
      if (
        error == null ||
        typeof error.stderr !== 'string' ||
        !error.stderr.includes('already mounted')
      ) {
        throw error
      }
    })
  }

  async _sync () {
    // Check access (smb2 does not expose connect in public so far...)
    await this.list()

    return this._remote
  }

  async _forget () {
    try {
      await this._umount(this._remote)
    } catch (_) {
      // We have to go on...
    }
  }

  async _umount () {
    await execa('umount', ['--force', this._getRealPath()], {
      env: {
        LANG: 'C',
      },
    }).catch(error => {
      if (
        error == null ||
        typeof error.stderr !== 'string' ||
        !error.stderr.includes('not mounted')
      ) {
        throw error
      }
    })
  }

  // _getClient () {
  //   const remote = this._remote

  //   return new Smb2({
  //     share: `\\\\${remote.host}`,
  //     domain: remote.domain,
  //     username: remote.username,
  //     password: remote.password,
  //     autoCloseTimeout: 0,
  //   })
  // }

  // _getFilePath (file) {
  //   if (file === '.') {
  //     file = undefined
  //   }

  //   let path = this._remote.path !== '' ? this._remote.path : ''

  //   // Ensure remote path is a directory.
  //   if (path !== '' && path[path.length - 1] !== '\\') {
  //     path += '\\'
  //   }

  //   if (file) {
  //     path += file.replace(/\//g, '\\')
  //   }

  //   return path
  // }

  // _dirname (file) {
  //   const parts = file.split('\\')
  //   parts.pop()
  //   return parts.join('\\')
  // }

  // // async _sync () {
  // //   if (this._remote.enabled) {
  // //     // Check access (smb2 does not expose connect in public so far...)
  // //     await this.list()
  // //   }
  // //   return this._remote
  // // }

  // async _outputFile (file, data, options = {}) {
  //   const client = this._getClient()
  //   const path = this._getFilePath(file)
  //   const dir = this._dirname(path)

  //   if (dir) {
  //     await client.ensureDir(dir)
  //   }

  //   return client.writeFile(path, data, options)::pFinally(() => {
  //     client.disconnect()
  //   })
  // }

  // async _read (file, buffer, position) {
  //   const needsClose = typeof file === 'string'

  //   let client
  //   if (needsClose) {
  //     client = this._getClient()
  //     file = await client.open(this._getFilePath(file))
  //   } else {
  //     ;({ client, file } = file.fd)
  //   }

  //   try {
  //     return await client.read(file, buffer, 0, buffer.length, position)
  //   } finally {
  //     if (needsClose) {
  //       await client.close(file)
  //       client.disconnect()
  //     }
  //   }
  // }

  // async _readFile (file, options = {}) {
  //   const client = this._getClient()
  //   let content

  //   try {
  //     content = await client
  //       .readFile(this._getFilePath(file), options)
  //       ::pFinally(() => {
  //         client.disconnect()
  //       })
  //   } catch (error) {
  //     throw normalizeError(error)
  //   }

  //   return content
  // }

  // async _rename (oldPath, newPath) {
  //   const client = this._getClient()

  //   try {
  //     await client
  //       .rename(this._getFilePath(oldPath), this._getFilePath(newPath), {
  //         replace: true,
  //       })
  //       ::pFinally(() => {
  //         client.disconnect()
  //       })
  //   } catch (error) {
  //     throw normalizeError(error)
  //   }
  // }

  // async _list (dir = '.') {
  //   const client = this._getClient()
  //   let list

  //   try {
  //     list = await client.readdir(this._getFilePath(dir))::pFinally(() => {
  //       client.disconnect()
  //     })
  //   } catch (error) {
  //     throw normalizeError(error)
  //   }

  //   return list
  // }

  // async _createReadStream (file, options = {}) {
  //   if (typeof file !== 'string') {
  //     file = file.path
  //   }
  //   const client = this._getClient()
  //   let stream

  //   try {
  //     // FIXME ensure that options are properly handled by @marsaud/smb2
  //     stream = await client.createReadStream(this._getFilePath(file), options)
  //     stream.on('end', () => client.disconnect())
  //   } catch (error) {
  //     throw normalizeError(error)
  //   }

  //   return stream
  // }

  // async _createOutputStream (file, options = {}) {
  //   if (typeof file !== 'string') {
  //     file = file.path
  //   }
  //   const client = this._getClient()
  //   const path = this._getFilePath(file)
  //   const dir = this._dirname(path)
  //   let stream
  //   try {
  //     if (dir) {
  //       await client.ensureDir(dir)
  //     }
  //     stream = await client.createWriteStream(path, options) // FIXME ensure that options are properly handled by @marsaud/smb2
  //   } catch (err) {
  //     client.disconnect()
  //     throw err
  //   }
  //   stream.on('finish', () => client.disconnect())
  //   return stream
  // }

  // async _unlink (file) {
  //   const client = this._getClient()

  //   try {
  //     await client.unlink(this._getFilePath(file))::pFinally(() => {
  //       client.disconnect()
  //     })
  //   } catch (error) {
  //     throw normalizeError(error)
  //   }
  // }

  // async _getSize (file) {
  //   const client = await this._getClient()
  //   let size

  //   try {
  //     size = await client
  //       .getSize(this._getFilePath(typeof file === 'string' ? file : file.path))
  //       ::pFinally(() => {
  //         client.disconnect()
  //       })
  //   } catch (error) {
  //     throw normalizeError(error)
  //   }

  //   return size
  // }

  // // TODO: add flags
  // async _openFile (path) {
  //   const client = this._getClient()
  //   return {
  //     client,
  //     file: await client.open(this._getFilePath(path)),
  //   }
  // }

  // async _closeFile ({ client, file }) {
  //   await client.close(file)
  //   client.disconnect()
  // }
}
