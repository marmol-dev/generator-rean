'use strict';

var _ = require('lodash'),
    async = require('async');

function validatePrerequisite(attributeDefinition, prerequisiteProp, prerequisiteVal) {
    //array notation
    if (_.isArray(prerequisiteVal) && prerequisiteVal.length === 2 && ['!', '='].lastIndexOf(prerequisiteVal[0]) > -1) {
        switch (prerequisiteVal[0]) {
        case '!':
            return !_.isEqual(attributeDefinition[prerequisiteProp], prerequisiteVal);

        case '=':
            return _.isEqual(attributeDefinition[prerequisiteProp], prerequisiteVal);
        }
    } else { //short notation
        var startsWithExclamation = /^!/;
        if (startsWithExclamation.test(prerequisiteProp)) {
            var prop = prerequisiteProp.substr(1);
            return !_.isEqual(attributeDefinition[prop], prerequisiteVal);
        } else {
            return _.isEqual(attributeDefinition[prerequisiteProp], prerequisiteVal);
        }
    }
}

function validatePrerequisites(attributeDefinition, prerequisites) {
    if (!_.isObject(attributeDefinition)) {
        throw new Error('Attribute definition should be an object. Passed ' + typeof attributeDefinition + '.');
    } else if (!_.isObject(prerequisites) && typeof prerequisites !== 'function') {
        throw new Error('The prerequisites should be an object or function. Passed ' + typeof prerequisites + '.');
    }

    if (typeof prerequisites === 'function'){
        return prerequisites(attributeDefinition);
    } else {
        return _.all(Object.keys(prerequisites), function (prerequisiteProp) {
            return validatePrerequisite(attributeDefinition, prerequisiteProp, prerequisites[prerequisiteProp]);
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
    } else if (typeof value === 'number'){
        switch(type) {
            case 'number':
                return value;
            case 'integer':
                console.log('number -> integer', value, parseInt(value));
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
function specialCast(propValue, allowedCasts) {
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
        console.log(typeof propValue, propValue, allowedCasts[i]);
        i++;
    } while (i < allowedCasts.length && typeof casted === 'undefined');

    return casted;
}


function parseFromCL(attributeDefinition, propName, propValue, allowedCasts, postrequisites) {
    var casted = allowedCasts ? specialCast(propValue, allowedCasts) : propValue;
    if (typeof casted !== 'undefined') {
        if (typeof postrequisites === 'function') {
            if (postrequisites(casted, attributeDefinition)) {
                attributeDefinition[propName] = casted;
                return true;
            } else {
                return false;
            }
        } else {
            attributeDefinition[propName] = casted;
            return true;
        }
    } else {
        return false;
    }
}

//TODO: complete
var DEFAULT_SCHEMA = [
    {
        name: 'type',
        default: 'string',
        type: 'list',
        required: true,
        choices: ['string', 'number', 'date', 'object', 'array', 'boolean'],
        message: 'Which type is your attribute "%attr%"?'
    }, {
        name: 'min',
        type: 'input',
        prerequisites: {
            'type': 'string'
        },
        postrequisites: function (val) {
            return val > 0;
        },
        required: false,
        allowedCasts: ['integer']
    }, {
        name : 'max',
        type: 'input',
        prerequisites: {
            type: 'string'
        },
        postrequisites : function(val, properties) {
            return val > 0 && val > properties.max;
        },
        required : false,
        allowedCasts: ['integer']
    }
];

/**
 * Advanced prompt function
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
function askProperties(attributeName, prompt, schema, callback) {
    if (typeof attributeName !== 'string')
        throw new Error('Invalid attribute name');

    if (typeof prompt !== 'function') {
        throw new Error('Invalid prompt function');
    }

    if (typeof schema === 'function') {
        callback = schema;
        schema = _.map(DEFAULT_SCHEMA, _.clone);
    }

    //TODO: do some schema structure comprobation
    if (!_.isArray(schema)) {
        throw new Error('Invalid Schema object');
    }

    if (typeof callback !== 'function') {
        throw new Error('Invalid callback function');
    }

    /*
     * this object is of the type: { 'email': true, 'type': 'string', 'aplhanum': false }
     */
    var attributeDefinition = {},
        successParse,
        extended;

    async.eachSeries(schema,
        function (property, next) {
            //initial property comprobations
            if (typeof property.message !== 'string')
                property.message = 'What is the "' + property.name + '" value of the attribute "%attr%?"';

            property.message = property.message.replace('%attr%', attributeName);

            function ask(callback, bad) {
                extended = bad ? {message : 'Invalid. Try again: ' + property.message} : {};
                prompt([_.extend({}, property, extended)], function (res) {
                    res = res[property.name];
                    successParse = parseFromCL(attributeDefinition, property.name, res, property.allowedCasts, property.postrequisites);
                    if (property.required === true && !successParse) {
                        ask(callback, true);
                    } else {
                        callback();
                    }
                });
            }

            if (property.prerequisites && !validatePrerequisites(attributeDefinition, property.prerequisites))
                return next();

            ask(function () {
                if (typeof attributeDefinition[property.name] === 'undefined' && typeof property.default !== 'undefined') {
                    attributeDefinition[property.name] = property.default;
                }

                if (typeof property.transform === 'function'){
                    property.transform(attributeDefinition[property.name], attributeDefinition);

                    if (typeof attributeDefinition[property.name] === 'undefined'){
                        delete attributeDefinition[property.name];
                    }
                }


                next();
            });
        },
        function (err) {
            callback(attributeDefinition);
        }
    );


}

module.exports.parseFromCL = parseFromCL;
module.exports.askProperties = askProperties;
