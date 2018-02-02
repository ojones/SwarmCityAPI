'use strict';

const logger = require('../logs')(module);

const util = require('util');

/**
 * Abstract class representing functions.
 *
 * A function is an action that can be executed once by the client that will be
 * handled by a queue.
 */
class AbstractFunction {
    /**
     * Creates an abstract function
     *
     * @param   {String}    name        Displayable name of the function
     * @param   {Array}     parameters  Array of parameters than detail what
     *                                  arguments a function is expecting.
     */
    constructor(name, parameters) {
        this._name = name;
        this._parameters = parameters || [];
    }

    /**
     * returns name (verb) of this function
     * @return  {String}   Name of the function
     */
    name() {
        return this._name;
    }

    /**
     * What parameters does the function accept?
     * @return  {Array}     Array of parameters.
     */
    parameters() {
        return this._parameters;
    }

    /**
     * Execute the function.
     *
     * First the data is validated and then it's added to the queue.
     * @param   {Object}    socket      Websocket that's running the function
     * @param   {Object}    data        Parameters needed to execute
     * @param   {Object}    callback    Callback that handles responses
     */
    execute(socket, data, callback) {
        let errors = this.validateData(data);
        if (errors.length) {
            logger.debug(
                'Function %s was passed invalid parameters.',
                this.name(),
                errors
            );
            let reply = {
                response: 400,
                data: data,
                error: 'Bad Request. Some of the parameters you passed are invalid.',
                errors: errors,
            };
            callback(reply);
        } else {
            this.createTask(socket, data, callback);
        }
    }

    /**
     * Validate an incoming data array.
     *
     * @param   {Object}    data
     * @return  {Array}     An array of errors.
     */
    validateData(data) {
        let errors = [];
        this._parameters.forEach((p) => {
            if (!(p.name in data)) {
                errors.push(util.format('Parameter %s is missing.', p.name));
            }
        });
        return errors;
    }
}

module.exports = AbstractFunction;
