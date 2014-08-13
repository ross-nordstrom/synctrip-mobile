angular.module('synctrip.service.login', ['firebase', 'firebase.utils'])

.factory('loginService', ['$rootScope', '$firebaseSimpleLogin', 'fbutil', '$timeout',
  function($rootScope, $firebaseSimpleLogin, fbutil, $timeout) {
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