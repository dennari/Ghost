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
config = require('../config'),
dataProvider = require('../models'),
committer = git.Signature.now("Ghost Editor", "tech@zoined.com");

function getRepo() {
  var repoPath = config.paths.contentRepoPath || config.paths.contentPath + "/../.git";
  if (!fs.existsSync(repoPath)) {
    return Promise.reject(new errors.NotFoundError('Invalid git repoPath: ' + repoPath));
  }

  return canThis({
    internal: true
  }).add.tag().then(function() {
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

function credentials(url, userName) {
  var privateKey = config.privateKey || '/Users/dennari/.ssh/id_rsa';
  var publicKey = config.publicKey || '/Users/dennari/.ssh/id_rsa.pub';
  return git.Cred.sshKeyNew(userName, publicKey, privateKey, '');
}

function merge(repo, to, from) {
  var toOid;
  console.log("MERGING FROM "+from+" TO "+to)
  return repo.getBranch(to)
    .then(repo.getBranchCommit.bind(repo))
    .then(function(toOid_){
      toOid = toOid_.toString();
      console.log(toOid)
      return repo.mergeBranches(to, from)
    })
    .then(function(mergeOid) {
      console.log(mergeOid)
      if(toOid === mergeOid) {
        // the fetch didn't produce anything new, so no merging happened
        console.log("nothing to merge")
        return 0;
      }

      console.log("something to merge")

      var opts = {
        checkoutStrategy: git.Checkout.STRATEGY.FORCE
      };
      return git.Checkout.head(repo, opts)
        .then(function(){
          console.log("forced checkout")
          
          return 1;
        })

    })
    .catch(function(err) {
      if (err.toString() === "[object Index]") {
        // there are conflicts
        var index = err;
        return Promise.reject(new Error("Can't merge because of conflicts... Please resolve manually."));
      }
      return Promise.reject(_.isError(err) ? err : new Error(err.toString()));
    })    

}


function pull(repo, remote, branch) {

  
    return repo.fetch(remote, {
      credentials: credentials,
      certificateCheck: function() {
        return 1;
      }
    })
    .then(function(fetch_) {
      console.log("FETCHED: "+remote+"/"+branch+" with result "+fetch_)
      return merge(repo, branch, remote + "/" + branch)
    })

}

function push(repo, remote, branch) {
  var oid,
  index,
  remote;

  return git.Remote.lookup(repo, remote)
  .then(function(remote_) {
    remote = remote_;

    remote.setCallbacks({
      credentials: credentials
    });

      // Create the push object for this remote
      return remote.push(
        ["refs/heads/" + branch + ":refs/heads/" + branch + ""],
        null,
        repo.defaultSignature(),
        "Push to " + branch
        );
    })
}

function possiblyCommit(repo, author) {
  var index,
  oid;
  return repo.getStatus()
  .then(function(statuses) {
    if (statuses && countChanges(statuses) > 0) {
      status = statusArray(statuses);
      return repo.openIndex()
    }
      // the working tree is clean
      throw new errors.ValidationError("Nothing to commit", "statuses.length")

    })
  .then(function(index_) {
    index = index_;
    return index.addAll("ghost")
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

  })
  .then(function(parent) {

    return repo.createCommit("HEAD", author, committer, "Auto-commit by editor.zoined.com", oid, [parent]);
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

  pull: function(options) {
    var options = options ||  {};
    return getRepo()
    .then(function(repo) {
      return pull(repo, options.remote || "origin", options.branch || "master")
    })
  },

  /**
   * ### Add tag
   * @param {Tag} object the tag to create
   * @returns {Promise(Tag)} Newly created Tag
   */
   add: function add(body, options) {
    //console.log(config)
    var repo,
    index,
    oid,
    remote,
    status,
    entryCount,
    options = options || {},
    body = body || {},
    author,
    target = body.target || "devsite",
    actualTarget = "devsite";

    if (!(options.context && options.context.user)) {
      throw new Error("User id not found in the context");
    }

    return dataProvider.User.findOne({
      id: options.context.user
    }).then(function(user) {
      if (user) {
        author = git.Signature.now(user.get("name"), user.get("email"));
        return author;
      }

      return Promise.reject(new errors.NotFoundError('User not found.'));
    })
    .then(getRepo)
    .then(function(repo_) {
      repo = repo_;
      return possiblyCommit(repo, author);
    })
    .then(function() {
        // THERE WAS SOMETHING TO COMMIT
        return pull(repo, "origin", "master")
          .then(function(pullResult) {
            return push(repo, "origin", "master")
          }, function(err) {
            return Promise.reject(err); // probably a merge conflict
          })
          .then(function() {
            return ["committed", "pulled", "pushed"]
          })

      }, function(err) {
        if (!(err.name && err.name === "ValidationError")) { // something unexpected
          throw err;
        }
        // NOTHING TO COMMIT
        // still update
        console.log("nothing to commit")
        return pull(repo, "origin", "master")
          .then(function(pullResult) {
            console.log(pullResult)
            if(pullResult === 0) {
              if(target === "production") {
                // NOTHING TO PULL, i.e. all up-to-date, i.e. allowed to push to production
                actualTarget = target;
                return merge(repo, "productionn", "master")
                  .then(function(mergeResult) {
                    if(mergeResult === 0) { // the production is already up-to-date
                      return [];
                    }
                    return push(repo, "origin", "productionn")
                      .then(function(){
                        return ["merged", "pushed"]
                      })
                  })
              }
              return [];
            }
            return ["pulled"]
          }, function(err) {
            return Promise.reject(err); // probably a merge conflict
          })

      })
    .then(function(sequence) {
      var results = {
        sequence: sequence,
        target: actualTarget
      }
      //console.log(results)
      return results;
    }).catch(function(err) {

      return Promise.reject(err)

    });

  }

};

module.exports = commits;
