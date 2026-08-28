module.exports = function (grunt) {
  grunt.initConfig({
    tinypng: {
      images: {
        options: {
          key: process.env.TINYPNG_KEY,
          sigFile: '.tinypng-sigs',
          summarize: true,
          log: true
        },
        files: [{
          expand: true,
          cwd: 'test/assets',
          src: ['*.png'],
          dest: 'test/assets/tmp/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-tinypng-extended');
  grunt.registerTask('default', ['tinypng:images']);
};
