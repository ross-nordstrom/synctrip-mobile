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
      $scope.destination = $scope.updateTiming($scope.destination);
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
    $scope.destination = null;
  }
  $scope.updateTiming = function(destination) {
    if(!destination) return;

    var arriveSet = false;
    var staySet = false;
    var departSet = false;

    if(destination.arrive && !destination.arrive.disabled) {
      // User set the arrive time, so check and possibly set one of the others
      arriveSet = true;
    }
    if(destination.stay && !destination.stay.disabled) {
      // User set the stay time, so check and possibly set one of the others
      staySet = true;
    }
    if(destination.depart && !destination.depart.disabled) {
      // User set the depart time, so check and possibly set one of the others
      departSet = true;
    }

    if(arriveSet && staySet && departSet) {
      // Contradiction! Clear depart
      destination.depart = {};
      departSet = false;
    }
    if(arriveSet && staySet) {
      destination.depart = destination.depart || {};
      destination.depart.disabled = true;
      destination.depart.date = $filter('date')($scope.addDays(destination.arrive.date, destination.stay.days), 'yyyy-MM-dd');

      if(destination.arrive.time) {
        var arriveHours = parseInt(destination.arrive.time ? destination.arrive.time.split(':')[0] : 0);
        var arriveMinutes = parseInt(destination.arrive.time ? destination.arrive.time.split(':')[1] : 0);

        var stayHours = parseInt(destination.stay.hours ? destination.stay.hours : 0);
        var stayMinutes = parseInt(destination.stay.minutes ? destination.stay.minutes : 0);

        var departMinutes = arriveMinutes + stayMinutes;
        var departHours = (arriveHours + stayHours) + Math.floor(departMinutes/60);
        var departTime = [departHours, departMinutes%60].join(':');
        // TODO - Rollover logic to increment depart.date if needed
        if(departTime != destination.depart.time) {
          destination.depart.time = departTime;
        }
      }
    } else if(arriveSet && departSet) {
      destination.stay = destination.stay || {};
      destination.stay.disabled = true;
      destination.stay.days = $scope.diffDays(destination.arrive.date, destination.depart.date);

      var arriveHours = parseInt(destination.arrive.time ? destination.arrive.time.split(':')[0] : 0);
      var arriveMinutes = parseInt(destination.arrive.time ? destination.arrive.time.split(':')[1] : 0);

      var departHours = parseInt(destination.depart.time ? destination.depart.time.split(':')[0] : 0);
      var departMinutes = parseInt(destination.depart.time ? destination.depart.time.split(':')[1] : 0);

      destination.stay.hours = departHours - arriveHours;
      destination.stay.minutes = departMinutes - arriveMinutes;

    } else if(staySet && departSet) {
      destination.arrive.disabled = true;
      // TODO: Force arrive
    }
    return destination;
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

  $scope.departTime = function(destination) {
    var dt = (destination.depart.time || '11:59 pm');
    return new Date(dt);
  }
  $scope.arriveTime = function(destination) {
    var dt = (destination.arrive.time || '12:00 am');
    return new Date(dt);
  }

  $scope.departDateTime = function(destination) {
    var dt = destination.depart.date + ' ' + (destination.depart.time || '11:59 pm');
    return new Date(dt);
  }
  $scope.arriveDateTime = function(destination) {
    var dt = destination.arrive.date + ' ' + (destination.arrive.time || '12:00 am');
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
  // a and b are javascript Date objects
  var _MS_PER_DAY = 1000 * 60 * 60 * 24;
  $scope.diffDays = function(a, b) {
    if(typeof a === 'string') { a = new Date(a.split('-').join('/')); }
    if(typeof b === 'string') { b = new Date(b.split('-').join('/')); }
    if(!a instanceof Date || !b instanceof Date) return 0;
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  }

}]); // controller


