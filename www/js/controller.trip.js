angular.module('synctrip.controller.trip', ['simpleLogin', 'google-maps', 'synctrip.service.trips'])
.controller('TripCtrl', ['$scope','$rootScope','$stateParams','$ionicModal','Trips', 'Gmap', 'currentUser', '$filter',
  function($scope, $rootScope, $stateParams, $ionicModal, Trips, Gmap, currentUser, $filter) {
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
  $scope.removeDestination = function(destinationIdx) {
    console.log("REMOVE DEST: ", destinationIdx);
    if(typeof destinationIdx !== 'number' || destinationIdx < 0 || destinationIdx >= this.trip.destinations.length) return;

    this.trip.destinations.splice(destinationIdx, 1); // Remove 1 element from destinationIdx
    this.trip.$save()
  }

  //init the modal
  $ionicModal.fromTemplateUrl('templates/trips/edit.modal.html', {
    scope: $scope,
    animation: 'slide-in-up',
    focusFirstInput: true
  }).then(function (modal) {
    $scope.editTripModal = modal;
    $scope.$watch('[destination.arrive,destination.stay,destination.depart]', function() {
      console.log("WATCH TRIGGERED: ", $scope.destination);
      $scope.updateTiming();
    },true)
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
  $scope.updateTiming = function() {
    if(!$scope.destination) return;

    var arriveSet = false;
    var staySet = false;
    var departSet = false;

    if($scope.destination.arrive && !$scope.destination.arrive.disabled) {
      // User set the arrive time, so check and possibly set one of the others
      arriveSet = true;
    }
    if($scope.destination.stay && !$scope.destination.stay.disabled) {
      // User set the stay time, so check and possibly set one of the others
      staySet = true;
    }
    if($scope.destination.depart && !$scope.destination.depart.disabled) {
      // User set the depart time, so check and possibly set one of the others
      departSet = true;
    }

    if(arriveSet && staySet && departSet) {
      // Contradiction! Clear depart
      $scope.destination.depart = {};
      departSet = false;
    }
    if(arriveSet && staySet) {
      $scope.destination.depart = $scope.destination.depart || {};
      $scope.destination.depart.disabled = true;
      $scope.destination.depart.date = $filter('date')($scope.addDays($scope.destination.arrive.date, $scope.destination.stay.days), 'yyyy-MM-dd');

      if($scope.destination.arrive.time) {
        var arriveHours = parseInt($scope.destination.arrive.time ? $scope.destination.arrive.time.split(':')[0] : 0);
        var arriveMinutes = parseInt($scope.destination.arrive.time ? $scope.destination.arrive.time.split(':')[1] : 0);

        var stayHours = parseInt($scope.destination.stay.hours ? $scope.destination.stay.hours : 0);
        var stayMinutes = parseInt($scope.destination.stay.minutes ? $scope.destination.stay.minutes : 0);

        var departMinutes = arriveMinutes + stayMinutes;
        var departHours = (arriveHours + stayHours) + Math.floor(departMinutes/60);
        var departTime = [departHours, departMinutes%60].join(':');
        // TODO - Rollover logic to increment depart.date if needed
        if(departTime != $scope.destination.depart.time) {
          $scope.destination.depart.time = departTime;
        }
      }
    } else if(arriveSet && departSet) {
      $scope.destination.stay.disabled = true;
      // TODO: Force stay
    } else if(staySet && departSet) {
      $scope.destination.arrive.disabled = true;
      // TODO: Force arrive
    }
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

 /****************************************************************************
  * Utilities
  */
  $scope.addDays = function(aDate, someDays) {
    if(typeof aDate === 'string') { aDate = aDate.split('-').join('/'); }
    var newDate = new Date(aDate.valueOf());
    newDate.setDate(newDate.getDate() + someDays);
    return newDate;
  }
  $scope.addMinutes = function(aDate, someMinutes) {
    var newDate = new Date(aDate.valueOf());
    newDate.setMinutes(newDate.getMinutes() + someMinutes);
    return newDate;
  }

}]); // controller


