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
            console.log(this)
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
                    //self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                    //    identification: self.get('model.email'),
                    //    password: self.get('model.password')
                    //});
                    self.notifications.showSuccess(response);
                    //self.notifications.showAPIError(arguments);
                }, function (resp) {
                    //self.toggleProperty('submitting');
                    self.notifications.showAPIError(resp);
                });

        }
    }
});

export default ApplicationController;
