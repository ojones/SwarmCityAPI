/**
 * Subscription manager for 'Nonce'
 */
'use strict';
const logger = require('../logs.js')(module);
const validate = require('../validators');
const scheduledTask = require('../scheduler/scheduledTask')();

const dbService = require('../services').dbService;

/**
 * clean up a task from the scheduler when socket wants to unsubscribe
 *
 * @param      {Object}   task    The task
 * @return     {Promise}  result of removing the task (no return value)
 */
async function cancelSubscription(task) {
    logger.info('cancelSubscripton to shortCode called.');

    if (task.data && task.data.shortCode) {
        let shortCode = task.data.shortCode;
        let _removeShortCodeTask = {
            name: 'removeShortCode',
            func: (task) => {
                logger.debug('Delete ShortCode %s from the db.', shortCode);
                return dbService.deleteShortCode(shortCode);
            },
            data: {},
        };
        await scheduledTask.addTask(_removeShortCodeTask);
        logger.debug('Scheduled removing of shortcode %s.', shortCode);
        return true;
    }
    return false;
}

/**
 * create random shortcode
 *
 * @param      {number}  decimals  The decimals
 * @return     {string}  a shortcode
 */
function createShortCode(decimals) {
	if (decimals < 2) {
		decimals = 2;
	}

	let chars = '0123456789';
	let randomstring = '';

	for (let i = 0; i < decimals; i++) {
		let rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum, rnum + 1);
	}
	return randomstring;
}

const stdValidity = 120 * 1000;

/**
 * Creates an unique short code.
 *
 * @param      {Number}   decimals  decimals of the shortcode
 * @return     {Promise}  resolves with new value.
 */
async function createUniqueShortCode(decimals) {
	let newShortCode = createShortCode(decimals);

    try {
        let shortCode = await dbService.readShortCode(newShortCode);
        if (shortCode) {
            return createUniqueShortCode(decimals);
        }
    } catch (error) {
        return newShortCode;
    }
}

/**
 * Creates a subscription.
 *
 * @param      {Function} 	emitToSubscriber the function to call when you want to emit data
 * @param      {Object}  	args    The parameters sent with the subscription
 * @return     {Promise}  	resolves with the subscription object
 */
async function createSubscription(emitToSubscriber, args) {
	let validity = stdValidity;

    let payload = {};

	if (!args || !args.publicKey || !validate.isAddress(args.publicKey)) {
		throw new Error(
            'Cannot create a ShortCode without a valid publicKey.'
        );
	}
    payload.publicKey = args.publicKey;
	if (!args || !args.username) {
		throw new Error(
            'Cannot create a ShortCode without a valid username.'
        );
	}
    payload.username = args.username;
	if (!args || !args.avatar) {
		throw new Error(
            'Cannot create a ShortCode without a valid avatar.'
        );
    }
    payload.avatar = args.avatar;

	logger.info('Creating a ShortCode for %s', args.publicKey);

    let shortCode = await createUniqueShortCode(5);

    await dbService.saveDataToShortCode(shortCode, validity, payload);

    return {
        task: {
            name: 'createShortCode',
            func: (task) => {},
            responsehandler: (res, task) => {},
            data: {
                'publicKey': args.publicKey,
                'shortCode': shortCode,
            },
        },
        initialResponse: {
            'shortCode': shortCode,
            'validity': validity,
        },
        cancelSubscription: cancelSubscription,
    };
}

module.exports = function() {
	return ({
		name: 'createShortCode',
		createSubscription: createSubscription,
	});
};
