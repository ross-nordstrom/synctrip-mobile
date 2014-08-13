angular.module('synctrip.controller.trips', ['simpleLogin','synctrip.service.trips'])
.controller('TripsCtrl', ['$scope','Trips', 'currentUser', function($scope, Trips, currentUser) {
  $scope.currentUser = currentUser;
  $scope.newTrip = {};
  $scope.trips = Trips.collection($scope.currentUser); //$scope.randomTrip();

  $scope.doRefresh = function() {
    $scope.trips = $scope.randomTrip();
    $scope.$broadcast('scroll.refreshComplete');
  }

  $scope.createTrip = function() {
    console.log("create trip!");
    if(!$scope.newTrip.name || $scope.newTrip.name.length == 0) return;
    Trips.create({name: $scope.newTrip.name}, currentUser);
    $scope.newTrip.name = '';
  }
}])


