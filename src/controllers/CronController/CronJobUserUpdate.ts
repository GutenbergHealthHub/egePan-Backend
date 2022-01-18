import Logger from 'jet-logger';

import { PerformanceLogger } from '../../services/PerformanceLogger';
import { AbstractCronJob } from './AbstractCronJob';
import { ParticipantModel } from '../../models/ParticipantModel';

/**
 * A cron job that triggers user updates.
 *
 * @export
 * @class CronJobNotification
 * @extends {AbstractCronJob}
 */
export class CronJobUserUpdate extends AbstractCronJob {
    private participantModel: ParticipantModel = new ParticipantModel();
    constructor() {
        super('* 5 * * *'); // at 5:00 Local Time (GMT+02:00)
    }

    /**
     * Execute the job.
     *
     * @memberof CronJobNotification
     */
    public async executeJob(): Promise<void> {
        Logger.Info('Cronjob CronJobNotification fired at [' + new Date() + ']');
        const perfLog = PerformanceLogger.startMeasurement('CronJobNotification', 'executeJob');
        const now = new Date();
        now.setUTCHours(5, 0, 0, 0);
        await this.participantModel.updateOutdatedParticipants(now);
        PerformanceLogger.endMeasurement(perfLog);
    }
}
