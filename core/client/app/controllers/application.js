import Ember from 'ember';
var ApplicationController = Ember.Controller.extend({
    // jscs: disable
    hideNav: Ember.computed.match('currentPath', /(error|signin|signup|setup|forgotten|reset)/),
    // jscs: enable

    topNotificationCount: 0,
    showGlobalMobileNav: false,
    showSettingsMenu: false,
    toProduction: false,
    isSynchronizing: false,

    userImage: Ember.computed('session.user.image', function () {
        return this.get('session.user.image') || this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    userImageBackground: Ember.computed('userImage', function () {
        return 'background-image: url(' + this.get('userImage') + ')';
    }),

    userImageAlt: Ember.computed('session.user.name', function () {
        var name = this.get('session.user.name');

        return (name) ? name + '\'s profile picture' : 'Profile picture';
    }),

    actions: {
        topNotificationChange: function (count) {
            this.set('topNotificationCount', count);
        },

        setSyncType: function(type) {
            if(type == "development")
                this.set('toProduction', false);
            if(type == "production")
                this.set('toProduction', true);
        },

        commit: function () {
            //console.log(this)
            var self = this,
                store = this.get('store'),
                adapter = store.adapterFor('post'),
                message,
                target = this.get('toProduction') ? "production" : "devsite"; 

            this.set('isSynchronizing', true)
             adapter.ajax(adapter.buildURL("commit"), "POST", {data: {target: target}})
        
                .then(function (response) {
                    self.set('isSynchronizing', false)
                    
                    var msgFn = self.notifications.showSuccess.bind(self.notifications);
                    if(response.sequence && response.sequence.length == 0) {
                        message = "Everything is already up-to-date: <br> ";
                        msgFn = self.notifications.showInfo.bind(self.notifications);
                    }
                    else if(target == "production" && response.target != "production") {
                        message = "Instead of production, synchronized with devsite. Please check that first: <br>";
                        msgFn = self.notifications.showWarn.bind(self.notifications);

                    } else {
                        message = "Synchronized the changes to: <br>"
                    }
                    if(response && response.target == 'devsite') {
                        message += '<a href="http://devsite.zoined.com/en/news">devsite</a>'
                    }
                    if(response && response.target == 'production') {
                        message += '<a href="http://zoined.com/en/news">production</a>'
                    }                    
                    msgFn(message.htmlSafe());
                }, function (resp) {
                    self.set('isSynchronizing', false)
                    self.notifications.showAPIError(resp);
                });

        }
    }
});

export default ApplicationController;
