'use strict';

var _ = require('lodash');

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
        throw new Error('Attribute definition should be an object');
    } else if (!_.isObject(prerequisites)) {
        throw new Error('The prerequisites should be and object');
    }

    return _.all(Object.keys(prerequisites), function (prerequisiteProp) {
        return validatePrerequisite(attributeDefinition, prerequisiteProp, prerequisites[prerequisiteProp]);
    });
}

function singleCast(value, type) {
    if (typeof value === 'string') {
        switch(type) {
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
                if (!isNaN(n))
                    return n;
                else return undefined;
            break;
            default:
                throw new Error('Invalid cast type "' + type + '"');
                
            }
    } else if (typeof value === 'boolean') {
        return value;   
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
            return typeof cast === 'string';
        })) {
        throw new Error('All the cast should be a string with the name of the type');
    }

    var i = 0,
        casted;
    
    while(i < allowedCasts && typeof casted === 'undefined') {
        casted = singleCast(propValue, allowedCasts[i]);
        i++;
    }
    
    return casted;
}


function parseFromCL(attributeDefinition, propName, propValue, prerequisites, allowedCasts) {
    if (arguments.length === 3 || validatePrerequisites(attributeDefinition, prerequisites)) {
        var casted = arguments.length >= 5 ? specialCast(propValue, allowedCasts) : propValue;
        if (typeof casted !== 'undefined') {
            attributeDefinition[propName] = casted;
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

module.exports.parseFromCL = parseFromCL;
