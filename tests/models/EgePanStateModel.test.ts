import { COMPASSConfig } from '../../src/config/COMPASSConfig';
import { EgePanStateModel } from '../../src/models/EgePanStateModel';
import { ParticipantEntry, ParticipationStatus } from '../../src/types';

describe('', () => {
    let realDateNow;
    const initialDate = new Date(1572393600000);
    beforeAll(() => {
        realDateNow = Date.now.bind(global.Date);
        global.Date.now = jest.fn(() => 1572393600000); // 2019-10-30T00:00Z0 (GMT)
    });

    afterAll(() => {
        global.Date.now = realDateNow;
    });
    const StateModel = new EgePanStateModel();
    it('new participant should get initial questionnaire', () => {
        const participantEntry: ParticipantEntry = {
            subject_id: 'testId',
            last_action: undefined,
            current_questionnaire_id: null,
            start_date: undefined,
            due_date: undefined,
            current_instance_id: null,
            current_interval: 0,
            additional_iterations_left: null,
            status: ParticipationStatus.OnStudy,
            general_study_end_date: undefined,
            personal_study_end_date: undefined
        };

        const updatedEntry = StateModel.calculateUpdatedData(participantEntry);
        expect(updatedEntry.current_interval).toBe(7);
        expect(updatedEntry.current_questionnaire_id).toBe(
            COMPASSConfig.getInitialQuestionnaireId()
        );

        expect(updatedEntry.start_date.toISOString()).toBe('2019-10-30T05:00:00.000Z');
        expect(updatedEntry.due_date.toISOString()).toBe('2019-11-02T17:00:00.000Z');

        expect(updatedEntry.additional_iterations_left).toBe(0);
    });

    it('participant should receive first instance of the weekly questionnaire immediately after the initial one', () => {
        const participantEntry: ParticipantEntry = {
            subject_id: 'testId',
            last_action: undefined,
            current_questionnaire_id: COMPASSConfig.getInitialQuestionnaireId(),
            start_date: new Date(Date.now()),
            due_date: new Date(Date.now()),
            current_instance_id: null,
            current_interval: 0,
            additional_iterations_left: null,
            status: ParticipationStatus.OnStudy,
            general_study_end_date: undefined,
            personal_study_end_date: undefined
        };

        const updatedEntry = StateModel.calculateUpdatedData(participantEntry);
        expect(updatedEntry.current_interval).toBe(7);
        expect(updatedEntry.current_questionnaire_id).toBe(
            COMPASSConfig.getDefaultQuestionnaireId()
        );

        expect(updatedEntry.start_date.toISOString()).toBe('2019-10-30T05:00:00.000Z');
        expect(updatedEntry.due_date.toISOString()).toBe('2019-11-02T17:00:00.000Z');

        expect(updatedEntry.additional_iterations_left).toBe(12);
    });

    it('participant should receive second instance of the weekly questionnaire on the first Friday after the initial one', () => {
        const participantEntry: ParticipantEntry = {
            subject_id: 'testId',
            last_action: undefined,
            current_questionnaire_id: COMPASSConfig.getDefaultQuestionnaireId(),
            start_date: new Date(Date.now()),
            due_date: new Date(Date.now()),
            current_instance_id: null,
            current_interval: 0,
            additional_iterations_left: 13,
            status: ParticipationStatus.OnStudy,
            general_study_end_date: undefined,
            personal_study_end_date: undefined
        };

        const updatedEntry = StateModel.calculateUpdatedData(participantEntry);
        expect(updatedEntry.current_interval).toBe(7);
        expect(updatedEntry.current_questionnaire_id).toBe(
            COMPASSConfig.getDefaultQuestionnaireId()
        );

        expect(updatedEntry.start_date.toISOString()).toBe('2019-11-01T05:00:00.000Z');
        expect(updatedEntry.due_date.toISOString()).toBe('2019-11-04T17:00:00.000Z');

        expect(updatedEntry.additional_iterations_left).toBe(12);
    });

    it('participant should receive final questionnaire after 13 repetitions of the weekly questionnaire', () => {
        const participantEntry: ParticipantEntry = {
            subject_id: 'testId',
            last_action: undefined,
            current_questionnaire_id: COMPASSConfig.getDefaultQuestionnaireId(),
            start_date: new Date(Date.now()),
            due_date: new Date(Date.now()),
            current_instance_id: null,
            current_interval: 0,
            additional_iterations_left: 0,
            status: ParticipationStatus.OnStudy,
            general_study_end_date: undefined,
            personal_study_end_date: undefined
        };

        const updatedEntry = StateModel.calculateUpdatedData(participantEntry);
        expect(updatedEntry.current_interval).toBe(7);
        expect(updatedEntry.current_questionnaire_id).toBe(
            COMPASSConfig.getDefaultLongQuestionnaireId()
        );

        expect(updatedEntry.start_date.toISOString()).toBe('2019-10-30T05:00:00.000Z');
        expect(updatedEntry.due_date.toISOString()).toBe('2019-11-02T17:00:00.000Z');

        expect(updatedEntry.additional_iterations_left).toBe(0);
    });

    it("participant should be 'off-study' after submitting final questionnaire", () => {
        const participantEntry: ParticipantEntry = {
            subject_id: 'testId',
            last_action: undefined,
            current_questionnaire_id: COMPASSConfig.getDefaultLongQuestionnaireId(),
            start_date: new Date('2019-11-01T05:00:00.000Z'),
            due_date: new Date('2019-14-01T05:00:00.000Z'),
            current_instance_id: null,
            current_interval: 0,
            additional_iterations_left: 0,
            status: ParticipationStatus.OnStudy,
            general_study_end_date: undefined,
            personal_study_end_date: undefined
        };

        const updatedEntry = StateModel.calculateUpdatedData(participantEntry);
        expect(updatedEntry.status).toBe(ParticipationStatus.OffStudy);
    });
});
