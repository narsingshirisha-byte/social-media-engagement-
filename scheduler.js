const db = require('./database');
const collector = require('./dataCollector');
const hindsight = require('./hindsightMemory');
const { generateStrategicReport } = require('./aiEngine');

class AgentScheduler {
  constructor() {
    this.timer = null;
    this.intervalMs = 60000 * 5; // Check every 5 mins for due jobs
    this.schedules = {
      metricSyncHours: 6,
      commentSyncHours: 12,
      audienceUpdateDays: 1,
      weeklyReportDays: 7
    };
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    console.log("⏰ Production Agent Scheduler started.");
    
    // Initial execution check
    this.runDueJobs();

    this.timer = setInterval(() => {
      this.runDueJobs();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runDueJobs(appMode = 'DEMO') {
    const now = new Date();
    const lastRun = db.findOne('agent_runs', r => r.id === 'latest_run') || { timestamp: 0 };
    const elapsedMinutes = (now.getTime() - new Date(lastRun.timestamp || 0).getTime()) / (1000 * 60);

    // Sync metrics every 6 hours (or on first start / trigger)
    if (elapsedMinutes >= this.schedules.metricSyncHours * 60 || !lastRun.timestamp) {
      console.log("🔄 Scheduler running metric & comment collection job...");
      await collector.syncAllAccounts(appMode);

      // Record run
      db.update('agent_runs', r => r.id === 'latest_run', () => ({
        timestamp: now.toISOString(),
        lastJob: 'METRIC_AND_COMMENT_SYNC',
        status: 'SUCCESS'
      })) || db.insert('agent_runs', {
        id: 'latest_run',
        timestamp: now.toISOString(),
        lastJob: 'METRIC_AND_COMMENT_SYNC',
        status: 'SUCCESS'
      });
    }
  }

  getSchedulerConfig() {
    const lastRun = db.findOne('agent_runs', r => r.id === 'latest_run');
    return {
      schedules: this.schedules,
      lastRun: lastRun ? lastRun.timestamp : null,
      status: this.timer ? 'RUNNING' : 'STOPPED'
    };
  }

  updateConfig(newSchedules) {
    this.schedules = { ...this.schedules, ...newSchedules };
    return this.getSchedulerConfig();
  }
}

const schedulerInstance = new AgentScheduler();
module.exports = schedulerInstance;
