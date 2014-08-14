// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('synctrip', ['ionic', 'firebase.utils', 'synctrip.config', 'simpleLogin', 'synctrip.filters', 'synctrip.services', 'synctrip.directives', 'synctrip.controllers',
 'routeSecurity'])

.run(['$ionicPlatform', 'loginService', '$rootScope', 'FBURL', function($ionicPlatform, loginService, $rootScope, FBURL) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    if( FBURL === 'https://INSTANCE.firebaseio.com' ) {
       // double-check that the app has been configured
       angular.element(document.body).html('<h1>Please configure app/js/config.js before running!</h1>');
       setTimeout(function() {
          angular.element(document.body).removeClass('hide');
       }, 250);
    }
    else {
       // establish authentication
       //$rootScope.auth = loginService.init('/');
       $rootScope.FBURL = FBURL;
    }
  });
}])

.config(function($stateProvider, $urlRouterProvider) {
  var resolveUser = {
    // controller will not be invoked until getCurrentUser resolves
    "currentUser": ["simpleLogin", function(simpleLogin) {
      // simpleLogin refers to our $firebaseSimpleLogin wrapper in the example above
      // since $getCurrentUser returns a promise resolved when auth is initialized,
      // we can simple return that here to ensure the controller waits for auth before
      // loading
      return simpleLogin.getUser();
    }]
  };

  $stateProvider
    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html"
    })

    .state('app.welcome', {
      url: "/welcome",
      views: {
        'main': {
          templateUrl: "templates/welcome.html"
        },
        'left': {
          templateUrl: "templates/publicLeft.html"
        },
        'right': {
          templateUrl: "templates/accountMenu.html",
          controller: 'AccountCtrl'
        }
      },
      resolve: resolveUser
    })

    .state('app.about', {
      url: "/about",
      views: {
        'main': {
          templateUrl: "templates/about.html"
        },
        'left': {
          templateUrl: "templates/publicLeft.html"
        },
        'right': {
          templateUrl: "templates/accountMenu.html",
          controller: 'AccountCtrl'
        }
      },
      resolve: resolveUser
    })

    .state('app.trips', {
      url: "/trips",
      authRequired: true,
      views: {
        'main': {
          templateUrl: "templates/trips.html",
          controller: 'TripsCtrl'
        },
        'left': {
          templateUrl: "templates/demoSide.html"
        },
        'right': {
          templateUrl: "templates/accountMenu.html",
          controller: 'AccountCtrl'
        }
      },
      resolve: resolveUser
    })

    .state('app.tripDetail', {
      url: "/trips/:id",
      authRequired: true,
      views: {
        'main': {
          templateUrl: "templates/trip.html",
          controller: 'TripCtrl'
        },
        'left': {
          templateUrl: "templates/demoSide.html"
        },
        'right': {
          templateUrl: "templates/accountMenu.html",
          controller: 'AccountCtrl'
        }
      },
      resolve: resolveUser
    })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/welcome');
});

