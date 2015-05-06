'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	errorHandler = require('./errors.server.controller'),
	<%= classifiedSingularName %> = require('../models/<%= slugifiedSingularName %>.server.model'),
	_ = require('lodash'),
        r = require('thinky')().r;

exports.cleanInput = function(req, res, next) {
    delete req.body.created;
    next();
};

/**
 * Create a <%= humanizedSingularName %>
 */
exports.create = function(req, res) {
	var <%= camelizedSingularName %> = new <%= classifiedSingularName %>(req.body);
	//<%= camelizedSingularName %>.userId = req.user.id;
	
	<% for (var aN in nonEditableAttributes) { %>
	<%= camelizedSingularName %>.<%= aN %> = undefined;//input your value here <% } %>

	<%= camelizedSingularName %>.save(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(<%= camelizedSingularName %>);
		}
	});
};

/**
 * Show the current <%= humanizedSingularName %>
 */
exports.read = function(req, res) {
	res.jsonp(req.<%= camelizedSingularName %>);
};

/**
 * Update a <%= humanizedSingularName %>
 */
exports.update = function(req, res) {
	var <%= camelizedSingularName %> = req.<%= camelizedSingularName %> ;

	<%= camelizedSingularName %> = _.extend(<%= camelizedSingularName %> , req.body);
    //<%= camelizedSingularName %>.userId = req.<%= camelizedSingularName %>.user.id;
	<% for (var aN in nonEditableAttributes) { %>
	<%= camelizedSingularName %>.<%= aN %> = undefined; //set the value here <% } %> <% for (var aN in oneTimeEditableAttributes) { %>
	<%= camelizedSingularName %>.<%= aN %> = undefined; <% } %>

	<%= camelizedSingularName %>.save(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(<%= camelizedSingularName %>);
		}
	});
};

/**
 * Delete an <%= humanizedSingularName %>
 */
exports.delete = function(req, res) {
	var <%= camelizedSingularName %> = req.<%= camelizedSingularName %> ;

	<%= camelizedSingularName %>.delete(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(<%= camelizedSingularName %>);
		}
	});
};

/**
 * List of <%= humanizedPluralName %>
 */
exports.list = function(req, res) {
    <%= classifiedSingularName %>.orderBy(r.desc('create'))
        /*.getJoin({
            user: {
                _apply : function(user){
                    return user.pluck('id', 'firstName', 'lastName', 'displayName', 'username');
                }
            }
        })*/
		.without(<%= JSON.stringify(Object.keys(privateAttributes)) %>)
        .execute()
		.then(function(cursor){
			return cursor.toArray();
		})
        .then(function(<%= camelizedPluralName %>){
            res.json(<%= camelizedPluralName %>);
        })
        .error(function(err) {
            return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
        });
};

/**
 * <%= humanizedSingularName %> middleware
 */
exports.<%= camelizedSingularName %>ByID = function(req, res, next, id) {
    <%= classifiedSingularName %>.get(id)
        /*.getJoin({
            user: {
                _apply : function(user){
                    return user.pluck('id', 'firstName', 'lastName', 'displayName', 'username');
                }
            }
        })*/
		.without(<%= JSON.stringify(Object.keys(privateAttributes)) %>)
        .execute()
        .then(function(<%= camelizedSingularName %>) {
            req.<%= camelizedSingularName %> = <%= camelizedSingularName %>;
            next();
        })
        .error(function(err) {
           return next(err);
        });
};

/**
 * <%= humanizedSingularName %> authorization middleware
 */
exports.hasAuthorization = function(req, res, next) {
	if (req.<%= camelizedSingularName %>.user.id !== req.user.id) {
		return res.status(403).send('User is not authorized');
	}
	next();
};
