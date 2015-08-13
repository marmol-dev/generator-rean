'use strict';

/**
 * Module dependencies.
 */
var errorHandler = require('./errors.server.controller'),
    Article = require('../models/article.server.model'),
    _ = require('lodash'),
    r = require('thinky')().r;

exports.cleanInput = function(req, res, next){
    delete req.body.created;
    next();
};

/**
 * Create a article
 */
exports.create = function (req, res) {
    var article = new Article(req.body);
    article.userId = req.user.id;

    article.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(article);
        }
    });
};

/**
 * Show the current article
 */
exports.read = function (req, res) {
    res.json(req.article);
};

/**
 * Update a article
 */
exports.update = function (req, res) {
    var article = req.article;

    article = _.extend(article, req.body);
    article.userId = req.article.user.id;

    article.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(article);
        }
    });
};

/**
 * Delete an article
 */
exports.delete = function (req, res) {
    var article = req.article;

    article.delete(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(article);
        }
    });
};

/**
 * List of Articles
 */
exports.list = function (req, res) {
    Article.orderBy(r.desc('create'))
        .getJoin({
            user: {
                _apply : function(user) {
                    return user.pluck('id', 'firstName', 'lastName', 'displayName', 'username');
                }
            }
        })
        .run()
        .then(function (articles) {
            res.json(articles);
        })
        .error(function (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Article middleware
 */
exports.articleByID = function (req, res, next, id) {
    Article.get(id)
        .getJoin({
            user: {
                _apply : function(user) {
                    return user.pluck('id', 'firstName', 'lastName', 'displayName', 'username');
                }
            }
        })
        .run()
        .then(function (article) {
            if (!article) return next(new Error('Failed to load article ' + id));
            req.article = article;
            next();
        })
        .error(function (err) {
            return next(err);
        });
};

/**
 * Article authorization middleware
 */
exports.hasAuthorization = function (req, res, next) {
    if (req.article.user.id !== req.user.id) {
        return res.status(403).send({
            message: 'User is not authorized'
        });
    }
    next();
};
