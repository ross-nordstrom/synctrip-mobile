'use strict';

angular.module('synctrip.service.trips', [])
.factory('Trips', ['$q', '$firebase',
  function($q, $firebase) {
    return {
      collection: function(user, cb) {
        var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+user.uid+'/trips'), FireRef.trips());
        return $firebase(indexedTrips);
      }
      , find: function(tripId) {
        console.log("FIND ",tripId);
        return FireRef.trips().child(tripId);
      }
      , create: function(trip, owner, cb) {
        var deferred = $q.defer();
        var name = FireRef.trips().push({
          name: trip.name,
          ownerId: owner.uid
        }, cb).name()

        // Index it so it will show up in the 'owner's list of trips
        // 'name' contains the pushed data's Firebase ID
        var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+owner.uid+'/trips'), FireRef.trips());
        indexedTrips.add(name, function(err) {
          console.log("NEW TRIP INDEXED! Errors? ", err)
        });

        deferred.resolve(name);
        return deferred.promise;
      }
      , removeTrip: function(tripId) {
        console.log("REMOVE ", tripId)

        var trip = FireRef.trips().child(tripId);
        trip.once('value', function(dataSnapshot) {
          var trip = dataSnapshot.val();
          console.log("   TRIP => ", trip, trip.admins, trip.collaborators);
          for(var admin in trip.admins) {
            console.log("      Admin ", admin);
            var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+admin+'/trips'), FireRef.trips());
            indexedTrips.drop(tripId);
          }
          for(var collaborator in trip.collaborators) {
            console.log("      Admin ", collaborator);
            var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+collaborator+'/trips'), FireRef.trips());
            indexedTrips.drop(tripId);
          }
        })

        var trip = this.find(tripId);
        trip.once('value',function(dataSnapshot) {
          // Remove the index to this from the owner
          var ownerId = dataSnapshot.val().ownerId;
          var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+ownerId+'/trips'), FireRef.trips());
          indexedTrips.drop(tripId);
        })
        trip.remove();
        return;
      }
      , collaborators: function(tripId) {
        var indexedCollaborators = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/collaborators'), FireRef.users());
        return $firebase(indexedCollaborators);
      }
      , addCollaborator: function(tripId, userId) {
        // Index that user on the trip as a collaborator
        var indexedCollaborators = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/collaborators'), FireRef.users());
        if(!!indexedCollaborators) {
          indexedCollaborators.add(userId, function(err) {
            if(!err) {
              // And if successful, index that trip on the user as one of their trips
              var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+userId+'/trips'), FireRef.trips());
              indexedTrips.add(tripId);

              // Admin and collaborator are MUTUALLY EXCLUSIVE
              console.log("ADD COLLABORATOR --- WAIT!!! Are they an admin?")
              FireRef.trips().child('/'+tripId+'/admins').child(userId).once('value', function(snap) {
                console.log("   SNAP ", snap, snap.val())
                if(!!snap && !!snap.val()) {
                  console.log("   YES THEY ARE...")
                  var indexedAdmins = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/admins'), FireRef.users());
                  if(!!indexedAdmins) {
                    indexedAdmins.drop(userId, function(err) {
                      if(!!err) {
                      // Couldn't remove them from Admin role, so undo the addCollaborator
                      console.log("   ERROR ADDING COLLABORATOR ==> ", err);
                      indexedCollaborators.drop(userId);
                    }
                  });
                  }
                } else {
                  console.log("   NOT AN ADMIN!")
                }
              });
            }
          });
}

return;
}
, removeCollaborator: function(tripId, userId) {
        // Index that user on the trip as a collaborator
        var indexedCollaborators = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/collaborators'), FireRef.users());
        if(!!indexedCollaborators) {
          indexedCollaborators.drop(userId, function(err) {
            if(!err) {
              // And if successful, index that trip on the user as one of their trips
              var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+userId+'/trips'), FireRef.trips());
              indexedTrips.drop(tripId);
            }
          });
        }
        return;
      }
      , admins: function(tripId) {
        var indexedAdmins = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/admins'), FireRef.users());
        return $firebase(indexedAdmins);
      }
      , addAdmin: function(tripId, userId) {
        // Index that user on the trip as a admin
        var indexedAdmins = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/admins'), FireRef.users());
        if(!!indexedAdmins) {
          indexedAdmins.add(userId, function(err) {
            if(!err) {
              // And if successful, index that trip on the user as one of their trips
              var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+userId+'/trips'), FireRef.trips());
              indexedTrips.add(tripId);

              // Admin and collaborator are MUTUALLY EXCLUSIVE
              var indexedCollaborators = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/collaborators'), FireRef.users());
              if(!!indexedCollaborators) {
                indexedCollaborators.drop(userId);
              }
            }
          });
        }
        return;
      }
      , removeAdmin: function(tripId, userId) {
        // Index that user on the trip as a admin
        var indexedAdmins = new FirebaseIndex(FireRef.trips().child('/'+tripId+'/admins'), FireRef.users());
        if(!!indexedAdmins) {
          indexedAdmins.drop(userId, function(err) {
            if(!err) {
              // And if successful, index that trip on the user as one of their trips
              var indexedTrips = new FirebaseIndex(FireRef.users().child('/'+userId+'/trips'), FireRef.trips());
              indexedTrips.drop(tripId);
            }
          });
        }
        return;
      }
    };
  }])
