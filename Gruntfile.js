module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      dist: {
        files: { 'dist/<%= pkg.name %>.js': ['js/**/*.js', '!js/vendor/**/*.js'], },
        options: { debug: true }
      },
      test: {
        files: { 'test/bundle.js': [ 'test/**/*-unit_test.js' ] },
        options: { debug: true }
      }
    },

    watch: {
      files: ['js/**/*.js','css/**/*.css','test/**/*-unit_test.js'],
      tasks: ['browserify']
    },

    uglify: {
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['dist/mysweeper.js']
        }
      }
    },

    cssmin: {
      combine: {
        files: {
          'dist/<%= pkg.name %>.min.css': ['css/**/*.css']
        }
      }
    },

  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['browserify','uglify']);
  grunt.registerTask('dist', ['browserify','uglify','cssmin']);
};