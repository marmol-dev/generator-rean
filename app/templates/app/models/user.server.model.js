'use strict';

/**
 * Module dependencies.
 */
var crypto = require('crypto'),
    config = require('../../config/config'),
    thinky = require('thinky')(config.db),
    r = thinky.r,
    type = thinky.type;

/**
 * A Validation function for local strategy properties
 */
var validateLocalStrategyProperty = function (property) {
    return ((this.provider !== 'local' && !this.updated) || property.length);
};

/**
 * A Validation function for local strategy password
 */
var validateLocalStrategyPassword = function (password) {
    return (this.provider !== 'local' || (password && password.length > 6));
};


var User = thinky.createModel('users', {
    id: type.string(), //do not put here .required()
    firstName: type.string().validator(validateLocalStrategyProperty).default(''),
    lastName: type.string().validator(validateLocalStrategyProperty).default(''),
    displayName: type.string(),
    email: type.string().email().required(),
    username: type.string().required(),
    password: type.string().validator(validateLocalStrategyPassword),
    salt: type.string(),
    provider: type.string(),
    providerData: type.object(),
    additionalProvidersData: type.object(),
    roles: type.array().schema(type.string().enum('user', 'admin')).default(['user']).required(),
    updated: type.date().optional().allowNull(),
    created: type.date().optional().allowNull().default(Date.now),
    resetPasswordToken: type.string(),
    resetPasswordExpires: type.date()
}, {
    enforce_extra: 'remove'
});

User.ensureIndex('username');
User.ensureIndex('email');

/**
 * Hook a pre save method to hash the password
 */
User.pre('save', function (next) {

    if (this.created) {
        this.created = new Date(this.created);
    }

    if (this.updated) {
        this.updated = new Date(this.updated);
    }

    if (this.password && this.password.length > 6) {
        this.salt = (new Buffer(crypto.randomBytes(16).toString('base64'), 'base64')).toString();
        this.password = this.hashPassword(this.password);
    }

    next();
});

/**
 * Create instance method for hashing a password
 */
User.define('hashPassword', function (password) {
    if (this.salt && password) {
        return crypto.pbkdf2Sync(password, this.salt, 10000, 64).toString('base64');
    } else {
        return password;
    }
});

/**
 * Create instance method for authenticating user
 */
User.define('authenticate', function (password) {
    return this.password === this.hashPassword(password);
});

/**
 * Find possible not used username
 */
User.defineStatic('findUniqueUsername', function (username, suffix, callback) {
    var _this = this;
    var possibleUsername = username + (suffix || '');

    this.getByUsername(possibleUsername)
        .run()
        .then(function (user) {
            if (!user) {
                callback(possibleUsername);
            } else {
                return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
            }
        }).error(function (err) {
            callback(null);
        });
});

User.defineStatic('getByUsername', function (username) {
    return this.filter({
            username: username
        })
        .limit(1)
        .nth(0)
        .default(null);
});

module.exports = User;
