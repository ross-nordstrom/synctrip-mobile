angular.module('synctrip.controller.trip', ['simpleLogin','synctrip.service.trips'])
.controller('TripCtrl', ['$scope','$stateParams','Trips', 'currentUser', function($scope, $stateParams, Trips, currentUser) {
  $scope.currentUser = currentUser;
  $scope.trip = Trips.find($stateParams.id);

  $scope.doRefresh = function() {
    $scope.trip = Trips.find($scope.currentUser);
    $scope.trip.$loaded().then(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
  }
}])


