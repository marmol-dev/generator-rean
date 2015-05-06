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
                paq.promptQuestions(attributeName, prompt, paq.DEFAULT_QUESTIONS, function (err, attributeDefinition, attributeResponseValidations) {
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
    askForPrivateAttributes: function () {
        var prompts = [{
            name: 'private',
            type: 'checkbox',
            message: 'Which attributes are "private"? (This means that it\'s value can\'t be modified or created by a user form. Eg: passwords, roles, some dates, user creator ...)',
            choices: Object.keys(this.attributes),
            thinky: {
                display: false
            }
        }];

        paq.DEFAULT_QUESTIONS = this._.union(paq.DEFAULT_QUESTIONS, prompts);

        if (this.options['load-attributes']) {
            return;
        }

        var done = this.async();

        this.prompt(prompts, function (res) {
            var privateAttributes = res.private;
            privateAttributes.forEach(function (attr) {
                this.attributes[attr].private = true;
                done();
            }.bind(this));
        }.bind(this));

    },
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
        function isPrivate(value) {
            return value.private === true;
        }

        this.privateAttributes = this._.pick(this.attributes, isPrivate);
        this.publicAttributes = this._.omit(this.attributes, isPrivate);
    },
    parseThinkyAttributes: function () {
        var _this = this,
            _ = this._;

        //
        function getParsedString(text) {
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
        }

        this.thinkyParsedAttributes = {};

        function parseDescription(attributeDescription) {
            var parsedAttributeDescription = [],
                propertySchema,
                possiblePropertySchemas,
                parsed;

            _.forIn(attributeDescription, function (value, key) {

                //find the property schema of this attribute
                possiblePropertySchemas = _.filter(paq.DEFAULT_QUESTIONS, function (currentPropertySchema) {
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
                        parsedAttributeDescription.push(key + '(' + getParsedString(value) + ')');
                    }
                }
            });

            return parsedAttributeDescription;
        }

        _.forIn(this.attributes, function (attributeDescription, attributeName) {
            _this.thinkyParsedAttributes[attributeName] = parseDescription(attributeDescription);
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
