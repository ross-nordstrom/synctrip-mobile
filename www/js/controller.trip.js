angular.module('synctrip.controller.trip', ['simpleLogin', 'google-maps', 'synctrip.service.trips'])
.controller('TripCtrl', ['$scope','$stateParams','$ionicModal','Trips', 'currentUser', function($scope, $stateParams, $ionicModal, Trips, currentUser) {
  $scope.currentUser = currentUser;
  $scope.trip = Trips.find($stateParams.id);
  $scope.editModal = null;
  $scope.map = {
    center: {
        latitude: 45,
        longitude: -73
    },
    zoom: 4
  };

  $scope.doRefresh = function() {
    $scope.trip = Trips.find($scope.currentUser);
    $scope.trip.$loaded().then(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

  $scope.addDestination = function(sc) {
    console.log("add destination!", sc, $scope.newDestination, $scope.newDestinationDetails);
    if(!$scope.newDestinationDetails || !$scope.newDestinationDetails.formatted_address || $scope.newDestinationDetails.formatted_address.length == 0) return;
    $scope.trip.destinations.push($scope.newDestinationDetails);
    $scope.newDestinationDetails = null;
    $scope.newDestination = '';
  }

  //init the modal
  $ionicModal.fromTemplateUrl('templates/trips/edit.modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.editModal = modal;
  });

  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function () {
    if(!!$scope.editModal) $scope.editModal.remove();
  });

}])


