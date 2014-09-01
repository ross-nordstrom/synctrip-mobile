'use strict';

/* Filters */

angular.module('synctrip.filters', [])
   .filter('interpolate', ['version', function(version) {
      return function(text) {
         return String(text).replace(/\%VERSION\%/mg, version);
      }
   }])

   .filter('reverse', function() {
      function toArray(list) {
         var k, out = [];
         if( list ) {
            if( angular.isArray(list) ) {
               out = list;
            }
            else if( typeof(list) === 'object' ) {
               for (k in list) {
                  if (list.hasOwnProperty(k)) { out.push(list[k]); }
               }
            }
         }
         return out;
      }
      return function(items) {
         return toArray(items).slice().reverse();
      };
   })

   .filter('durationString', function() {
      return function(seconds, brief) {
        seconds = parseInt(seconds);
        var days = Math.floor(seconds/60/60/24);
        var hours = Math.floor(seconds/60/60) % 24;
        var min = Math.floor(seconds/60) % 60;

        var str = '';
        if(brief) {
           if(days > 0) { str += days+"d, "; }
           if(days > 0 || hours > 0) { str += hours+":"; }
           if(min < 10) { str += "0"; }
           if(days > 0 || hours > 0) { str += min+" hr"; }
           else { str += min+" min"; }
        } else {
           if(days == 1) { str += days+" day "; }
           else if(days > 1) { str += days + " days ";}

           if(hours == 1) { str += hours+" hour "; }
           else if(hours > 1) { str += hours + " hours ";}

           if(min == 1) { str += min+" min"; }
           else if(min > 1) { str += min + " mins";}
        }
        return str;
      };
   })

   .filter('distanceString', function() {
      var METERS_TO_MILES = 0.000621371192;
      return function(meters) {
         meters = parseFloat(meters);
        var accuracy = meters > 30 ? 1 : 10;
        var str = (Math.round( meters * METERS_TO_MILES * accuracy ) / accuracy) + ' mi';
        return str;
      }
   })

   .filter('prettyUnits', function(durationStringFilter, distanceStringFilter) {
      return function(value, type) {
        switch(type) {
            case 'duration':
               return durationStringFilter(value);
               break;
            case 'distance':
               return distanceStringFilter(value);
               break;
            default:
               return value;
               break;
        }
      }
   })