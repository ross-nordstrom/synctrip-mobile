angular.module('synctrip.service.login', ['firebase', 'firebase.utils', 'simpleLogin'])

.factory('loginService', ['$rootScope', '$firebaseSimpleLogin', 'fbutil', 'simpleLogin', '$timeout',
  function($rootScope, $firebaseSimpleLogin, fbutil, simpleLogin, $timeout) {
    var auth = $firebaseSimpleLogin(fbutil.ref());
    return {
      /**
      * @param {string} email
      * @param {string} pass
      * @param {Function} [callback]
      * @returns {*}
      */
      login: function(provider, callback) {
        auth.$login(provider, {
          rememberMe: true,
          scope: 'https://www.googleapis.com/auth/plus.login'
        }).then(function(user) {
          var userProfile = fbutil.syncObject('/users/'+user.uid+'/profile');
          userProfile.$loaded().then(function() {
            console.log("Post login, user obj loaded: ", userProfile);
            if(!!userProfile && !userProfile.provider) {
              userProfile.name = auth.user.displayName;
              userProfile.email = auth.user.email;
              userProfile.provider = auth.user.provider;
              userProfile.$save();
            }
          })
          if( callback ) {
            callback(null, user);
          }
        }, callback);
      },

      logout: function() {
        auth.$logout();
      }
    };
  }
])