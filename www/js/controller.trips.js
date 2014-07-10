angular.module('synctrip.controller.trips', ['simpleLoginTools'])
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


