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
    <% for(var key in thinkyParsedAttributes) { %><%= key %>: type.<%= thinkyParsedAttributes[key].join('.') %>,
    <% } %>id: type.string()
}, {
    enforce_extra: 'remove'
});

<%= classifiedSingularName %>.pre('save', function(next) { <% for(var attributeName in attributes){ var attribute = attributes[attributeName]; if (attribute.type === 'date'){ %>
    this.<%= attributeName %> = new Date(this.<%= attributeName %>);
    if (isNaN(this.<%= attributeName %>.valueOf())) delete this.<%= attributeName %>; <% }} %>

    next();
});
<% if (attributes.creatorId && attributes.creatorId.model === 'user'){ %>
<%= classifiedSingularName %>.belongsTo(User, 'creator', 'creatorId', 'id'); <% } %>

module.exports = <%= classifiedSingularName %>;
