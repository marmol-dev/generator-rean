'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
    config = require('../../config/config'),
    thinky = require('thinky')(config.db),
    r = thinky.r,
    type = thinky.type,
    User = require('./user.server.model');

/**
 * Article Schema
 */

var Article = thinky.createModel('articles', {
    created: type.date().optional().default(Date.now),
    title: type.string().required(),
    content: type.string().required(),
    userId: type.string().required(),
    id: type.string() //do not put here .required()
}, {
    enforce_extra : 'remove'
});

Article.pre('save', function(next){
    this.created = new Date(this.created);
    next();
});

Article.belongsTo(User, 'user', 'userId', 'id');

module.exports = Article;
