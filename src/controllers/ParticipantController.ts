import { Post } from '@overnightjs/core';
/*
 * Copyright (c) 2021, IBM Deutschland GmbH
 */

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Response } from 'express';

import { Controller, Get, Middleware } from '@overnightjs/core';
import { ISecureRequest } from '@overnightjs/jwt';
import { Logger } from '@overnightjs/logger';

import { ParticipantEntry } from '../types/ParticipantEntry';
import { COMPASSConfig } from '../config/COMPASSConfig';
import { ParticipantModel } from '../models/ParticipantModel';
import { AuthorizationController } from './AuthorizationController';

/**
 *  Endpoint class for all participant related restful methods.
 *
 * @export
 * @class ParticipantController
 */
@Controller('participant')
export class ParticipantController {
    private participantModel: ParticipantModel = new ParticipantModel();

    /**
     * Retrieve the current subject data.
     * Is called from the client during first login and also during refresh.
     */
    @Get(':subjectID')
    @Middleware([AuthorizationController.checkStudyParticipantLogin])
    public async getParticipant(req: ISecureRequest, resp: Response) {
        try {
            const participant: ParticipantEntry = await this.participantModel.getAndUpdateParticipantBySubjectID(
                req.params.subjectID
            );
            this.participantModel.updateLastAction(req.params.subjectID);

            const returnObject = {
                current_instance_id: participant.current_instance_id,
                current_questionnaire_id: participant.current_questionnaire_id,
                due_date: participant.due_date,
                start_date: participant.start_date,
                subjectId: participant.subject_id,
                firstTime:
                    participant.current_questionnaire_id ===
                    COMPASSConfig.getInitialQuestionnaireId(),
                additional_iterations_left: participant.additional_iterations_left,
                current_interval: participant.current_interval,
                recipient_certificate_pem_string: COMPASSConfig.getRecipientCertificate()
            };
            return resp.status(200).json(returnObject);
        } catch (err) {
            Logger.Err(err, true);
            return resp.sendStatus(500);
        }
    }

    /**
     * Updates the device registration token that is used for the Firebase cloud messaging service.
     * Is called from the client, when the token is changed on the device.
     */
    @Post('update-device-token/:subjectID')
    @Middleware([AuthorizationController.checkStudyParticipantLogin])
    public async updateDeviceTokenForParticipant(req: ISecureRequest, resp: Response) {
        try {
            // validate parameter
            if (!req.params.subjectID || !req.body.token) {
                return resp.status(400).send({ error: 'missing_data' });
            }
            await this.participantModel.updateDeviceToken(
                req.params.subjectID,
                req.body.token.toString()
            );
            return resp.sendStatus(204);
        } catch (err) {
            Logger.Err(err, true);
            return resp.sendStatus(500);
        }
    }
    /**
     *
     * Create a new user and return the user object
     *
     * @param {ISecureRequest} req
     * @param {Response} resp
     * @returns
     */
    @Get('')
    public async createUser(req: ISecureRequest, resp: Response) {
        try {
            const user = await this.participantModel.createNewUser();
            return resp.status(200).json(user);
        } catch (err) {
            Logger.Err(err, true);
            return resp.sendStatus(500);
        }
    }
}
