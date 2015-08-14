'use strict';

/**
 * Module dependencies.
 */
var config = require('../../config/config'),
    thinky = require('../../config/db').getThinky(),
    r = thinky.r,
    type = thinky.type;

/**
 * <%= classifiedModelName %> Schema
 */
var <%= classifiedModelName %> = thinky.createModel('<%= slugifiedPluralModelName %>',{
	// <%= classifiedModelName %> model fields
	// ...
});

module.exports = <%= classifiedModelName %>;
