/*
 * Copyright (c) 2021, IBM Deutschland GmbH
 */
import { ChildControllers, ClassOptions } from '@overnightjs/core';

import { CronJobNotification } from './CronJobNotification';
import { CronJobUserUpdate } from './CronJobUserUpdate';

/**
 * A hack to have instances of cron jobs instantiated.
 *
 * @export
 * @class CronController
 */
@ClassOptions({ mergeParams: true })
@ChildControllers([new CronJobNotification(), new CronJobUserUpdate()])
export class CronController {}
