angular.module('synctrip.controller.trip', ['simpleLogin', 'google-maps', 'synctrip.service.trips', 'ionic'])
.controller('TripCtrl', ['$scope','$rootScope','$stateParams','$ionicModal','$ionicListDelegate','$q','Trips', 'Gmap', 'currentUser', '$filter',
  function($scope, $rootScope, $stateParams, $ionicModal, $ionicListDelegate, $q, Trips, Gmap, currentUser, $filter) {
    var destinationDetailsWhitelist = ['address_components', 'formatted_address', 'geometry', 'icon', 'place_id', 'url', 'vicinity'];
    var _MS_PER_MINUTE = 1000 * 60;
    var _MS_PER_HOUR = 1000 * 60 * 60;
    var _MS_PER_DAY = 1000 * 60 * 60 * 24;
    var _S_PER_DAY = 60 * 60 * 24;

    $scope.currentUser = currentUser;
    $scope.trip = Trips.find($stateParams.id);
    $scope.editTripModal = null;
    $scope.editDestinationModal = null;
    $scope.newDestination=null;
    $scope.newDestinationDetails=null;
    $scope.reordering = false;
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

    $scope.overviewItems = [
    { title: 'Distance', icon: 'ion-model-s', key: 'total_distance', type: 'distance' },
    { title: 'Travel Time', icon: 'ion-clock', key: 'total_travel_time', type: 'duration' },
    { title: 'Duration', icon: 'ion-calendar', key: 'total_duration', type: 'duration' }
    ];

    $scope.doRefresh = function() {
      $scope.trip = Trips.find($stateParams.id);
      setTimeout(function() {
       $scope.trip.$loaded().then(function() {
         $scope.calculateRoute();
         $scope.$broadcast('scroll.refreshComplete');
       });
     }, 1000);
    }

    $scope.hasNewDate = function(idx) {
      var prev = this.trip.destinations[idx-1];
      var cur = this.trip.destinations[idx];

      if(!hasDate(cur)) return false;
      if(!hasDate(prev)) return true;

      return ((prev.depart && prev.depart.date) !== (cur.arrive && cur.arrive.date));
    }
    $scope.hasOldDate = function(idx) {
      var prev = this.trip.destinations[idx-1];
      var cur = this.trip.destinations[idx];

      if(!hasDate(cur)) return false;
      if(!hasDate(prev)) return false;

      return ( (prev.depart && prev.depart.date) === (cur.arrive && cur.arrive.date));
    }

    function hasDate(dst) {
      if(!dst) return false;
      return ((dst.arrive && dst.arrive.date)
        || (dst.depart && dst.depart.date));
    }

 /****************************************************************************
  * Trip management
  */
  $scope.reorderDestinations = function(dst, fromIdx, toIdx){
    this.trip.destinations.splice(toIdx, 0, this.trip.destinations.splice(fromIdx, 1)[0]);
    this.trip.$save().then(function() {
      $scope.calculateRoute()
    });
  }
  $scope.modifyDestination = function(idx) {
    $scope.modifyingIdx = idx;
    $ionicListDelegate.closeOptionButtons();
  }
  $scope.toggleReordering = function() {
    $scope.reordering = !$scope.reordering;
  }
  $scope.clearDestination = function() {
    this.reordering = false;
    this.newDestination = null;
    this.newDestinationDetails = null;
  }
  $scope.saveTravelMode = function() {
    var idx = this.destinationIdx;
    var prev = $scope.trip.destinations[idx-1];
    var cur = $scope.trip.destinations[idx];

    if(cur.travel.type === 'none') {
      cur.travel.duration = 0;
      cur.travel.distance = null;
      cur.travel.hours = null;
      cur.travel.minutes = null;
    }

    // First try to propogate forward from previous destination
    this.propagateTimingsForward(idx, prev);
    // Then try to go the other way
    this.propagateTimingsBack(idx-1, cur);

    return this.calculateRoute();
  };

  $scope.addDestination = function(place, details, idx) {
    $scope.reordering = false;
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

    // RDN 22-NOV-2015. These are now getters, maybe they were just properties back in the day
    details.geometry.location = {
      lat: details.geometry.location.lat(),
      lng: details.geometry.location.lng(),
    }

    var newDestinationInfo = { name: newDestinationDetails.name, details: details, travel: {type: 'drive'} };
    if(!idx || !this.trip.destinations[idx]) {
      this.trip.destinations.push(newDestinationInfo);
    } else {
      this.trip.destinations[idx] = newDestinationInfo;
    }
    this.trip.$save().then(function(){
      $scope.modifyingIdx = null;
      that.newDestinationDetails = null;
      that.newDestination = '';
      that.calculateRoute();
    })
  }
  $scope.removeDestination = function(destinationIdx) {
    if(typeof destinationIdx !== 'number' || destinationIdx < 0 || destinationIdx >= this.trip.destinations.length) return;

    this.trip.destinations.splice(destinationIdx, 1); // Remove 1 element from destinationIdx
    this.trip.$save().then(function() {
      $scope.calculateRoute()
    });
  }
  $scope.propagateTimings = function(idx) {
   if(idx < 0 || idx >= this.trip.destinations.length) return true;

   var dest = this.trip.destinations[idx];
   if(idx > 0 && dest.arrive && dest.arrive.date) this.propagateTimingsBack(idx - 1, dest);
   if(idx < (this.trip.destinations.length-1) && dest.depart && dest.depart.date) this.propagateTimingsForward(idx + 1, dest);

   console.log("post propagation: ", this.trip.destinations);

   var startDateTime, endDateTime;
   angular.forEach(this.trip.destinations, function(dest) {
        // Get first date/time
        if(!startDateTime) {
         if(dest.arrive && dest.arrive.date) {
          startDateTime = new Date(dest.arrive.date + ' ' + (dest.arrive.time || ''));
        } else if(dest.depart && dest.depart.date) {
          startDateTime = new Date(dest.depart.date + ' ' + (dest.depart.time || ''));
        }
      }
        // Get last date/time
        if(dest.depart && dest.depart.date) {
          endDateTime = new Date(dest.depart.date + ' ' + (dest.depart.time || ''));
        } else if(dest.arrive && dest.arrive.date) {
          endDateTime = new Date(dest.arrive.date + ' ' + (dest.arrive.time || ''));
        }
      });
   this.trip.total_duration = !(endDateTime && startDateTime) ? null : (endDateTime.valueOf() - startDateTime.valueOf())/1000;
   return true;
 }
 $scope.propagateTimingsForward = function(idx, triggeringDestination) {
   if(idx < 0 || idx >= this.trip.destinations.length || !triggeringDestination.depart || !triggeringDestination.depart.date) return true;
   var destination = this.trip.destinations[idx];

   if(triggeringDestination.depart.time && triggeringDestination.depart.type !== 'propagate') {
     destination.arrive = destination.arrive || {};
     destination.arrive.disabled = true;
     destination.arrive.type = 'propagate';
     var prevDestDepartDateTime = new Date(triggeringDestination.depart.date + ' ' + (triggeringDestination.depart.time || ''))
     var arriveDateTime = new Date(prevDestDepartDateTime.valueOf()
       + ( (destination.travel.hours || 0)*60 + (destination.travel.minutes || 0))*60*1000
       );
     destination.arrive.date = $filter('date')(arriveDateTime, 'yyyy-MM-dd');
     destination.arrive.time = $filter('date')(arriveDateTime, 'HH:mm');
   }
   this.trip.destinations[idx] = this.updateTiming(destination);
   if(destination.depart && destination.depart.date) return this.propagateTimingsForward(idx + 1, destination);
   else return true;
 }
 $scope.propagateTimingsBack = function(idx, triggeringDestination) {
   if(idx < 0 || idx >= this.trip.destinations.length || !triggeringDestination.arrive || !triggeringDestination.arrive.date) return true;
   var destination = this.trip.destinations[idx];

   if(triggeringDestination.arrive.time && triggeringDestination.arrive.type !== 'propagate') {
     destination.depart = destination.depart || {};
     destination.depart.disabled = true;
     destination.depart.type = 'propagate';
     var prevDestDepartDateTime = new Date(triggeringDestination.arrive.date + ' ' + (triggeringDestination.arrive.time || ''))
     var departDateTime = new Date(prevDestDepartDateTime.valueOf()
       - ( (triggeringDestination.travel.hours || 0)*60 + (triggeringDestination.travel.minutes || 0))*60*1000
       );
     destination.depart.date = $filter('date')(departDateTime, 'yyyy-MM-dd');
     destination.depart.time = $filter('date')(departDateTime, 'HH:mm');
   }
   this.trip.destinations[idx] = this.updateTiming(destination);
   if(destination.arrive && destination.arrive.date) return this.propagateTimingsBack(idx - 1, destination);
   else return true;
 }

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
  $scope.selectTravel = function(destinationIdx) {
    $scope.destinationIdx = destinationIdx;
    $scope.destination = $scope.trip.destinations[destinationIdx];
    $scope.selectTravelModal.show();
  }
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

    if(destination.arrive && destination.arrive.date && destination.arrive.type !== 'auto') {
      // User set the arrive time, so check and possibly set one of the others
      arriveSet = true;
    }
    if(destination.stay && (destination.stay.days || destination.stay.hours || destination.stay.minutes) && destination.stay.type !== 'auto') {
      // User set the stay time, so check and possibly set one of the others
      staySet = true;
    }
    if(destination.depart && destination.depart.date && destination.depart.type !== 'auto') {
      // User set the depart time, so check and possibly set one of the others
      departSet = true;
    }

    if(arriveSet && staySet && departSet) {
      // Contradiction! Clear depart
      destination.depart = {};
      departSet = false;
    }

    // Clear auto-set values
    function xor(a,b) { return a ? !b : b; }
    if( xor(arriveSet, staySet) && typeof destination.depart === 'object' && destination.depart.type === 'auto') {
     destination.depart = {};
   } else if( xor(arriveSet, departSet) && typeof destination.stay === 'object' && destination.stay.type === 'auto') {
     destination.stay = {};
   } else if( xor(departSet, staySet) && typeof destination.arrive === 'object' && destination.arrive.type === 'auto') {
     destination.arrive = {};
   }

    // Auto-set values
    if(arriveSet && staySet) {
      destination.depart = destination.depart || {};
      destination.depart.disabled = true;
      destination.depart.type = 'auto';
      var arriveDateTime = new Date(destination.arrive.date + ' ' + (destination.arrive.time || ''))
      var departDateTime = new Date(arriveDateTime.valueOf()
        + (destination.stay.days || 0)*_MS_PER_DAY
        + (destination.stay.hours || 0)*_MS_PER_HOUR
        + (destination.stay.minutes || 0)*_MS_PER_MINUTE
        );
      destination.depart.date = $filter('date')(departDateTime, 'yyyy-MM-dd');
      destination.depart.time = $filter('date')(departDateTime, 'HH:mm');
    } else if(arriveSet && departSet && destination.arrive.time && destination.depart.time) {
      destination.stay = destination.stay || {};
      destination.stay.disabled = true;
      destination.stay.type = 'auto';
      destination.stay.days = $scope.diffDays(destination.arrive.date, destination.depart.date);

      var arriveHours = parseInt(destination.arrive.time ? destination.arrive.time.split(':')[0] : 0);
      var arriveMinutes = parseInt(destination.arrive.time ? destination.arrive.time.split(':')[1] : 0);

      var departHours = parseInt(destination.depart.time ? destination.depart.time.split(':')[0] : 0);
      var departMinutes = parseInt(destination.depart.time ? destination.depart.time.split(':')[1] : 0);

      destination.stay.hours = departHours - arriveHours;
      destination.stay.minutes = departMinutes - arriveMinutes;
      if(destination.stay.minutes < 0) {
       destination.stay.hours--;
       destination.stay.minutes += 60;
     }
     if(destination.stay.hours < 0) {
       destination.stay.days--;
       destination.stay.hours += 24;
     }

   } else if(staySet && departSet) {
    if(!destination.arrive) destination.arrive = {};
    destination.arrive.disabled = true;
    destination.arrive.type = 'auto';
    var departDateTime = new Date(destination.depart.date + ' ' + (destination.depart.time || ''))
    var arriveDateTime = new Date(departDateTime.valueOf()
      - (destination.stay.days || 0)*_MS_PER_DAY
      - (destination.stay.hours || 0)*_MS_PER_HOUR
      - (destination.stay.minutes || 0)*_MS_PER_MINUTE
      );
    destination.arrive.date = $filter('date')(arriveDateTime, 'yyyy-MM-dd');
    destination.arrive.time = $filter('date')(arriveDateTime, 'HH:mm');
  }
  return destination;
}

  // init the popover
  $ionicModal.fromTemplateUrl('templates/destinations/travel.modal.html', {
    scope: $scope,
  }).then(function(modal) {
    console.log("initialize travel-select modal");
    $scope.selectTravelModal = modal;
  });
  //Cleanup the popover when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.selectTravelModal.remove();
  });

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
  $scope.getRoute = function(destinations) {
    var deferred = $q.defer();
    var count = 0;
    if(destinations && (count = destinations.length) > 1) {
      var origin = destinations[0].details.formatted_address;
      var destination = destinations[count-1].details.formatted_address;
      var waypoints = destinations.slice(1, count - 1).map(function(destination) {
        return destination.details.formatted_address;
      });
      Gmap.getRoute(origin, destination, waypoints, function(response) {
        if(!response) return deferred.reject(new Error('No route found'));
        if(response.status !== 'OK') return deferred.reject();
        return deferred.resolve(response);
      });
      return deferred;
    }
  }

  $scope.calculateRoute = function() {
    // First split into independent, contiguous driving portions
    var info = $scope.trip.destinations.reduce(function(acc, dst, idx) {

      // End of prev portion. Beginning of next
      if(!dst.travel || dst.travel.type !== 'drive') {
        if(acc.thisPortion.length > 1) {
          acc.portions.push(acc.thisPortion);
          acc.portionIdxs.push(acc.thisPortionIdx);
          acc.thisPortion = [dst];
          acc.thisPortionIdx = idx;
        }
        return acc;
      }

      // Continues from previous
      acc.thisPortion.push(dst);
      return acc;
    }, {thisPortion:[], thisPortionIdx: 0, portions: [], portionIdxs: []});

    if(info.thisPortion.length > 1) {
      info.portions.push(info.thisPortion);
      info.portionIdxs.push(info.thisPortionIdx);
    }
    var portions = info.portions;
    var portionIdxs = info.portionIdxs;

    // TODO: Make N of these calls for N legs of contiguous driving destinations
    var routePromises = portions.map(function getPortionRoute(portion, idx) {
      var portionIdx = portionIdxs[idx];

      return $scope.getRoute(portion).promise
      .catch(function(err) {
        // Swallow Gmap errors...
      })
      .then(function(response) {
        var travelInfo = {total_travel_time: 0, total_distance: 0};
        if(!response) return travelInfo;

        $scope.trip.destinations[portionIdx].travel = {type: 'none'};
        $scope.trip.destinations[portionIdx].distance = '';

        travelInfo.total_travel_time = 0;
        travelInfo.total_distance = 0;
        for(var j=1; j < portion.length; j++) {
          var i = portionIdx + j; // Use the portion offset
          if(typeof $scope.trip.destinations[i].travel !== 'object' || !$scope.trip.destinations[i].travel) {
            $scope.trip.destinations[i].travel  = (j <= 0) ? null : {type: 'none'};
          }
          var duration = response.routes[0].legs[j-1].duration.value;
          $scope.trip.destinations[i].travel.hours = Math.floor(duration/60/60)
          $scope.trip.destinations[i].travel.minutes = Math.floor(duration/60) % 60;
          $scope.trip.destinations[i].travel.distance = $filter('metersToMiles')(response.routes[0].legs[j-1].distance.value);
          $scope.trip.destinations[i].travel.type = 'drive';

          travelInfo.total_travel_time += response.routes[0].legs[j-1].duration.value;
          travelInfo.total_distance += response.routes[0].legs[j-1].distance.value;

          return travelInfo;
        }

      });
});

return $q.all(routePromises)
.then(function(routeResults) {
  console.log("Updated routes for all legs of trip: ", routeResults);
  $scope.trip.total_distance = 0;
  $scope.trip.total_travel_time = 0;

  routeResults.forEach(function accumulateTotalTravelInfo(travelInfo) {
    $scope.trip.total_distance += travelInfo.total_distance
    $scope.trip.total_travel_time += travelInfo.total_travel_time;
  })
  $scope.trip.$save();
})
.catch(function(err) {
  console.log("Problem updating routes for all legs of trip: ", err);
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


