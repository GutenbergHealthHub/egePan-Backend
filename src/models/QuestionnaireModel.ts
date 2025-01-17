/*
 * Copyright (c) 2021, IBM Deutschland GmbH
 */

import Logger from 'jet-logger';

import { COMPASSConfig } from '../config/COMPASSConfig';
import { ParticipantModel } from '../models/ParticipantModel';
import DB from '../server/DB';

/**
 * Model class that bundles the logic for access to the questionnaire related tables.
 *
 * @export
 * @class QuestionnaireModel
 */
export class QuestionnaireModel {
    private participantModel: ParticipantModel = new ParticipantModel();

    /**
     * Retrieve the questionnaire with the requested ID and create a log entry in the questionnairehistory table.
     *
     * @param {string} subjectID
     * @param {string} questionnaireId
     * @return {*}  {Promise<string>}
     * @memberof QuestionnaireModel
     */
    public async getQuestionnaire(subjectID: string, questionnaireId: string): Promise<string> {
        // note: we don't try/catch this because if connecting throws an exception
        // we don't need to dispose the client (it will be undefined)
        const dbClient = await DB.getPool().connect();

        try {
            const participant = await this.participantModel.getAndUpdateParticipantBySubjectID(
                subjectID
            );
            const res = await dbClient.query('SELECT body FROM questionnaires WHERE id = $1', [
                questionnaireId
            ]);

            const dbId =
                questionnaireId +
                '-' +
                subjectID +
                '-' +
                (participant.current_instance_id || COMPASSConfig.getInitialQuestionnaireId());
            await dbClient.query(
                'INSERT INTO questionnairehistory(id, subject_id, questionnaire_id, date_received, date_sent, instance_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;',
                [
                    dbId,
                    subjectID,
                    questionnaireId,
                    new Date(),
                    null,
                    participant.current_instance_id || COMPASSConfig.getInitialQuestionnaireId()
                ]
            );

            if (res.rows.length !== 1) {
                throw new Error('questionnaire_not_found');
            } else {
                return res.rows[0].body;
            }
        } catch (e) {
            Logger.err('!!! DB might be inconsistent. Check DB !!!');
            Logger.err(e);
            throw e;
        } finally {
            dbClient.release();
        }
    }

    /**
     * Get a questionnaire identified by url and version
     *
     * @param {string} url
     * @param {string} version
     * @returns{object} the questionnaire object
     */
    public async getQuestionnaireByUrlAndVersion(url: string, version: string): Promise<string[]> {
        const dbClient = await DB.getPool().connect();
        try {
            const res = await dbClient.query(
                'SELECT * FROM questionnaire_version_history WHERE url = $1 AND version = $2',
                [url, version]
            );
            return res.rows;
        } catch (error) {
            Logger.err(error);
            throw error;
        } finally {
            dbClient.release();
        }
    }
}
