/*
 * Copyright (c) 2021, IBM Deutschland GmbH
 */
import { COMPASSConfig } from '../config/COMPASSConfig';
import { IdHelper } from '../services/IdHelper';
import { StateChangeTrigger, ParticipantEntry } from '../types';
import { StateModel } from './StateModel';

/**
 * Example model based on the GCS state chart.
 * It uses four different questionnaires that are send to the participant depending on some conditions.
 *
 * @export
 * @class ExampleStateModel
 * @implements {StateModel}
 */
export class EgePanStateModel implements StateModel {
    /**
     * Determine new state relevant data for the given participant.
     *
     * @param {ParticipantEntry} participant
     * @param {string} parameters A stringified JSON with parameters that trigger state changes.
     * @return {*}  {ParticipantEntry}
     * @memberof ExampleStateModel
     */
    public calculateUpdatedData(
        participant: ParticipantEntry,
        parameters: StateChangeTrigger
    ): ParticipantEntry {
        const distValues = this.calculateStateValues(participant, parameters);
        const datesAndIterations = this.calculateDates(
            participant,
            distValues.nextInterval,
            distValues.nextDuration,
            distValues.nextStartHour,
            distValues.nextDueHour,
            distValues.startImmediately
        );

        // handle iteration counter for questionnaires
        const iterationsLeft = distValues.additionalIterationsLeft
            ? distValues.additionalIterationsLeft - 1
            : 0;

        // clone the object and set updated values
        const updatedParticipant: ParticipantEntry = { ...participant };
        updatedParticipant.current_instance_id = IdHelper.createID();
        updatedParticipant.current_questionnaire_id = distValues.nextQuestionnaireId;
        updatedParticipant.start_date = datesAndIterations.startDate;
        updatedParticipant.due_date = datesAndIterations.dueDate;
        updatedParticipant.current_interval = distValues.nextInterval;
        updatedParticipant.additional_iterations_left = iterationsLeft;
        return updatedParticipant;
    }

    private calculateDates(
        participantData: ParticipantEntry,
        nextInterval: number,
        nextDuration: number,
        nextStartHour: number,
        nextDueHour: number,
        startImmediately: boolean
    ): {
        startDate: Date;
        dueDate: Date;
    } {
        const now = new Date(Date.now());
        const intervalStart = new Date(now);
        intervalStart.setDate(
            intervalStart.getDate() + COMPASSConfig.getDefaultIntervalStartIndex()
        );

        /**
         * TODO
         *
         * @param {Date} startDate
         * @param {boolean} [startImmediately]
         * @return {*}
         */
        const calcTime = (startDate: Date, startImmediately?: boolean) => {
            let newStartDate: Date;
            let newDueDate: Date;

            if (COMPASSConfig.useFakeDateCalculation()) {
                // short circuit for testing
                // start date is set to be in 10 seconds and due date is in 30 minutes
                newStartDate = now;
                newStartDate.setSeconds(newStartDate.getSeconds() + 10);

                newDueDate = new Date(newStartDate);
                newDueDate.setSeconds(newDueDate.getSeconds() + 30 * 60);
            } else {
                newStartDate = new Date(startDate);
                if (participantData.start_date) {
                    if (startImmediately) {
                        newStartDate = new Date(intervalStart);
                    } else {
                        newStartDate.setDate(newStartDate.getDate() + nextInterval);
                    }
                }
                newStartDate.setHours(nextStartHour, 0, 0, 0);

                // Check if the current questionnaire to be completed by the user is the initial one
                // and if all users should start on the same day of week
                if (
                    participantData.current_questionnaire_id ===
                    COMPASSConfig.getInitialQuestionnaireId()
                ) {
                    // get the difference in days of week and increment by 7 (i.e. shift by a week), if closest start day to current day is in the past
                    let interval = 5 - newStartDate.getDay();
                    interval += interval < 0 ? 7 : 0;
                    newStartDate.setDate(newStartDate.getDate() + interval);
                }

                newDueDate = new Date(newStartDate);
                newDueDate.setDate(newDueDate.getDate() + nextDuration);
                newDueDate.setHours(nextDueHour, 0, 0, 0);
            }

            return {
                startDate: newStartDate,
                dueDate: newDueDate
            };
        };

        let dates = calcTime(
            participantData.start_date ? new Date(participantData.start_date) : intervalStart,
            startImmediately
        );

        // loop until the due date is in the future to get valid dates
        while (dates.dueDate < now) {
            dates = calcTime(dates.startDate);
        }
        return dates;
    }

    private calculateStateValues(
        currentParticipant: ParticipantEntry,
        triggerValues: StateChangeTrigger
    ) {
        // get default values

        const regularInterval = COMPASSConfig.getDefaultInterval();
        const regularDuration = COMPASSConfig.getDefaultDuration();
        const regularStartDay = 5; //friday
        const regularStartHour = COMPASSConfig.getDefaultStartHour();
        const regularDueHour = COMPASSConfig.getDefaultDueHour();

        const initialQuestionnaireId = COMPASSConfig.getInitialQuestionnaireId();
        const defaultQuestionnaireId = COMPASSConfig.getDefaultQuestionnaireId();
        const longQuestionnaireId = COMPASSConfig.getDefaultLongQuestionnaireId();
        let nextQuestionnaireId: string;

        let iterationsLeft: number;
        let startImmediately: boolean;
        const iterationCount = COMPASSConfig.getDefaultIterationCount();

        if (!currentParticipant.due_date) {
            nextQuestionnaireId = initialQuestionnaireId;
        } else if (
            currentParticipant.additional_iterations_left % 12 === 4 &&
            currentParticipant.current_questionnaire_id === defaultQuestionnaireId
        ) {
            nextQuestionnaireId = longQuestionnaireId;
            startImmediately = true;
        } else {
            nextQuestionnaireId = defaultQuestionnaireId;
            iterationsLeft =
                currentParticipant.current_questionnaire_id === initialQuestionnaireId
                    ? iterationCount
                    : currentParticipant.additional_iterations_left;
        }

        return {
            nextInterval: regularInterval,
            nextDuration: regularDuration,
            nextQuestionnaireId: nextQuestionnaireId,
            nextStartDay: regularStartDay,
            nextStartHour: regularStartHour,
            nextDueHour: regularDueHour,
            startImmediately: startImmediately ? startImmediately : false,
            additionalIterationsLeft: iterationsLeft
                ? iterationsLeft
                : currentParticipant.additional_iterations_left
        };
    }
}
