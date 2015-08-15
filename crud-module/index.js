'use strict';
var util = require('util'),
    inflections = require('underscore.inflections'),
    yeoman = require('yeoman-generator'),
    async = require('async'),
    paq = require('../paq'),
    chalk = require('chalk'),
    path = require('path');


var ModuleGenerator = yeoman.generators.NamedBase.extend({
    init: function () {
        this.slugifiedName = this._.slugify(this.name);

        this.slugifiedPluralName = inflections.pluralize(this.slugifiedName);
        this.slugifiedSingularName = inflections.singularize(this.slugifiedName);

        this.camelizedPluralName = this._.camelize(this.slugifiedPluralName);
        this.camelizedSingularName = this._.camelize(this.slugifiedSingularName);

        this.classifiedPluralName = this._.classify(this.slugifiedPluralName);
        this.classifiedSingularName = this._.classify(this.slugifiedSingularName);

        this.humanizedPluralName = this._.humanize(this.slugifiedPluralName);
        this.humanizedSingularName = this._.humanize(this.slugifiedSingularName);
    },

    askForModuleFolders: function () {
        var done = this.async();

        var prompts = [{
            type: 'checkbox',
            name: 'folders',
            message: 'Which supplemental folders would you like to include in your angular module?',
            choices: [{
                value: 'addCSSFolder',
                name: 'css',
                checked: false
            }, {
                value: 'addImagesFolder',
                name: 'img',
                checked: false
            }, {
                value: 'addDirectivesFolder',
                name: 'directives',
                checked: false
            }, {
                value: 'addFiltersFolder',
                name: 'filters',
                checked: false
            }]
        }, {
            type: 'confirm',
            name: 'addMenuItems',
            message: 'Would you like to add the CRUD module links to a menu?',
            default: true
        }];

        this.prompt(prompts, function (props) {
            this.addCSSFolder = this._.contains(props.folders, 'addCSSFolder');
            this.addImagesFolder = this._.contains(props.folders, 'addImagesFolder');
            this.addDirectivesFolder = this._.contains(props.folders, 'addDirectivesFolder');
            this.addFiltersFolder = this._.contains(props.folders, 'addFiltersFolder');

            this.addMenuItems = props.addMenuItems;

            done();
        }.bind(this));
    },

    askForMenuId: function () {
        if (this.addMenuItems) {
            var done = this.async();

            var prompts = [{
                name: 'menuId',
                message: 'What is your menu identifier(Leave it empty and press ENTER for the default "topbar" menu)?',
                default: 'topbar'
            }];

            this.prompt(prompts, function (props) {
                this.menuId = props.menuId;

                done();
            }.bind(this));
        }
    },
    askForAttributes: function () {
        if (this.options['load-attributes']) {
            var attrs = require(path.join(this.destinationRoot(), 'app/models/' + this.slugifiedSingularName + '.server.model.attributes.json'));
            if (!attrs) {
                this.options['load-attributes'] = false;
                return;
            }
            this.attributes = attrs;
            return;
        }

        var done = this.async(),
            _ = this._;

        var prompts = [{
            name: 'attributes',
            message: 'Which attributes would you like to add to your model (comma separated)?',
            default: 'name, content, userId, created, private'
        }];

        this.attributes = {};

        this.prompt(prompts, function (props) {
            props.attributes.split(',').forEach(function (attribute) {
                this.attributes[_.camelize(_.slugify(_.trim(attribute)))] = {};
            }.bind(this));
            done();
        }.bind(this));
    },
    askForAttributeProperties: function () {
        var attributesSchemas = this.attributesSchemas = this._.map(paq.DEFAULT_QUESTIONS, this._.clone);

        if (this.options['load-attributes']) {
            return;
        }

        var done = this.async(),
            _ = this._,
            attributes = this.attributes,
            prompt = function () {
                this.prompt.apply(this, arguments);
            }.bind(this);

        async.eachSeries(Object.keys(attributes),
            function (attributeName, next) {
                paq.promptQuestions(attributeName, prompt, attributesSchemas, function (err, attributeDefinition, attributeResponseValidations) {
                    if (err) {
                        throw new Error(err);
                    }

                    attributes[attributeName] = attributeDefinition;
                    next();
                });
            }, function (err) {
                if (err)
                    console.error(err);

                done();
            }
        );
    },
    defineAttributeManipulationMethods : function() {
        var root = this,
            _ = this._;

        this.isPrivateAttribute = function isPrivate(value) {
            return value.private === true;
        };

        this.isNonEditableAttribute = function isNonEditable(value){
            return value.nonEditable || value.private;
        };

        this.isOneTimeEditableAttribute = function isOneTimeEditable(value){
            return value.oneTimeEditable;
        };

        this.toStringExtended = function toStringExtended(text) {
            try {
                var fn = eval(text); //jshint ignore:line
                if (typeof fn === 'function') {
                    return text;
                } else {
                    return JSON.stringify(text);
                }
            } catch (e) {
                return JSON.stringify(text);
            }
        };

        this.parseThinkyAttribute = function parseDescription(attributeDescription, attributesSchemas) {
            var parsedAttributeDescription = [],
                propertySchema,
                possiblePropertySchemas,
                parsed;

            _.forIn(attributeDescription, function (value, key) {

                //find the property schema of this property
                possiblePropertySchemas = _.filter(attributesSchemas, function (currentPropertySchema) {
                    if (currentPropertySchema.name !== key)
                        return false;

                    if (currentPropertySchema.prerequisites) {
                        return paq.validatePrerequisites(attributeDescription, currentPropertySchema.prerequisites);
                    } else return true;
                });

                propertySchema = _.find(possiblePropertySchemas, function (value) {
                    return value.prerequisites;
                });

                if (!propertySchema)
                    propertySchema = _.last(possiblePropertySchemas);

                if (propertySchema && propertySchema.thinky && propertySchema.thinky.display === false)
                    return;

                if (propertySchema && propertySchema.thinky && typeof propertySchema.thinky.parse === 'function') {
                    parsed = propertySchema.thinky.parse(value, attributeDescription);
                    if (typeof parsed !== 'string')
                        throw new Error('Invalid Thinky parse function for property "' + key + '".');
                    parsedAttributeDescription.push(parsed);
                } else {
                    if (typeof value === 'boolean') {
                        if (value) {
                            parsedAttributeDescription.push(key + '()');
                        }
                    } else {
                        parsedAttributeDescription.push(key + '(' + root.toStringExtended(value) + ')');
                    }
                }
            });

            return parsedAttributeDescription;
        };

    },
    askForPrivateAttributes: function () {
        var prompts = [{
            name: 'private',
            type: 'checkbox',
            message: 'Which attributes are "private"? (This means that the value of this attribute won\'t be displayed in the client and it can\'t be modified "directly" from a form like other attributes. Eg: passwords, email verification tokens, ...)',
            choices: Object.keys(this.attributes),
            thinky: {
                display: false
            }
        }];

        this.attributesSchemas = this._.union(this.attributesSchemas, prompts);

        if (this.options['load-attributes']) {
            return;
        }

        var done = this.async();

        this.prompt(prompts, function (res) {
            var privateAttributes = res.private;
            privateAttributes.forEach(function (attr) {
                this.attributes[attr].private = true;
            }.bind(this));
			done();
        }.bind(this));

    },
    askForNonEditableAttributes: function() {
        var attrs = this._(this.attributes).omit(this.isPrivateAttribute).keys().value();
        var prompts = [{
            name: 'nonEditable',
            type: 'checkbox',
            message: 'Which attributes are "non-editable"? (This means that the value of this attribute don\'t will be directly modified or created by the user. Eg: update dates, user ids, usernames, product califications, etc. The attribute will be displayed in the client in opposition to "private" attributes )',
            choices: attrs,
            thinky: {
                display: false
            }
        }];

        this.attributesSchemas = this._.union(this.attributesSchemas, prompts);

        if (!attrs.length){
            return;
        }

        if (this.options['load-attributes']) {
            return;
        }

        var done = this.async();

        this.prompt(prompts, function (res) {
            var neAttributes = res.nonEditable;
            neAttributes.forEach(function (attr) {
                this.attributes[attr].nonEditable = true;
            }.bind(this));
			done();

        }.bind(this));

    },
    askOneTimeEditableAttributes: function() {
        var _ = this._;

        var attrs = _(this.attributes)
            .omit(this.isPrivateAttribute)
            .omit(this.isNonEditableAttribute)
            .keys()
            .value();

        var prompts = [{
            name: 'oneTimeEditable',
            type: 'checkbox',
            message: 'Which attributes are "one-time-editable"? (This means that the value of this attribute only will be modified in the creation of the model and the user (or optionally user and system) is not allowed to modify it afterwards)',
            choices: attrs,
            thinky: {
                display: false
            }
        }];

        this.attributesSchemas = this._.union(this.attributesSchemas, prompts);

        if (!attrs.length){
            return;
        }

        if (this.options['load-attributes']) {
            return;
        }

        var done = this.async();

        this.prompt(prompts, function (res) {
            var neAttributes = res.oneTimeEditable;
            neAttributes.forEach(function (attr) {
                this.attributes[attr].oneTimeEditable = true;
            }.bind(this));
			done();
        }.bind(this));

    },
    /*askForCreatorProperty : function(){

		console.log('askForCreatorProperty');

        this.attributesSchemas.push({
            name: 'model',
            thinky : {
                display: false
            }
		});

		if (this.options['load-attributes']) {
            return;
        }

        var done = this.async(),
            prompts = [
                {
                    name: 'creator',
                    message: 'Do you want to have a "creator" user property?',
                    type: 'confirm',
                    default: 'false'
                }
            ];

        this.prompt(prompts, function callback(properties){
            if (properties.creator){
                this.attributes.creatorId = {
                    type : 'string',
                    required: true,
                    model: 'user',
					private : true
                };
            }
			done();
        }.bind(this));
    },*/
    saveAttributesInFile: function () {
        if (this.options['load-attributes']) {
            return;
        }
        var jsonAttributes;
        try {
            jsonAttributes = JSON.stringify(this.attributes, null, '\t');
        } catch (e) {
            throw new Error('Couldn\'t stringify the attributes :(');
        }

        this.write('app/models/' + this.slugifiedSingularName + '.server.model.attributes.json', JSON.stringify(this.attributes));
    },
    wrapAttributesObject: function () {
        this.privateAttributes = this._.pick(this.attributes, this.isPrivateAttribute);
        this.publicAttributes = this._.omit(this.attributes, this.isPrivateAttribute);
        this.nonEditableAttributes = this._.pick(this.attributes, this.isNonEditableAttribute);
        this.oneTimeEditableAttributes = this._.pick(this.attributes, this.isOneTimeEditableAttribute);
    },
    parseThinkyAttributes: function () {
        var _this = this,
            _ = this._;

        this.thinkyParsedAttributes = {};

        _.forIn(this.attributes, function (attributeDescription, attributeName) {
            _this.thinkyParsedAttributes[attributeName] = _this.parseThinkyAttribute(attributeDescription, _this.attributesSchemas);
        });
    },
    renderModule: function () {
        // Create module folder
        this.mkdir('public/modules/' + this.slugifiedPluralName);

        // Create module supplemental folders
        if (this.addCSSFolder) this.mkdir('public/modules/' + this.slugifiedPluralName + '/css');
        if (this.addImagesFolder) this.mkdir('public/modules/' + this.slugifiedPluralName + '/img');
        if (this.addDirectivesFolder) this.mkdir('public/modules/' + this.slugifiedPluralName + '/directives');
        if (this.addFiltersFolder) this.mkdir('public/modules/' + this.slugifiedPluralName + '/filters');

        // Render express module files
        this.template('express-module/_.server.controller.js', 'app/controllers/' + this.slugifiedPluralName + '.server.controller.js');
        this.template('express-module/_.server.model.js', 'app/models/' + this.slugifiedSingularName + '.server.model.js');
        this.template('express-module/_.server.routes.js', 'app/routes/' + this.slugifiedPluralName + '.server.routes.js');
        this.template('express-module/_.server.model.test.js', 'app/tests/' + this.slugifiedSingularName + '.server.model.test.js');
        this.template('express-module/_.server.routes.test.js', 'app/tests/' + this.slugifiedSingularName + '.server.routes.test.js');

        // Render angular module files
        this.template('angular-module/config/_.client.routes.js', 'public/modules/' + this.slugifiedPluralName + '/config/' + this.slugifiedPluralName + '.client.routes.js');
        this.template('angular-module/controllers/_.client.controller.js', 'public/modules/' + this.slugifiedPluralName + '/controllers/' + this.slugifiedPluralName + '.client.controller.js');
        this.template('angular-module/services/_.client.service.js', 'public/modules/' + this.slugifiedPluralName + '/services/' + this.slugifiedPluralName + '.client.service.js');
        this.template('angular-module/tests/_.client.controller.test.js', 'public/modules/' + this.slugifiedPluralName + '/tests/' + this.slugifiedPluralName + '.client.controller.test.js');

        // Render menu configuration
        if (this.addMenuItems) {
            this.template('angular-module/config/_.client.config.js', 'public/modules/' + this.slugifiedPluralName + '/config/' + this.slugifiedPluralName + '.client.config.js');
        }

        // Render angular module views
        this.template('angular-module/views/_.create.client.view.html', 'public/modules/' + this.slugifiedPluralName + '/views/create-' + this.slugifiedSingularName + '.client.view.html');
        this.template('angular-module/views/_.edit.client.view.html', 'public/modules/' + this.slugifiedPluralName + '/views/edit-' + this.slugifiedSingularName + '.client.view.html');
        this.template('angular-module/views/_.list.client.view.html', 'public/modules/' + this.slugifiedPluralName + '/views/list-' + this.slugifiedPluralName + '.client.view.html');
        this.template('angular-module/views/_.view.client.view.html', 'public/modules/' + this.slugifiedPluralName + '/views/view-' + this.slugifiedSingularName + '.client.view.html');

        // Render angular module definition
        this.template('angular-module/_.client.module.js', 'public/modules/' + this.slugifiedPluralName + '/' + this.slugifiedPluralName + '.client.module.js');
    }
});

module.exports = ModuleGenerator;
