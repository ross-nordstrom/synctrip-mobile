angular.module('synctrip.controller.trip', ['simpleLogin', 'google-maps', 'synctrip.service.trips'])
.controller('TripCtrl', ['$scope','$rootScope','$stateParams','$ionicModal','Trips', 'currentUser', function($scope, $rootScope, $stateParams, $ionicModal, Trips, currentUser) {
  var destinationDetailsWhitelist = ['address_components', 'formatted_address', 'geometry', 'icon', 'place_id', 'url', 'vicinity'];

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
  $scope.autocompleteOptions = {
    type: "(cities)"
  }

  $scope.newDestination;
  $scope.newDestinationDetails;

  $scope.doRefresh = function() {
    $scope.trip = Trips.find($scope.currentUser);
    $scope.trip.$loaded().then(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

 /****************************************************************************
  * Destination management
  */
  $scope.addDestination = function(place, details) {
    var that = this;

    console.log("add destination!", place, details, this.newDestination, this.newDestinationDetails);
    if(!this.newDestinationDetails || !this.newDestinationDetails.formatted_address || this.newDestinationDetails.formatted_address.length == 0) return;

    this.trip.destinations = this.trip.destinations || [];
    if(this.newDestinationDetails.formatted_address == this.trip.destinations[this.trip.destinations.length - 1]) return;

    var details = {};
    var newDestinationDetails = this.newDestinationDetails;
    angular.forEach(destinationDetailsWhitelist, function(key) {
      if(newDestinationDetails.hasOwnProperty(key)) {
        details[key] = newDestinationDetails[key];
      }
    });
    this.trip.destinations.push({ name: newDestinationDetails.name, details: details});
    this.trip.$save().then(function(){
      that.newDestinationDetails = null;
      that.newDestination = '';
    })
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

 /****************************************************************************
  * Navigation management
  */
  $scope.getRoute = function(callback) {
    if($scope.trip.destinations && $scope.trip.destinations.length > 1) {
      var count = $scope.trip.destinations.length;
      var origin = $scope.trip.destinations[0].details.formatted_address;
      var destination = $scope.trip.destinations[count-1].details.formatted_address;
      var waypoints = [];
      for(var i = 1; i < count-1; i++) {
        waypoints.push($scope.trip.destinations[i].details.formatted_address);
      }
      Gmap.getRoute(origin, destination, waypoints, callback);
    }
  }

}]); // controller


