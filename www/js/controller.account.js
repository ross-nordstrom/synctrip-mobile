angular.module('synctrip.controller.account', ['simpleLogin'])
.controller('AccountCtrl', ['$scope', '$rootScope', '$state', '$stateParams', 'loginService',  'currentUser', function($scope, $rootScope, $state, $stateParams, loginService, currentUser) {
  console.log("Current user? ", currentUser);
  $scope.currentUser = currentUser;
  $scope.providers = ['google'];

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
      } else {
        console.log("Successfully signed in: ", user);
        $state.go('app.trips')
        }
        $scope.err = err||null;
        typeof(callback) === 'function' && callback(err, user);
      });
  };

  $scope.logout = function() {
    loginService.logout();
    $scope.currentUser = null;
    $state.go('app.welcome');
  }
}])
