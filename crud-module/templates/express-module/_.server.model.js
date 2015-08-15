'use strict';

/**
 * Module dependencies.
 */
var config = require('../../config/config'),
    thinky = require('../../config/db').getThinky(),
    r = thinky.r,
    type = thinky.type,
    User = require('./user.server.model');

/**
 * <%= humanizedSingularName %> Schema
 */
var <%= classifiedSingularName %> = thinky.createModel('<%= camelizedPluralName %>',{
    <% for(var key in thinkyParsedAttributes) { %><%= key %>: type.<%= thinkyParsedAttributes[key].join('.') %>,
    <% } %>id: type.string()
}, {
    enforce_extra: 'remove'
});


<% if (attributes.creatorId && attributes.creatorId.model === 'user'){ %>
<%= classifiedSingularName %>.belongsTo(User, 'creator', 'creatorId', 'id'); <% } %>

module.exports = <%= classifiedSingularName %>;
