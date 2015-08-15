'use strict';
var util = require('util'),
	yeoman = require('yeoman-generator');


var ServiceGenerator = yeoman.generators.NamedBase.extend({
	createServiceFile: function() {
		this.slugifiedName = this._.slugify(this._.humanize(this.name));

		this.template('_.server.service.js', 'app/services/' + this.slugifiedName + '.server.service.js')
	}
});

module.exports = ServiceGenerator;
