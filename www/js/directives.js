'use strict';

 angular.module('synctrip.directives', []).
 directive('eatClick', [ function () {
  return {
    restrict:"EAC",
    link:function (scope, elm, attrs) {
     angular.element(elm).bind('click', function(event){
      console.log("Prevent default behavior!");
      event.stopPropagation();
    });
   }
 }
}])