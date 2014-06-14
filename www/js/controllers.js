angular.module('synctrip.controllers', ['simpleLoginTools'])

.controller('AppCtrl', function($scope) {
})

.controller('PlaylistsCtrl', function($scope) {
  $scope.playlists = [
    { title: 'Reggae', id: 1 },
    { title: 'Chill', id: 2 },
    { title: 'Dubstep', id: 3 },
    { title: 'Indie', id: 4 },
    { title: 'Rap', id: 5 },
    { title: 'Cowbell', id: 6 }
  ];
})

.controller('PlaylistCtrl', function($scope, $stateParams) {
})

.controller('AccountCtrl', function($scope, $stateParams, waitForAuth) {
    waitForAuth.then(function() {
      $scope.providers = ['Google']
    });

    $scope.login = function(provider, callback) {
      console.log("Try logging in with provider '"+provider+"'...", callback);
      $scope.err = null;
      loginService.login(provider, '/', function(err, user) {
        if(err) {
          console.log("Error signing in: ", err);
          $scope.auth = null;
        } else {
          console.log("Successfully signed in: ", user);
          $rootScope.currentUser = user;
          $route.reload();
        }
        $scope.err = err||null;
        typeof(callback) === 'function' && callback(err, user);
      });
    };
})
