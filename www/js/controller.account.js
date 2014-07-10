angular.module('synctrip.controller.account', ['simpleLoginTools'])
.controller('AccountCtrl', ['$scope', '$rootScope', '$state', '$stateParams', 'waitForAuth', 'loginService', function($scope, $rootScope, $state, $stateParams, waitForAuth, loginService) {
  waitForAuth.then(function() {
    $scope.providers = ['Google']
    $scope.$watch('auth', $scope.kick);
  });

  $scope.kick = function(d) {
    // console.log("STATE ", $state, $scope.auth);
      if( (!$state || !!$state.current.authRequired) && (!$scope.auth || !$scope.auth.user) ) {
        // Boot them!
        // console.log("  BOOT")
        $state.go('app.welcome');
      }
    }

  $scope.login = function(provider, callback) {
    console.log("Try logging in with provider '"+provider+"'...", callback);
    $scope.err = null;
    loginService.login(provider, function(err, user) {
      if(err) {
        console.log("Error signing in: ", err);
        var error = null;
        switch(err.code) {
          case 'INVALID_USER':
          case 'INVALID_EMAIL':
          case 'INVALID_PASSWORD':
            error = 'Authentication invalid';
            break;
          case 'USER_DENIED':
            error = 'Authentication canceled';
            break;
          default:
            error = 'Problem signing in';
            break;
        }
        $scope.auth = { user: null, error: error };
      } else {
        console.log("Successfully signed in: ", user);
        $rootScope.currentUser = user;
        $state.go('app.trips')
        }
        $scope.err = err||null;
        typeof(callback) === 'function' && callback(err, user);
      });
  };

  $scope.logout = function() {
    loginService.logout();
    $state.go('app.welcome');
  }
}])
