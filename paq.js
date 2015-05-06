'use strict';

var _ = require('lodash'),
    async = require('async'),
    chalk = require('chalk');

function validatePrerequisite(properties, prerequisiteProp, prerequisiteVal) {
    //array notation
    if (_.isArray(prerequisiteVal) && prerequisiteVal.length === 2 && ['!', '='].lastIndexOf(prerequisiteVal[0]) > -1) {
        switch (prerequisiteVal[0]) {
        case '!':
            return !_.isEqual(properties[prerequisiteProp], prerequisiteVal);

        case '=':
            return _.isEqual(properties[prerequisiteProp], prerequisiteVal);
        }
    } else { //short notation
        var startsWithExclamation = /^!/;
        if (startsWithExclamation.test(prerequisiteProp)) {
            var prop = prerequisiteProp.substr(1);
            return !_.isEqual(properties[prop], prerequisiteVal);
        } else {
            return _.isEqual(properties[prerequisiteProp], prerequisiteVal);
        }
    }
}

function validatePrerequisites(properties, prerequisites) {
    if (!_.isObject(properties)) {
        throw new Error('Attribute definition should be an object. Passed ' + typeof properties + '.');
    } else if (!_.isObject(prerequisites) && typeof prerequisites !== 'function') {
        throw new Error('The prerequisites should be an object or function. Passed ' + typeof prerequisites + '.');
    }

    if (typeof prerequisites === 'function') {
        return prerequisites(properties, properties);
    } else {
        return _.all(Object.keys(prerequisites), function (prerequisiteProp) {
            return validatePrerequisite(properties, prerequisiteProp, prerequisites[prerequisiteProp]);
        });
    }
}

function singleCast(value, type) {
    if (typeof value === 'string') {
        switch (type) {
        case 'string':
            return value;
        case 'date':
            var d = new Date(value);
            if (!isNaN(d.valueOf()))
                return d;
            else return undefined;
            break;
        case 'number':
            var n = parseFloat(value);
            if (!isNaN(n))
                return n;
            else return undefined;
            break;
        case 'integer':
            var i = parseInt(value);
            if (!isNaN(i))
                return i;
            else return undefined;
            break;
        default:
            throw new Error('Invalid cast type "' + type + '"');

        }
    } else if (typeof value === 'boolean') {
        return value;
    } else if (typeof value === 'number') {
        switch (type) {
        case 'number':
            return value;
        case 'integer':
            return parseInt(value);
        case 'string':
            return '' + value;
        case 'date':
            var e = new Date(value);
            if (!isNaN(e.valueOf()))
                return e;
            else return undefined;
            break;
        default:
            throw new Error('Invalid cast type "' + type + '"');
        }
    } else {
        console.error('Not casts for ' + typeof value);
        return undefined;
    }
}

/**
 * Tries to convert propValue to any of the types in allowedCasts
 * and returns the casted value or returns undefined if it can't do the cast
 */
function specialCast(propValue, allowedCasts, verbose) {
    if (typeof allowedCasts === 'string')
        return specialCast(propValue, [allowedCasts]);
    else if (!_.isArray(allowedCasts)) {
        throw new Error('Invalid allowedCasts array');
    } else if (_.all(allowedCasts, function (cast) {
            return typeof cast !== 'string';
        })) {
        throw new Error('All the cast should be a string with the name of the type');
    }

    var i = 0,
        casted;

    do {
        casted = singleCast(propValue, allowedCasts[i]);
        if (verbose) console.log(propValue, '(', typeof propValue, ')', ' -> ', allowedCasts[i], ':', typeof casted !== 'undefined');
        i++;
    } while (i < allowedCasts.length && typeof casted === 'undefined');

    return casted;
}

function Validation(status) {
    this.success = true;
    this.error = null;

    if (_.isObject(status))
        _.extend(this, status);
}

Validation.prototype.setError = function (code, message) {
    this.error = {
        code: code,
        message: message
    };
    this.success = false;
};

/**
 *
 */
function validateResponse(responses, questionName, response, casts, postrequisites, verbose) {
    var validation = new Validation();

    //1. defined response
    if (typeof response === 'undefined') {
        validation.setError('INVALID_RESPONSE', 'Invalid response');
        return validation;
    }

    //2. cast response
    var castedResponse = casts ? specialCast(response, casts, verbose) : response;
    if (typeof castedResponse === 'undefined') {
        validation.setError('CAN\'T_CAST', 'Can\'t cast the response to the given cast types');
        return validation;
    }

    //3. postrequisites
    if (typeof postrequisites === 'function' &&  !postrequisites(castedResponse, _.clone(responses))) {
        validation.setError('POSTREQUISITES_NOT_ACHIEVED', 'Response didn\'t pass the postrequisites');
        return validation;
    }

    validation.castedResponse = castedResponse;
    return validation;
}

function validateQuestion(question) {
    var validateResponse = new Validation();

    if (typeof question.name !== 'string') {
        validateResponse.setError('INVALID_NAME', 'Invalid name');
    }

    return validateResponse;
}

/**
 * Prompt a question
 * Prompt a question and if it is required it will be asking the question while its response is not valid
 * @retrun <void>
 */
function promptQuestion(question, responses, promptFn, callback, invalidResponseValidation, verbose) {
    var newMessage = invalidResponseValidation ? {
        message: invalidResponseValidation.error.message + ' Try again: ' + question.message
    } : {};

    try {
        promptFn([_.extend({}, question, newMessage)], function (res) {
            var response = res[question.name],
                responseValidation = validateResponse(responses, question.name, response, question.casts, question.postrequisites, verbose);

            if (question.required === true && !responseValidation.success) {
                return promptQuestion(question, responses, promptFn, callback, responseValidation, verbose);
            } else {
                return callback(null, responseValidation);
            }
        });
    } catch (error) {
        callback(error);
    }
}


/**
 * Advanced prompt function
 * Prompt an array of questions
 * Steps for each property:
 * 1. evaluate prerequisites (if there are)
 * 2. prompt question
 * 3. cast prompt response (if there is cast specification)
 * 4. evaluate postrequisites (if there are)
 * 5. if cast or postrequisites fail and the property is required then go to step number 2 again
 * 6. if cast or postrequisites fail and the property is not required and has a default value replace it
 * 7. call transform function (if there is)
 * @return <void>
 */
function promptQuestions(name, promptFn, questions, callback, verbose) {
    if (typeof name !== 'string')
        throw new Error('Invalid attribute name');

    if (typeof promptFn !== 'function') {
        throw new Error('Invalid prompt function');
    }

    if (!_.isArray(questions)) {
        throw new Error('Invalid questions array');
    }

    var invalidQuestions = _.chain(questions)
        .map(validateQuestion)
        .filter({
            success: false
        })
        .value();

    if (invalidQuestions.length > 0){
        invalidQuestions.each(function (validationResponse) {
                console.error(chalk.red(validationResponse.error.message));
            });
        throw new Error('There are invalid questions:');
    } else {
        questions = _.map(questions, _.clone);
    }

    if (typeof callback !== 'function') {
        throw new Error('Invalid callback function');
    }


    var responses = {},
        responsesValidations = [];

    async.eachSeries(questions,
        function (question, next) {
            //Message
            if (typeof question.message !== 'string')
                question.message = 'What is the "' + question.name + '" value of "%name%"?';

            question.message = question.message.replace('%name%', name);

            //Prerequisites
            if (question.prerequisites && !validatePrerequisites(responses, question.prerequisites))
                return next();

            //Prompt
            promptQuestion(question, responses, promptFn, function (err, responseValidation) {
                if (err) {
                    return next(err);
                }

                responses[question.name] = responseValidation.castedResponse;
                responsesValidations.push(responseValidation);

                if (verbose && !responseValidation.success){
                    console.log(name, question.name, 'not success', responseValidation);
                }

                //Default response
                if (typeof responses[question.name] === 'undefined' ) {
                    if (typeof question.default !== 'undefined'){
                        responses[question.name] = question.default;
                    } else {
                        delete responses[question.name];
                    }
                }

                //Transform
                if (typeof responses[question.name] !== 'undefined' && typeof question.transform === 'function') {
                    responses[question.name] = question.transform(responses[question.name], responses);

                    if (typeof responses[question.name] === 'undefined') {
                        delete responses[question.name];
                    }
                }

                return next();
            }, undefined, verbose);
        },
        function (err) {
            callback(err, responses, responsesValidations);
        }
    );
}

module.exports.promptQuestions = promptQuestions;
module.exports.promptQuestion = promptQuestion;
module.exports.validatePrerequisites = validatePrerequisites;
module.exports.DEFAULT_QUESTIONS = require('./default_questions');
