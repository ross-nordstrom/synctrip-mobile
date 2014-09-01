angular.module('synctrip.controller.trip', ['simpleLogin', 'google-maps', 'synctrip.service.trips'])
.controller('TripCtrl', ['$scope','$rootScope','$stateParams','$ionicModal','Trips', 'Gmap', 'currentUser',
  function($scope, $rootScope, $stateParams, $ionicModal, Trips, Gmap, currentUser) {
  var destinationDetailsWhitelist = ['address_components', 'formatted_address', 'geometry', 'icon', 'place_id', 'url', 'vicinity'];

  $scope.currentUser = currentUser;
  $scope.trip = Trips.find($stateParams.id);
  $scope.editTripModal = null;
  $scope.editDestinationModal = null;
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

  $scope.overviewItems = [
    { title: 'Distance', icon: 'ion-model-s', key: 'total_distance', type: 'distance' },
    { title: 'Duration', icon: 'ion-clock', key: 'total_duration', type: 'duration' }
  ];

  $scope.doRefresh = function() {
    $scope.trip = Trips.find($stateParams.id);
    $scope.trip.$loaded().then(function() {
      $scope.calculateRoute();
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

 /****************************************************************************
  * Trip management
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
      that.calculateRoute();
    })
  }

  //init the modal
  $ionicModal.fromTemplateUrl('templates/trips/edit.modal.html', {
    scope: $scope,
    animation: 'slide-in-up',
    focusFirstInput: true
  }).then(function (modal) {
    $scope.editTripModal = modal;
  });

  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function () {
    if(!!$scope.editTripModal) $scope.editTripModal.remove();
  });

 /****************************************************************************
  * Destination management
  */
  $scope.editDestination = function(destinationIdx) {
    $scope.destinationIdx = destinationIdx;
    $scope.destination = $scope.trip.destinations[destinationIdx];
    $scope.editDestinationModal.show();
  }
  $scope.updateDestination = function() {
    console.log("Save changes to destination ", $scope.destination);
    $scope.destination = null;
  }
  //init the modal
  $ionicModal.fromTemplateUrl('templates/destinations/edit.modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.editDestinationModal = modal;
  });

  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function () {
    if(!!$scope.editDestinationModal) $scope.editDestinationModal.remove();
  });

  $scope.departDateTime = function(destination) {
    var dt = destination.departDate + ' ' + (destination.departTime || '11:59 pm');
    return new Date(dt);
  }
  $scope.arriveDateTime = function(destination) {
    var dt = destination.arriveDate + ' ' + (destination.arriveTime || '01:00 am');
    return new Date(dt);
  }

$scope.fakeMin = function() { return '2014-09-05'; }

 /****************************************************************************
  * Navigation management
  */
  $scope.getRoute = function(callback) {
    var count = 0;
    if($scope.trip.destinations && (count = $scope.trip.destinations.length) > 1) {
      var destinations = $scope.trip.destinations;
      var origin = destinations[0].details.formatted_address;
      var destination = destinations[count-1].details.formatted_address;
      var waypoints = destinations.slice(1, count - 1).map(function(destination) {
        return destination.details.formatted_address;
      });
      Gmap.getRoute(origin, destination, waypoints, callback);
    }
  }

  $scope.calculateRoute = function() {
    $scope.getRoute(function(response) {
      if(!!response) {

        console.log("GOOGLE DIRECTIONS ++> ", response);

        $scope.trip.destinations[0].duration = '';
        $scope.trip.destinations[0].distance = '';

        $scope.trip.total_duration = 0;
        $scope.trip.total_distance = 0;
        for(var i=1; i < $scope.trip.destinations.length; i++) {
          $scope.trip.destinations[i].duration = response.routes[0].legs[i-1].duration.value;
          $scope.trip.destinations[i].distance = response.routes[0].legs[i-1].distance.value;

          $scope.trip.total_duration += response.routes[0].legs[i-1].duration.value;
          $scope.trip.total_distance += response.routes[0].legs[i-1].distance.value;
        }


        $scope.trip.$save();
      }
    });
  } // calculateRoute()

  $scope.updateDirections = function() {
    console.log("update directions");
    return this.getRoute(function(foo,bar,baz) {
      console.log("Got route? ", foo,bar,baz);
    })
  }

}]); // controller


