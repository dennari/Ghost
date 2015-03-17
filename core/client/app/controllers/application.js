import Ember from 'ember';
var ApplicationController = Ember.Controller.extend({
    // jscs: disable
    hideNav: Ember.computed.match('currentPath', /(error|signin|signup|setup|forgotten|reset)/),
    // jscs: enable

    topNotificationCount: 0,
    showGlobalMobileNav: false,
    showSettingsMenu: false,

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

        commit: function (target) {
            //console.log(this)
            var self = this;
            ic.ajax.request({
                    url: '/commit/',//this.get('ghostPaths.url').api('commits', 'browse'),
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json', //JSON
                    data: JSON.stringify({
                       target: target
                    })
                }).then(function (response) {
                    var message = "Synchronized the changes to <br>"
                    if(response && response.target == 'devsite') {
                        message += '<a href="http://devsite.zoined.com/en/news">devsite</a>'
                    }
                    if(response && response.target == 'production') {
                        message += '<a href="http://zoined.com/en/news">production</a>'
                    }                    
                    self.notifications.showSuccess(message.htmlSafe());
                }, function (resp) {
                    self.notifications.showAPIError(resp);
                });

        }
    }
});

export default ApplicationController;
