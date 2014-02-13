module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      dist: {
        files: { 'dist/mysweeper.js': [ 'js/*.js' ], },
        options: { debug: true }
      }
    },

    watch: {
      files: ['js/*.js'],
      tasks: ['browserify']
    }

  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['browserify']);
};