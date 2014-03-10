module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      dist: {
        files: { 'dist/mysweeper.js': [ 'js/**/*.js' ], },
        options: { debug: true }
      }
    },

    watch: {
      files: ['js/**/*.js'],
      tasks: ['browserify', 'uglify', 'cssmin']
    },

    uglify: {
      options: {
        // the banner is inserted at the top of the output
        // banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['dist/mysweeper.js']
        }
      }
    },

    cssmin: {
      combine: {
        files: {
          'dist/mysweeper.min.css': ['css/**/*.css']
        }
      }
    },


  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['browserify','uglify']);
};