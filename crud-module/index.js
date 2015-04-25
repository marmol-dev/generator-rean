'use strict';
var util = require('util'),
    inflections = require('underscore.inflections'),
    yeoman = require('yeoman-generator'),
    async = require('async'),
    parser = require('../parser');


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
                this.attributes[_.trim(attribute)] = {};
            }.bind(this));
            done();
        }.bind(this));
    },
    askForAttributesProperties: function () {
        var done = this.async(),
            _this = this,
            _ = this._;
        
        function parseFromCL(text){
            if (typeof text !== 'string')
                return text;
            
            if (_.trim(text).length === 0)
                return false;
            
            try {
                return JSON.parse(text);
            } catch (e) {
                var date = new Date(text);
                if (!isNaN(date.valueOf())){
                    return date;   
                } else {
                    return _.trim(text);
                }
            }
        }

        function askType(callback) {
            var attribute = this.attribute; //jshint ignore:line
            var prompts = [{
                name: 'type',
                type: 'list',
                message: 'Which is the type of the attribute \"' + attribute + '\" ?',
                choices: ['string', 'number', 'date', 'array', 'object', 'boolean']
            }];

            _this.prompt(prompts, function (props) {
                _this.attributes[attribute].type = props.type;
                callback();
            });
        }

        function askRequired(callback) {
            var attribute = this.attribute; //jshint ignore:line
            var prompts = [{
                name: 'required',
                type: 'confirm',
                message: 'Is the attribute \"' + attribute + '\" required?',
                choices: ['string', 'number', 'date', 'array', 'object', 'boolean']
            }];

            _this.prompt(prompts, function (props) {
                _this.attributes[attribute].required = props.required;
                callback();
            });
        }

        function askDefault(callback) {
            var attribute = this.attribute; //jshint ignore:line

            if (_this.attributes[attribute].required)
                return callback();

            var prompts = [{
                name: 'default',
                message: 'What is the default value for the attribute \"' + attribute + '\"?',
            }];

            _this.prompt(prompts, function (props) {
                _this.attributes[attribute].default = props.default;
                callback();
            });
        }

        function askNumber(callback) {
            var attribute = this.attribute; //jshint ignore:line

            if (_this.attributes[attribute].type !== 'number')
                return callback();

            var prompts = [
                {
                    name: 'min',
                    default: '',
                    message: 'Does this number has a minimum value? (leave empty to no min)'
                }, {
                    name: 'max',
                    default: '',
                    message: 'Does this number has a maximum value? (leave empty to no max)'
                }, {
                    name: 'integer',
                    default: false,
                    type: 'confirm',
                    message: 'Is this number an integer?'
                }
            ];

            _this.prompt(prompts, function (props) {
                if (!isNaN(props.min)) {
                    _this.attributes[attribute].min = props.integer ? parseInt(props.min) : parseFloat(props.min);
                }

                if (!isNaN(props.max)) {
                    _this.attributes[attribute].max = props.integer ? parseInt(props.max) : parseFloat(props.max);
                }

                _this.attributes[attribute].integer = props.integer;
                callback();
            });
        }

        function askString(callback) {
            var attribute = this.attribute; //jshint ignore:line

            if (_this.attributes[attribute].type !== 'string')
                return callback();

            var prompts = [
                {
                    name: 'min',
                    default: '',
                    message: 'Does this string have a min length? (leave empty to no min)'
                }, {
                    name: 'max',
                    default: '',
                    message: 'Does this string have a max length? (leave empty to no max)'
                }, {
                    name: 'additional',
                    type: 'checkbox',
                    message: 'Select the additional attribute features:',
                    choices: ['alphanum', 'email', 'lowercase', 'uppercase'],
                    validate: function (choices) {
                        console.log('Choices', choices);
                        return true;
                    }
                }, {
                    name: 'enum',
                    message: 'Type the enum only allowed values (separated by commas) or leave empty to allow all:',
                    default: ''
                }
            ];

            _this.prompt(prompts, function (props) {
                if (!isNaN(props.min)) {
                    _this.attributes[attribute].min = parseInt(props.min);
                }

                if (!isNaN(props.max)) {
                    _this.attributes[attribute].max = parseInt(props.max);
                }

                props.additional.each(function (feature) {
                    _this.attributes[attribute][feature] = true;
                });

                if (_.trim(props.enum).length > 0) {
                    _this.attributes[attribute].enum = _.map(props.enum.split(','), _.trim);
                }

                callback();
            });
        }

        async.eachSeries(Object.keys(this.attributes), function (attribute, next) {
                var context = {
                    attribute: attribute
                };
                async.waterfall([
                    askType.bind(context),
                    askRequired.bind(context),
                    askDefault.bind(context),
                    askNumber.bind(context),
                    askString.bind(context)
                ], function (err) {
                    next();
                });
            },
            function (err) {
                done();
            });
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
            var parsedAttributeDescription = [];
            //first add the type to the parsed attributeDescription
            parsedAttributeDescription.push(attributeDescription.type + '()');
            //omit the type property and parse all the other properties of the attribute description
            var _attributes = _.omit(attributeDescription, 'type');
            _.forIn(attributeDescription, function (value, key) {
                if (typeof value === 'boolean') {
                    if (value) {
                        parsedAttributeDescription.push(key + '()');
                    }
                } else {
                    parsedAttributeDescription.push(key + '(' + getParsedString(value) + ')');
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