'use strict';

angular.module('synctrip.service.trips', [])
.factory('Trips', ['$q', '$firebase', 'fbutil',
  function($q, $firebase, fbutil) {
    return {
      collection: function(user, cb) {
        Firebase.util.logLevel(true);
        var ref = new Firebase.util.intersection( fbutil.ref('/users/'+user.uid+'/trips'), fbutil.ref('/trips') );
        // var ref = fbutil.ref('/users/'+user.uid+'/trips')
        // magic!
        return $firebase(ref).$asArray();
      }
      , find: function(tripId) {
        if(!tripId || tripId.length == 0) return null;
        console.log("FIND ",tripId);
        return fbutil.syncObject('/trips/'+tripId);
      }
      , create: function(trip, owner, cb) {
        console.log("Trips services create: ", trip, owner);

        var ref = fbutil.ref('/trips');
        $firebase(ref).$push({
          name: trip.name,
          ownerId: owner.uid
        }).then(function(res) {
          var ownerRef = fbutil.ref('/users/'+owner.uid+'/trips');
          $firebase(ownerRef).$set(res.name(), 1);   // Key for the new ly created record
        }/*, error handler */);
        return
      }
      , leave: function(tripId, user) {
        if(!tripId || tripId.length === 0 || typeof user !== 'object' || !user.uid || user.uid.length === 0) return null;
        var that = this;
        console.log("LEAVE ",tripId, userId);
        return fbutil.ref('/users/'+user.uid+'/trips/'+tripId).remove();
      }
      , remove: function(tripId, user) {
        if(!tripId || tripId.length == 0) return null;
        var that = this;
        console.log("REMOVE ",tripId);
        return fbutil.ref('/trips/'+tripId).remove(function() { that.leave(tripId, user) });
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
