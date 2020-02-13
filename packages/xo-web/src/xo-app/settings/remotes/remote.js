import _, { messages } from 'intl'
import ActionButton from 'action-button'
import decorate from 'apply-decorators'
import Icon from 'icon'
import React from 'react'
import { addSubscriptions, resolveId } from 'utils'
import { alert, confirm } from 'modal'
import { createRemote, editRemote, subscribeRemotes } from 'xo'
import { error } from 'notification'
import { format } from 'xo-remote-parser'
import { generateId, linkState } from 'reaclette-utils'
import { injectState, provideState } from 'reaclette'
import { map, some, trimStart } from 'lodash'
import { Password, Number } from 'form'
import { SelectProxy } from 'select-objects'

const remoteTypes = {
  file: 'remoteTypeLocal',
  nfs: 'remoteTypeNfs',
  smb: 'remoteTypeSmb',
}

export default decorate([
  addSubscriptions({
    remotes: subscribeRemotes,
  }),
  provideState({
    initialState: () => ({
      domain: undefined,
      host: undefined,
      name: undefined,
      options: undefined,
      password: undefined,
      path: undefined,
      port: undefined,
      proxyId: undefined,
      type: undefined,
      username: undefined,
    }),
    effects: {
      linkState,
      setPort: (_, port) => state => ({
        port: port === undefined && state.remote !== undefined ? '' : port,
      }),
      setProxy(_, proxy) {
        this.state.proxyId = resolveId(proxy)
      },
      editRemote: ({ reset }) => state => {
        const {
          remote,
          domain = remote.domain || '',
          host = remote.host,
          name,
          options = remote.options || '',
          password = remote.password,
          path = remote.path,
          port = remote.port,
          proxyId = remote.proxy,
          type = remote.type,
          username = remote.username,
        } = state
        return editRemote(remote, {
          name,
          url: format({
            domain,
            host,
            password,
            path,
            port: port || undefined,
            type,
            username,
          }),
          options: options !== '' ? options : null,
          proxy: proxyId,
        }).then(reset)
      },
      createRemote: ({ reset }) => async (state, { remotes }) => {
        if (some(remotes, { name: state.name })) {
          return alert(
            <span>
              <Icon icon='error' /> {_('remoteTestName')}
            </span>,
            <p>{_('remoteTestNameFailure')}</p>
          )
        }

        const {
          domain = 'WORKGROUP',
          host,
          name,
          options,
          password,
          path,
          port,
          proxyId,
          type = 'nfs',
          username,
        } = state

        const urlParams = {
          host,
          path,
          port,
          type,
        }
        username && (urlParams.username = username)
        password && (urlParams.password = password)
        domain && (urlParams.domain = domain)

        if (type === 'file') {
          await confirm({
            title: _('localRemoteWarningTitle'),
            body: _('localRemoteWarningMessage'),
          })
        }

        const url = format(urlParams)
        return createRemote(
          name,
          url,
          options !== '' ? options : undefined,
          proxyId === null ? undefined : proxyId
        )
          .then(reset)
          .catch(err => error('Create Remote', err.message || String(err)))
      },
    },
    computed: {
      formId: generateId,
      inputTypeId: generateId,
      parsedPath: ({ remote }) => remote && trimStart(remote.path, '/'),
    },
  }),
  injectState,
  ({ state, effects, formatMessage }) => {
    const {
      remote = {},
      domain = remote.domain || 'WORKGROUP',
      host = remote.host || '',
      name = remote.name || '',
      options = remote.options || '',
      password = remote.password || '',
      parsedPath,
      path = parsedPath || '',
      port = remote.port,
      proxyId = remote.proxy,
      type = remote.type || 'nfs',
      username = remote.username || '',
    } = state
    return (
      <div>
        <h2>{_('newRemote')}</h2>
        <form id={state.formId}>
          <div className='form-group'>
            <label htmlFor={state.inputTypeId}>{_('remoteType')}</label>
            <select
              className='form-control'
              id={state.inputTypeId}
              name='type'
              onChange={effects.linkState}
              required
              value={type}
            >
              {map(remoteTypes, (label, key) =>
                _({ key }, label, message => (
                  <option value={key}>{message}</option>
                ))
              )}
            </select>
            {type === 'smb' && (
              <em className='text-warning'>{_('remoteSmbWarningMessage')}</em>
            )}
          </div>
          <div className='form-group'>
            <input
              className='form-control'
              name='name'
              onChange={effects.linkState}
              placeholder={formatMessage(messages.remoteMyNamePlaceHolder)}
              required
              type='text'
              value={name}
            />
          </div>
          <div className='form-group'>
            <SelectProxy onChange={effects.setProxy} value={proxyId} />
          </div>
          {type === 'file' && (
            <fieldset className='form-group'>
              <div className='input-group'>
                <span className='input-group-addon'>/</span>
                <input
                  className='form-control'
                  name='path'
                  onChange={effects.linkState}
                  pattern='^(([^/]+)+(/[^/]+)*)?$'
                  placeholder={formatMessage(
                    messages.remoteLocalPlaceHolderPath
                  )}
                  required
                  type='text'
                  value={path}
                />
              </div>
            </fieldset>
          )}
          {type === 'nfs' && (
            <fieldset>
              <div className='form-group'>
                <input
                  className='form-control'
                  name='host'
                  onChange={effects.linkState}
                  placeholder={formatMessage(messages.remoteNfsPlaceHolderHost)}
                  required
                  type='text'
                  value={host}
                />
                <br />
                <Number
                  onChange={effects.setPort}
                  placeholder={formatMessage(messages.remoteNfsPlaceHolderPort)}
                  value={port}
                />
              </div>
              <div className='input-group form-group'>
                <span className='input-group-addon'>/</span>
                <input
                  className='form-control'
                  name='path'
                  onChange={effects.linkState}
                  pattern='^(([^/]+)+(/[^/]+)*)?$'
                  placeholder={formatMessage(messages.remoteNfsPlaceHolderPath)}
                  required
                  type='text'
                  value={path}
                />
              </div>
              <div className='input-group form-group'>
                <span className='input-group-addon'>-o</span>
                <input
                  className='form-control'
                  name='options'
                  onChange={effects.linkState}
                  placeholder={formatMessage(
                    messages.remoteNfsPlaceHolderOptions
                  )}
                  type='text'
                  value={options}
                />
              </div>
            </fieldset>
          )}
          {type === 'smb' && (
            <fieldset>
              <div className='input-group form-group'>
                <span className='input-group-addon'>\\</span>
                <input
                  className='form-control'
                  name='host'
                  onChange={effects.linkState}
                  pattern='^[^\\/]+\\[^\\/]+$'
                  placeholder={formatMessage(
                    messages.remoteSmbPlaceHolderAddressShare
                  )}
                  required
                  type='text'
                  value={host}
                />
                <span className='input-group-addon'>\</span>
                <input
                  className='form-control'
                  name='path'
                  onChange={effects.linkState}
                  pattern='^([^\\/]+(\\[^\\/]+)*)?$'
                  placeholder={formatMessage(
                    messages.remoteSmbPlaceHolderRemotePath
                  )}
                  type='text'
                  value={path}
                />
              </div>
              <div className='form-group'>
                <input
                  className='form-control'
                  name='username'
                  onChange={effects.linkState}
                  placeholder={formatMessage(
                    messages.remoteSmbPlaceHolderUsername
                  )}
                  required
                  type='text'
                  value={username}
                />
              </div>
              <div className='form-group'>
                <Password
                  name='password'
                  onChange={effects.linkState}
                  placeholder={formatMessage(
                    messages.remoteSmbPlaceHolderPassword
                  )}
                  required
                  value={password}
                />
              </div>
              <div className='form-group'>
                <input
                  className='form-control'
                  onChange={effects.linkState}
                  name='domain'
                  placeholder={formatMessage(
                    messages.remoteSmbPlaceHolderDomain
                  )}
                  required
                  type='text'
                  value={domain}
                />
              </div>
              <div className='input-group form-group'>
                <span className='input-group-addon'>-o</span>
                <input
                  className='form-control'
                  name='options'
                  onChange={effects.linkState}
                  placeholder={formatMessage(
                    messages.remoteSmbPlaceHolderOptions
                  )}
                  type='text'
                  value={options}
                />
              </div>
            </fieldset>
          )}
          <div className='form-group'>
            <ActionButton
              btnStyle='primary'
              form={state.formId}
              handler={
                state.remote === undefined
                  ? effects.createRemote
                  : effects.editRemote
              }
              icon='save'
              type='submit'
            >
              {_('savePluginConfiguration')}
            </ActionButton>
            <ActionButton
              className='pull-right'
              handler={effects.reset}
              icon='reset'
              type='reset'
            >
              {_('formReset')}
            </ActionButton>
          </div>
        </form>
      </div>
    )
  },
])
