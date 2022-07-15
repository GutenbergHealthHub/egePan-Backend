/*
 * Copyright (c) 2021, IBM Deutschland GmbH
 */

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Request, Response } from 'express';

import { Controller, Get, Middleware } from '@overnightjs/core';
import { expressjwt as jwt } from 'express-jwt';

import { QuestionnaireModel } from '../models/QuestionnaireModel';
import { AuthorizationController } from './AuthorizationController';
import { AuthConfig } from '../config/AuthConfig';

/**
 * Endpoint class for all questionnaire related restful methods.
 *
 * @export
 * @class QuestionnaireController
 */
@Controller('questionnaire')
export class QuestionnaireController {
    private questionnaireModel: QuestionnaireModel = new QuestionnaireModel();

    /**
     * Provide the questionnaire data for the requested questionnaire ID.
     *
     * @param {Request} req
     * @param {Response} res
     * @memberof QuestionnaireController
     */
    @Get(':questionnaireId')
    @Middleware([AuthorizationController.checkStudyParticipantLogin])
    public async getQuestionnaire(req: Request, res: Response) {
        const bearerHeader = req.headers.authorization;
        const subjectID: string = bearerHeader
            ? bearerHeader.split(' ')[1]
            : req.params && req.params.subjectID
            ? req.params.subjectID
            : undefined;

        const questionnaireId = req.params.questionnaireId;

        this.questionnaireModel.getQuestionnaire(subjectID, questionnaireId).then(
            (resp) => res.status(200).json(resp),
            (err) => {
                if (err.response) {
                    res.status(err.response.status).end();
                } else {
                    res.status(500).end();
                }
            }
        );
    }

    /**
     * Update a questionnaire.
     *
     * @param {Request} req
     * @param {Response} res
     * @memberof QuestionnaireController
     */
    @Get('')
    @Middleware(
        jwt({
            secret: AuthConfig.jwtSecret,
            algorithms: ['HS256'],
            requestProperty: 'payload',
            isRevoked: AuthorizationController.checkApiUserLogin
        })
    )
    public async getQuestionnaireByUrlAndVersion(req: Request, res: Response) {
        let url: string, version: string;
        try {
            url = req.query.url.toString();
            version = req.query.version.toString();
        } catch (err) {
            res.status(400).json({
                errorCode: 'InvalidQuery',
                errMessage: `Query failed with error: '${err.message}'.`,
                errorStack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
            });
            return;
        }

        this.questionnaireModel.getQuestionnaireByUrlAndVersion(url, version).then(
            (response) => {
                if (response.length === 0) {
                    res.status(404).json({
                        errorCode: 'QuestionnaireNotFound',
                        errorMessage: 'No questionnaire found that matches the given parameters.'
                    });
                }
                res.status(200).json(response[0]);
            },
            (err) => {
                res.status(500).json({
                    errorCode: 'Internal error',
                    errorMessage: 'Query failed.',
                    errorStack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
                });
            }
        );
    }
}
