angular.module('synctrip.controller.trips', ['simpleLogin','synctrip.service.trips'])
.controller('TripsCtrl', ['$scope','Trips', 'currentUser', function($scope, Trips, currentUser) {

  $scope.trips = Trips.collection($scope.auth.user); //$scope.randomTrip();

  $scope.doRefresh = function() {
    $scope.trips = $scope.randomTrip();
    $scope.$broadcast('scroll.refreshComplete');
  }
}])


