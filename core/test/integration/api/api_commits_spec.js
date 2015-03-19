/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/

var config = require('../../../server/config'),
configFile = require('../../../../config')['testing'];
config.init(configFile);

var fs = require('fs')
var crypto = require('crypto')

var testUtils = require('../../utils'),
  should = require('should'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  // Stuff we are testing
  context = testUtils.context,

  CommitAPI = require('../../../server/api/commits');

describe('Commits API', function() {
  // Keep the DB clean
  before(testUtils.teardown);
  afterEach(testUtils.teardown);
  beforeEach(testUtils.setup('users:roles', 'perms:tag', 'perms:init', 'posts'));

  should.exist(CommitAPI);

  describe('Add', function() {

    it.skip('can pull from github', function(done) {
      CommitAPI.pull(testUtils.context.admin)
        .then(function(results) {
          console.log(results)
          should.exist(results);
          done();
        }).catch(done);
    });


    it.skip('can sync with remote master without losing local changes', function(done) {
      var md5 = crypto.createHash('md5');
      var timestamp = Date.now().toString();
      md5.update(timestamp)
      var changedFile = config.paths.contentPath + "/unitTestFile" + md5.digest('hex') + ".md"
      fs.writeFileSync(changedFile, timestamp.toString());

      CommitAPI.add({target: "devsite"}, testUtils.context.admin)
        .then(function(results) {
          console.log(results)
          should.exist(results);
          results.target.should.equal("devsite")
      
          var readTimestamp = fs.readFileSync(changedFile, {encoding: 'utf8'});
          readTimestamp.should.equal(timestamp.toString())

          done();
        }).catch(done);
    });

    it('can push to production', function(done) {
      
      CommitAPI.add({target: "production"}, testUtils.context.admin)
        .then(function(results) {
          console.log(results)
          should.exist(results);
          results.target.should.equal("production")
          done();
        }).catch(done);
      });


  });

  describe.skip('Browse', function() {
    it('can browse (internal)', function(done) {
      CommitAPI.browse(testUtils.context.internal).then(function(results) {
        console.log(results)
        should.exist(results);
        // should.exist(results.tags);
        // results.tags.length.should.be.above(0);
        // testUtils.API.checkResponse(results.tags[0], 'tag');
        // results.tags[0].created_at.should.be.an.instanceof(Date);

        done();
      }).catch(done);
    });

  });

});
