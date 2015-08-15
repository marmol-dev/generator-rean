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
 * Article Schema
 */

var Article = thinky.createModel('articles', {
    created: type.date().optional().default(function(){
        return new Date();
    }),
    title: type.string().required(),
    content: type.string().required(),
    userId: type.string().required(),
    id: type.string() //do not put here .required()
}, {
    enforce_extra : 'remove'
});

Article.belongsTo(User, 'user', 'userId', 'id');

module.exports = Article;
