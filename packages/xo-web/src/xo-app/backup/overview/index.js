import _ from 'intl'
import ActionButton from 'action-button'
import addSubscriptions from 'add-subscriptions'
import Button from 'button'
import constructQueryString from 'construct-query-string'
import Copiable from 'copiable'
import CopyToClipboard from 'react-copy-to-clipboard'
import decorate from 'apply-decorators'
import Icon from 'icon'
import PropTypes from 'prop-types'
import React from 'react'
import SortedTable from 'sorted-table'
import StateButton from 'state-button'
import Tooltip from 'tooltip'
import { Card, CardHeader, CardBlock } from 'card'
import { confirm } from 'modal'
import { createSelector } from 'selectors'
import { get } from '@xen-orchestra/defined'
import { injectState, provideState } from 'reaclette'
import { isEmpty, map, groupBy, some } from 'lodash'
import { Proxy } from 'render-xo-item'
import {
  cancelJob,
  deleteBackupJobs,
  disableSchedule,
  enableSchedule,
  runBackupNgJob,
  runMetadataBackupJob,
  subscribeBackupNgJobs,
  subscribeBackupNgLogs,
  subscribeJobs,
  subscribeMetadataBackupJobs,
  subscribeSchedules,
} from 'xo'

import getSettingsWithNonDefaultValue from '../_getSettingsWithNonDefaultValue'
import { destructPattern } from '../utils'
import LogsTable, { LogStatus } from '../../logs/backup-ng'
import LegacyOverview from '../overview-legacy'

const Ul = props => <ul {...props} style={{ listStyleType: 'none' }} />
const Li = props => (
  <li
    {...props}
    style={{
      whiteSpace: 'nowrap',
    }}
  />
)

const MODES = [
  {
    label: 'rollingSnapshot',
    test: job =>
      some(job.settings, ({ snapshotRetention }) => snapshotRetention > 0),
  },
  {
    label: 'backup',
    test: job =>
      job.mode === 'full' && !isEmpty(get(() => destructPattern(job.remotes))),
  },
  {
    label: 'deltaBackup',
    test: job =>
      job.mode === 'delta' && !isEmpty(get(() => destructPattern(job.remotes))),
  },
  {
    label: 'continuousReplication',
    test: job =>
      job.mode === 'delta' && !isEmpty(get(() => destructPattern(job.srs))),
  },
  {
    label: 'disasterRecovery',
    test: job =>
      job.mode === 'full' && !isEmpty(get(() => destructPattern(job.srs))),
  },
  {
    label: 'poolMetadata',
    test: job => !isEmpty(destructPattern(job.pools)),
  },
  {
    label: 'xoConfig',
    test: job => job.xoMetadata,
  },
]

const _deleteBackupJobs = items => {
  const { backup: backupIds, metadataBackup: metadataBackupIds } = groupBy(
    items,
    'type'
  )
  return deleteBackupJobs({ backupIds, metadataBackupIds })
}

const _runBackupJob = ({ id, name, schedule, type }) =>
  confirm({
    title: _('runJob'),
    body: _('runBackupNgJobConfirm', {
      id: id.slice(0, 5),
      name: <strong>{name}</strong>,
    }),
  }).then(() =>
    type === 'backup'
      ? runBackupNgJob({ id, schedule })
      : runMetadataBackupJob({ id, schedule })
  )

const SchedulePreviewBody = decorate([
  addSubscriptions(({ schedule }) => ({
    lastRunLog: cb =>
      subscribeBackupNgLogs(logs => {
        let lastRunLog
        for (const runId in logs) {
          const log = logs[runId]
          if (
            log.scheduleId === schedule.id &&
            (lastRunLog === undefined || lastRunLog.start < log.start)
          ) {
            lastRunLog = log
          }
        }
        cb(lastRunLog)
      }),
  })),
  ({ job, schedule, lastRunLog }) => (
    <Ul>
      <Li>
        {schedule.name
          ? _.keyValue(_('scheduleName'), schedule.name)
          : _.keyValue(_('scheduleCron'), schedule.cron)}{' '}
        <Tooltip content={_('scheduleCopyId', { id: schedule.id.slice(4, 8) })}>
          <CopyToClipboard text={schedule.id}>
            <Button size='small'>
              <Icon icon='clipboard' />
            </Button>
          </CopyToClipboard>
        </Tooltip>
      </Li>
      <Li>
        <StateButton
          disabledLabel={_('stateDisabled')}
          disabledHandler={enableSchedule}
          disabledTooltip={_('logIndicationToEnable')}
          enabledLabel={_('stateEnabled')}
          enabledHandler={disableSchedule}
          enabledTooltip={_('logIndicationToDisable')}
          handlerParam={schedule.id}
          state={schedule.enabled}
          style={{ marginRight: '0.5em' }}
        />
        {job.runId !== undefined ? (
          <Tooltip content={_('temporarilyDisabled')}>
            <span>
              <ActionButton
                btnStyle='danger'
                // 2020-01-29 Job cancellation will be disabled until we find a way to make it work.
                // See https://github.com/vatesfr/xen-orchestra/issues/4657
                disabled
                handler={cancelJob}
                handlerParam={job}
                icon='cancel'
                key='cancel'
                size='small'
                tooltip={_('formCancel')}
              />
            </span>
          </Tooltip>
        ) : (
          <ActionButton
            btnStyle='primary'
            data-id={job.id}
            data-name={job.name}
            data-schedule={schedule.id}
            data-type={job.type}
            handler={_runBackupJob}
            icon='run-schedule'
            key='run'
            size='small'
          />
        )}{' '}
        {lastRunLog !== undefined && (
          <LogStatus log={lastRunLog} tooltip={_('scheduleLastRun')} />
        )}
      </Li>
    </Ul>
  ),
])

@addSubscriptions({
  jobs: subscribeBackupNgJobs,
  metadataJobs: subscribeMetadataBackupJobs,
  schedulesByJob: cb =>
    subscribeSchedules(schedules => {
      cb(groupBy(schedules, 'jobId'))
    }),
})
class JobsTable extends React.Component {
  static contextTypes = {
    router: PropTypes.object,
  }

  static tableProps = {
    actions: [
      {
        handler: _deleteBackupJobs,
        label: _('deleteBackupSchedule'),
        icon: 'delete',
        level: 'danger',
      },
    ],
    columns: [
      {
        itemRenderer: ({ id }) => (
          <Copiable data={id} tagName='p'>
            {id.slice(4, 8)}
          </Copiable>
        ),
        name: _('jobId'),
      },
      {
        valuePath: 'name',
        name: _('jobName'),
        default: true,
      },
      {
        itemRenderer: job => (
          <Ul>
            {MODES.filter(({ test }) => test(job)).map(({ label }) => (
              <Li key={label}>{_(label)}</Li>
            ))}
          </Ul>
        ),
        sortCriteria: 'mode',
        name: _('jobModes'),
      },
      {
        itemRenderer: (job, { schedulesByJob }) =>
          map(
            get(() => schedulesByJob[job.id]),
            schedule => (
              <SchedulePreviewBody
                job={job}
                key={schedule.id}
                schedule={schedule}
              />
            )
          ),
        name: _('jobSchedules'),
      },
      {
        itemRenderer: job => {
          const {
            compression,
            concurrency,
            fullInterval,
            offlineBackup,
            offlineSnapshot,
            proxyId,
            reportWhen,
            timeout,
          } = getSettingsWithNonDefaultValue(job.mode, {
            compression: job.compression,
            proxyId: job.proxy,
            ...job.settings[''],
          })

          return (
            <Ul>
              {proxyId !== undefined && (
                <Li>{_.keyValue(_('proxy'), <Proxy id={proxyId} />)}</Li>
              )}
              {reportWhen !== undefined && (
                <Li>{_.keyValue(_('reportWhen'), reportWhen)}</Li>
              )}
              {concurrency !== undefined && (
                <Li>{_.keyValue(_('concurrency'), concurrency)}</Li>
              )}
              {timeout !== undefined && (
                <Li>{_.keyValue(_('timeout'), timeout / 3600e3)} hours</Li>
              )}
              {fullInterval !== undefined && (
                <Li>{_.keyValue(_('fullBackupInterval'), fullInterval)}</Li>
              )}
              {offlineBackup !== undefined && (
                <Li>
                  {_.keyValue(
                    _('offlineBackup'),
                    _(offlineBackup ? 'stateEnabled' : 'stateDisabled')
                  )}
                </Li>
              )}
              {offlineSnapshot !== undefined && (
                <Li>
                  {_.keyValue(
                    _('offlineSnapshot'),
                    _(offlineSnapshot ? 'stateEnabled' : 'stateDisabled')
                  )}
                </Li>
              )}
              {compression !== undefined && (
                <Li>
                  {_.keyValue(
                    _('compression'),
                    compression === 'native' ? 'GZIP' : compression
                  )}
                </Li>
              )}
            </Ul>
          )
        },
        name: _('formNotes'),
      },
    ],
    individualActions: [
      {
        handler: (job, { goTo }) =>
          goTo({
            pathname: '/home',
            query: { t: 'VM', s: constructQueryString(job.vms) },
          }),
        disabled: job => job.type !== 'backup',
        label: _('redirectToMatchingVms'),
        icon: 'preview',
      },
      {
        handler: (job, { goTo }) => goTo(`/backup/${job.id}/edit`),
        label: _('formEdit'),
        icon: 'edit',
        level: 'primary',
      },
    ],
  }

  _goTo = path => {
    this.context.router.push(path)
  }

  _getCollection = createSelector(
    () => this.props.jobs,
    () => this.props.metadataJobs,
    (jobs = [], metadataJobs = []) => [...jobs, ...metadataJobs]
  )

  render() {
    return (
      <SortedTable
        {...JobsTable.tableProps}
        collection={this._getCollection()}
        data-goTo={this._goTo}
        data-schedulesByJob={this.props.schedulesByJob}
        stateUrlParam='s'
      />
    )
  }
}

const legacyJobKey = [
  'continuousReplication',
  'deltaBackup',
  'disasterRecovery',
  'backup',
  'rollingSnapshot',
]

const Overview = decorate([
  addSubscriptions({
    legacyJobs: subscribeJobs,
  }),
  provideState({
    computed: {
      haveLegacyBackups: (_, { legacyJobs }) =>
        some(legacyJobs, job => legacyJobKey.includes(job.key)),
    },
  }),
  injectState,
  ({ state: { haveLegacyBackups } }) => (
    <div>
      {haveLegacyBackups && <LegacyOverview />}
      <div className='mt-2 mb-1'>
        {haveLegacyBackups && <h3>{_('backup')}</h3>}
        <Card>
          <CardHeader>
            <Icon icon='backup' /> {_('backupJobs')}
          </CardHeader>
          <CardBlock>
            <JobsTable />
          </CardBlock>
        </Card>
        <LogsTable />
      </div>
    </div>
  ),
])

export default Overview
