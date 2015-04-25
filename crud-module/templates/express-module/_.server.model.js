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
    <% for(var key in thinkyParsedAttributes) { %>'<%= key %>': type.<%= thinkyParsedAttributes[key].join('.') %>,
    <% } %>'id': type.string()
}, {
    enforce_extra: 'remove'
});

<%= classifiedSingularName %>.pre('save', function(next) {
    this.created = new Date(this.created || null);
    next();
});

<%= classifiedSingularName %>.belongsTo(User, 'user', 'userId', 'id');

module.exports = <%= classifiedSingularName %>;
