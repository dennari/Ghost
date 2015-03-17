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

function statusArray(statuses) {

  return statuses.map(function(file) {
    return file.path() + " " + statusToText(file);
  });

}

function countChanges(statuses) {

  return statuses.reduce(function(count, file) {
    return file.isModified() || file.isRenamed() || file.isNew() ? count + 1 : count;
  }, 0);

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
      .then(statusArray)

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
    //console.log(config)
    var repo,
      index,
      oid,
      remote,
      status,
      entryCount;

    options = options || {};
    var target = options.target || "devsite";

    return getRepo()
      .then(function(repo_) {
        repo = repo_;
        return repo.getStatus() //repo.openIndex();
      })
      .then(function(statuses) {
        if (statuses && countChanges(statuses) > 0) {
          status = statusArray(statuses);
          return repo.openIndex()
        }
        return Promise.reject(new errors.ValidationError("Nothing to commit", "statuses.length"))

      })
      .then(function(index_) {
        index = index_
        return index.addAll("ghost") //repo.openIndex();
      })
      .then(function() {
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
            var privateKey = config.privateKey || '/Users/dennari/.ssh/id_rsa'
            var publicKey = config.publicKey || '/Users/dennari/.ssh/id_rsa.pub'
              //console.log(publicKey)
            return git.Cred.sshKeyNew(userName, publicKey, privateKey, '');
          }
        });

        // Create the push object for this remote
        return remote.push(
          ["refs/heads/master:refs/heads/master"],
          null,
          repo.defaultSignature(),
          "Push to master");

      }).then(function(result) {
        return {
          pushResult: result,
          status: status,
          target: target,
          entryCount: entryCount
        }
      }).catch(function(err) {

        return Promise.reject(err)

      });

  }

};

module.exports = commits;
