angular.module('synctrip.controllers', ['simpleLoginTools'])

.controller('TripsCtrl', function($scope) {
  $scope.items = [
    ['Reggae', 'Chill', 'Dubstep', 'Indie', 'Rap', 'Cowbell'],
    ['Garifana', 'Tripstep', 'Rap', 'Hip-Hop', 'Pop', 'Top 40'],
    ['Comedy', 'Podcasts', 'Politics', 'Sports Talks', 'Finance'],
    ['Bob', 'John', 'Adam', 'Andy', 'Chris', 'Matthew'],
    ['A','B','C','D','E','F','G']
  ]
  $scope.randomTrip = function() {
    return $scope.items[Math.floor(Math.random()*$scope.items.length)].map(function(v) {
      return { title: v };
    });
  }
  $scope.trips = $scope.randomTrip();

  $scope.doRefresh = function() {
    $scope.trips = $scope.randomTrip();
    $scope.$broadcast('scroll.refreshComplete');
  }
})

.controller('TripCtrl', function($scope, $stateParams) {
})

.controller('AccountCtrl', ['$scope', '$rootScope', '$state', '$stateParams', 'loginService', function($scope, $rootScope, $state, $stateParams, loginService) {
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
