'use strict';

angular.module('synctrip.service.gmaps', [])
.factory('Gmap', ['$rootScope', '$http',
  function($rootScope, $http) {
    if(!$rootScope.routeService) {
      $rootScope.routeService = new google.maps.DirectionsService();
    }

    return {
      getRoute: function(origin, destination, waypoints, callback) {
        var request = this.composeRouteRequest(origin, destination, waypoints);
        if(request) {
          this.routeApiCall(request, callback);
        } else {
          callback && callback(null);
        }
      },

      composeRouteRequest: function(origin, destination, waypoints) {
        var request = null;
        var wps = [];
        for(var i=0; i < waypoints.length; i++) {
          wps.push({
            location: waypoints[i],
            stopover: true
          });
        }

        if(!!origin && !!destination) {
          request = {
            origin:       origin,//.split(" ").join(""),
            destination:  destination,//.split(" ").join(""),
            waypoints:    wps,
            travelMode:   google.maps.TravelMode.DRIVING
          };
        }
        return request;
      },

      durationString: function(seconds) {
        var days = Math.floor(seconds/60/60/24);
        var hours = Math.floor(seconds/60/60) % 24;
        var min = Math.floor(seconds/60) % 60;

        var str = '';
        if(days == 1) { str += days+" day "; }
        else if(days > 1) { str += days + " days ";}

        if(hours == 1) { str += hours+" hour "; }
        else if(hours > 1) { str += hours + " hours ";}

        if(min == 1) { str += min+" min"; }
        else if(min > 1) { str += min + " mins";}

        return str;
      },

      distanceString: function(meters) {
        var METERS_TO_MILES = 0.000621371192;
        var str = (Math.round( meters * METERS_TO_MILES * 10 ) / 10) + ' mi';
        return str;
      },

      routeApiCall: function(request, callback) {
        if(!!$rootScope.routeService) {
          $rootScope.routeService.route(request, function(response, status) {
            if(status == google.maps.DirectionsStatus.OK) {
              callback && callback(response);
            } else {
              callback && callback(null);
            }
          });
        } else {
          console.error("Can't call google maps api... DirectionsService not set up");
        }
      }
    }
  }]);