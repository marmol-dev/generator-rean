'use strict';

/**
 * Module dependencies.
 */
var config = require('../../config/config'),
    thinky = require('thinky')(config.db),
    r = thinky.r,
    type = thinky.type,
    User = require('./user.server.model');

/**
 * <%= humanizedSingularName %> Schema
 */
var <%= classifiedSingularName %> = thinky.createModel('<%= camelizedPluralName %>',{
    created: type.date().optional().default(Date.now),
    name: type.string().required(),
    userId: type.string().required(),
    id: type.string()
}, {
    enforce_extra: 'remove'
});

<%= classifiedSingularName %>.pre('save', function(next) {
    this.created = new Date(this.created || null);
    next();
});

<%= classifiedSingularName %>.belongsTo(User, 'user', 'userId', 'id');

module.exports = <%= classifiedSingularName %>;
