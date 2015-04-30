'use strict';

module.exports = [
    {
        name: 'type',
        default: 'string',
        type: 'list',
        required: true,
        choices: ['string', 'number', 'date', 'object', 'array', 'boolean'],
        message: 'Which type is your attribute "%name%"?'
    },
    {
        name: 'required',
        default: false,
        type: 'confirm',
        message: 'Is the attribute %name% required?'
    },
    {
        name: 'default',
        type: 'input',
        prerequisites: function(val, responses){
            return (responses.type === 'string' || responses.type === 'number' || responses.type === 'date') && responses.required === false;
        },
        casts: ['date', 'number', 'string'],
        message: 'What is the default value of "%name%"?',
        postrequisites : function(val) {
            if (typeof val === 'string') {
                return val.length > 0;
            }

            return true;
        }
    },
    {
        name: 'default',
        type: 'confirm',
        default: true,
        prerequisites: {
            type: 'boolean',
            required: false
        },
        casts: ['boolean'],
        message: 'What is the default value of "%name%"?'
    },
    {
        name: 'min',
        type: 'input',
        prerequisites: {
            'type': 'string'
        },
        postrequisites: function (val) {
            return val > 0;
        },
        required: false,
        casts: ['integer']
    }, {
        name: 'max',
        type: 'input',
        prerequisites: {
            type: 'string'
        },
        postrequisites: function (val, properties) {
            return properties.min ? val > properties.min : val > 0;
        },
        required: false,
        casts: ['integer']
    }
];
