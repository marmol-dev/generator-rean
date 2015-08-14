'use strict';

/**
 * Module dependencies.
 */
var errorHandler = require('./errors.server.controller'),
	<%= classifiedSingularName %> = require('../models/<%= slugifiedSingularName %>.server.model'),
	_ = require('lodash'),
        r = require('../../confib/db').getThinky().r;

exports.cleanInput = function(req, res, next) {
	//remove "non-editable" attributes from req.body  <% for (var name in nonEditableAttributes) { %>
	delete req.body.<%= name %>; //set the value here <% } %>
    next();
};

/**
 * Create a <%= humanizedSingularName %>
 */
exports.create = function(req, res) {
	var <%= camelizedSingularName %> = new <%= classifiedSingularName %>(req.body);
	
	<% if (attributes.creatorId && attributes.creatorId.model === 'user') { %>//Assign the current user to creator
	<%= camelizedSingularName %>.creatorId = req.user.id; <%} %>

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
	return res.jsonp(_.chain(req.<%= camelizedSingularName %>)
		 .clone()
		 .omit(<%= JSON.stringify(Object.keys(privateAttributes)) %>)
		 .value());
};

/**
 * Update a <%= humanizedSingularName %>
 */
exports.update = function(req, res) {
	var <%= camelizedSingularName %> = req.<%= camelizedSingularName %>;

	//Remove "one-time-editable" attributes <% for (var name in oneTimeEditableAttributes) { %>
	delete req.body.<%= name %>; <% } %>

	<%= camelizedSingularName %>.merge(req.body);

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
        <% if (attributes.creatorId && attributes.creatorId.model === 'user'){ %>.getJoin({
            creator: {
                _apply : function(user){
                    return user.pluck('id', 'firstName', 'lastName', 'displayName', 'username');
                }
            }
        })<% } %>
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
        <% if (attributes.creatorId && attributes.creatorId.model === 'user'){ %>.getJoin({
            creator: {
                _apply : function(user){
                    return user.pluck('id', 'firstName', 'lastName', 'displayName', 'username');
                }
            }
        }) <% } %>
        .run()
        .then(function(<%= camelizedSingularName %>) {
            req.<%= camelizedSingularName %> = <%= camelizedSingularName %>;
            next();
        })
        .error(function(err) {
           return next(err);
        });
};

<% if (attributes.creatorId && attributes.creatorId.model === 'user'){ %>
/**
 * <%= humanizedSingularName %> authorization middleware
 */
exports.hasAuthorization = function(req, res, next) {
	if (req.<%= camelizedSingularName %>.creator.id !== req.user.id) {
		return res.status(403).send('User is not authorized');
	}
	next();
};
<% } %>
