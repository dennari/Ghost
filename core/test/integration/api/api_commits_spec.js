/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),
    Promise     = require('bluebird'),
    _           = require('lodash'),
    // Stuff we are testing
    context     = testUtils.context,

    CommitAPI      = require('../../../server/api/commits');

describe('Commits API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:tag', 'perms:init', 'posts'));

    should.exist(CommitAPI);

    describe('Add', function () {


        it('can push to github', function (done) {
            CommitAPI.add(testUtils.context.admin)
                .then(function (results) {
                    console.log(results)
                    should.exist(results);
                    done();
                }).catch(done);
        });

    });

  

    describe('Browse', function () {
        it('can browse (internal)', function (done) {
            CommitAPI.browse(testUtils.context.internal).then(function (results) {
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
