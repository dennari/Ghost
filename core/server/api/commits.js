// # Tag API
// RESTful API for the Tag resource
var Promise = require('bluebird'),
  _ = require('lodash'),
  canThis = require('../permissions').canThis,
  errors = require('../errors'),
  utils = require('./utils'),
  fs = require("fs"),
  path = require("path"),
  git = require('nodegit'),
  config = require('../config');

function getRepo() {
  var repoPath = config.paths.contentPath + "/../.git";
  if (!fs.existsSync(repoPath)) {
    return Promise.reject(new errors.NotFoundError('Invalid git repoPath: ' + repoPath));
  }

  return canThis({
    internal: true
  }).browse.tag().then(function() {
    return git.Repository.open(path.resolve(repoPath))
  })
}

/**
 * ## commits API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
commits = {
  /**
   * ### Browse
   * @param {{context}} options
   * @returns {Promise(commits)} commits Collection
   */
  browse: function browse(options) {

    options = options || {};
    return getRepo()
      .then(function(repo) {
        return repo.getStatus() //repo.openIndex();
      })
      .then(function(statuses) {
        function statusToText(status) {
          var words = [];
          if (status.isNew()) {
            words.push("NEW");
          }
          if (status.isModified()) {
            words.push("MODIFIED");
          }
          if (status.isTypechange()) {
            words.push("TYPECHANGE");
          }
          if (status.isRenamed()) {
            words.push("RENAMED");
          }
          if (status.isIgnored()) {
            words.push("IGNORED");
          }

          return words.join(" ");
        }

        return statuses.map(function(file) {
          return file.path() + " " + statusToText(file);
        });

      })

    // .then(function(index) {
    //   //index = indexResult;
    //   return index.read(1);
    // })
    // .then(function(indexStuff) {
    //   // this file is in the root of the directory and doesn't need a full path
    //   //return index.addByPath(fileName);
    //   return JSON.stringify(indexStuff)
    // })
    // .then(function() {
    //   // this file is in a subdirectory and can use a relative path
    //   return index.addByPath(path.join(directoryName, fileName));
    // })
    // .then(function() {
    //   // this will write both files to the index
    //   return index.write();
    // })
    // .then(function() {
    //   return index.writeTree();
    // })
    // .then(function(oidResult) {
    //   oid = oidResult;
    //   return git.Reference.nameToId(repo, "HEAD");
    // })
    // .then(function(head) {
    //   return repo.getCommit(head);
    // })
    // .then(function(parent) {
    //   var author = git.Signature.create("Scott Chacon",
    //     "schacon@gmail.com", 123456789, 60);
    //   var committer = git.Signature.create("Scott A Chacon",
    //     "scott@github.com", 987654321, 90);

    //   return repo.createCommit("HEAD", author, committer, "message", oid, [parent]);
    // })
    // .done(function(commitId) {
    //   console.log("New Commit: ", commitId);
    // });
    // .catch(function(err){
    //     //return errors.NotFoundError('Something we')
    //     return err;
    // })

  },

  /**
   * ### Read
   * @param {{id}} options
   * @return {Promise(Tag)} Tag
   */
  status: function read(options) {
    options = options || {};
    return Promise.cast("STATUS")

  },

  /**
   * ### Add tag
   * @param {Tag} object the tag to create
   * @returns {Promise(Tag)} Newly created Tag
   */
  add: function add(options) {
    console.log("COMMITS-API: ADD")
    var repo,
      index,
      oid,
      remote;

    options = options || {};

    return getRepo()
      .then(function(repo_) {
        repo = repo_;
        return repo.openIndex() //repo.openIndex();
      })
      .then(function(index_) {
        index = index_
        return index.addAll() //repo.openIndex();
      })
      .then(function() {
        // this will write both files to the index
        return index.write();
      })
      .then(function() {
        return index.writeTree();
      })
      .then(function(oid_) {
        oid = oid_;
        return git.Reference.nameToId(repo, "HEAD");
      })
      .then(function(head) {
        return repo.getCommit(head);
      })
      .then(function(parent) {
        var author = git.Signature.now("Ghost Author", "ville.vaananen@zoined.com");
        var committer = git.Signature.now("Ghost Editor", "tech@zoined.com");

        return repo.createCommit("HEAD", author, committer, "Auto-commit by editor.zoined.com", oid, [parent]);
      })
      .then(function() {
        return git.Remote.lookup(repo, "origin")
      })
      .then(function(remote_) {
        remote = remote_;

        remote.setCallbacks({
          credentials: function(url, userName) {
            return git.Cred.userpassPlaintextNew(config.githubUser, config.githubPassword);
          }
        });

        // Create the push object for this remote
        return remote.push(
          ["refs/heads/master:refs/heads/master"],
          null,
          repo.defaultSignature(),
          "Push to master");

      }).catch(function(err) {
        
        throw err;

      });

  }

};

module.exports = commits;
