angular.module('synctrip.controller.trips', ['simpleLogin','synctrip.service.trips'])
.controller('TripsCtrl', ['$scope','Trips', 'currentUser', function($scope, Trips, currentUser) {
  $scope.currentUser = currentUser;
  $scope.newTrip = {};
  $scope.trips = Trips.collection($scope.currentUser);
  $scope.expandAll = false;

  $scope.updateExpansion = function() {
    console.log("Update expandsion...", $scope.trips[0].expanded);
    angular.forEach($scope.trips, function(trip, key) {
      $scope.trips[key].expanded = $scope.expandAll;
    });
    console.log("Updated expandsion.", $scope.trips[0].expanded);
  }

  $scope.doRefresh = function() {
    $scope.trips = Trips.collection($scope.currentUser);
    $scope.trips.$loaded().then(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

  $scope.createTrip = function() {
    console.log("create trip!");
    if(!$scope.newTrip.name || $scope.newTrip.name.length == 0) return;
    Trips.create({name: $scope.newTrip.name}, currentUser);
    $scope.newTrip.name = '';
  }

  $scope.deleteTrip = function(tripId) {
    if(!tripId) { return null; }
    console.log("delete trip!");
    Trips.remove(tripId, currentUser);
  }
}])


