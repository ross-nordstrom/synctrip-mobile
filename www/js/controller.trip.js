angular.module('synctrip.controller.trip', ['simpleLogin','synctrip.service.trips'])
.controller('TripCtrl', ['$scope','$stateParams','$ionicModal','Trips', 'currentUser', function($scope, $stateParams, $ionicModal, Trips, currentUser) {
  $scope.currentUser = currentUser;
  $scope.trip = Trips.find($stateParams.id);
  $scope.showDetails = false;
  $scope.editModal = null;

  $scope.doRefresh = function() {
    $scope.trip = Trips.find($scope.currentUser);
    $scope.trip.$loaded().then(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
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


