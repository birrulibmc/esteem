module.exports = function (app) {
//angular.module('steem.controllers', [])

app.controller('AppCtrl', function($scope, $ionicModal, $timeout, $rootScope, $state, $ionicHistory, $cordovaSocialSharing, ImageUploadService, $cordovaCamera, $ionicSideMenuDelegate, $ionicPlatform) {

  $scope.loginData = {};  

  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope  }).then(function(modal) {
    $scope.modal = modal;
  });

  $scope.changeUsername = function(){
    $scope.loginData.username = angular.lowercase($scope.loginData.username);
  }
  $scope.open = function(item) {
    $rootScope.$storage.sitem = item;
    //console.log(item);
    $state.go('app.single');
  };

  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  $scope.login = function() {
    $scope.modal.show();
  };
  $scope.goProfile = function() {
    $state.go("app.profile", {username:$rootScope.$storage.user.username});
    //$ionicSideMenuDelegate.toggleLeft();
  }
  $scope.share = function() {
    var message = "Hey! Checkout blog post on Steemit.com";
    var subject = "Via Steem Mobile";
    var file = null;
    var link = "http://steemit.com"+$rootScope.$storage.sitem?$rootScope.$storage.sitem.url:"";
    $cordovaSocialSharing.share(message, subject, file, link) // Share via native share sheet
    .then(function(result) {
      // Success!
      console.log("shared");
    }, function(err) {
      // An error occured. Show a message to the user
      console.log("not shared");
    });  
  }
  
  $scope.doLogin = function() {
    console.log('Doing login');
    (new Steem(localStorage.socketUrl)).getAccounts([$scope.loginData.username], function(err, dd) {
      //console.log(dd);
      dd = dd[0];
      $scope.loginData.id = dd.id;
      $scope.loginData.owner = dd.owner;
      $scope.loginData.active = dd.active;
      $scope.loginData.reputation = dd.reputation;
      $scope.loginData.posting = dd.posting;
      $scope.loginData.memo_key = dd.memo_key;
      $scope.loginData.post_count = dd.post_count;
      $scope.loginData.voting_power = dd.voting_power;

      $rootScope.$storage.user = $scope.loginData;
      var login = new window.steemJS.Login();
      login.setRoles(["posting"]);
      var loginSuccess = login.checkKeys({
          accountName: $scope.loginData.username,    
          password: $scope.loginData.password,
          auths: {
              posting: [[dd.posting.key_auths[0][0], 1]]
          }}
      );

      if (!loginSuccess) {
          $rootScope.showAlert("Error","The password or account name was incorrect");
      } else {
        $rootScope.$storage.mylogin = login;
      }
      $timeout(function() {
        $state.go('app.posts', {}, { reload: true });
        $scope.closeLogin();
      }, 1000);
    });
  };

  $scope.$on("$ionicView.enter", function(){
    $scope.refreshLocalUserData = function() {
      console.log('refreshLocalUserData');
      if ($rootScope.$storage.user && $rootScope.$storage.user.username) {
        (new Steem(localStorage.socketUrl)).getAccounts([$rootScope.$storage.user.username], function(err, dd) {
          //console.log(dd);
          dd = dd[0];
          if (dd.json_metadata) {
            dd.json_metadata = angular.fromJson(dd.json_metadata);
          }
          angular.merge($rootScope.$storage.user, dd);
        });
      }  
    }
    $scope.refreshLocalUserData();
  });

  // get app version
  $ionicPlatform.ready(function(){
    if (window.cordova) {
      cordova.getAppVersion.getVersionNumber(function (version) {
        $rootScope.$storage.appversion = version;
      });  
    }
  });

  $scope.logout = function() {
    $rootScope.$storage.user = undefined;
    $rootScope.$storage.user = null;
    $rootScope.$storage.mylogin = undefined;
    $rootScope.$storage.mylogin = null;
    //make sure user credentials cleared.
    $ionicSideMenuDelegate.toggleLeft();
    $rootScope.$broadcast("user:logout");
  };
  $scope.data = {};
  $ionicModal.fromTemplateUrl('templates/search.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.smodal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeSmodal = function() {
    $scope.smodal.hide();
  };

  // Open the login modal
  $scope.openSmodal = function() {
    $scope.data.type="tag";
    $scope.smodal.show();
  };
  $scope.clearSearch = function() {
    if ($rootScope.$storage.tag) {
      $rootScope.$storage.tag = "";
      $rootScope.$storage.taglimits = undefined;
      $rootScope.$broadcast('close:popover');
    }
  };
  $scope.showMeExtra = function() {
    if ($scope.showExtra) {
      $scope.showExtra = false;
    } else {
      $scope.showExtra = true;
    }
  }
  $scope.search = function() {
    console.log('Doing search', $scope.data.search);
    $scope.data.search = angular.lowercase($scope.data.search);
    setTimeout(function() {
      if ($scope.data.search.length > 1) {
        if ($scope.data.type == "tag"){
          (new Steem(localStorage.socketUrl)).getTrendingTags($scope.data.search, 10 , function(err, result) {
            var ee = [];
            if (result){
              for (var i = result.length - 1; i >= 0; i--) {
                if (result[i].tag.indexOf($scope.data.search) > -1){
                  ee.push(result[i]);
                }
              }
              $scope.data.searchResult = ee;
            }
            //console.log(result);
            //console.log(err);
            if (!$scope.$$phase) {
              $scope.$apply();
            }
          });  
        }
        if ($scope.data.type == "user"){
          var ee = [];
          (new Steem(localStorage.socketUrl)).lookupAccounts($scope.data.search, 10, function(err, result) {
            if (result){
              $scope.data.searchResult = result;
            }
              //console.log(result);
              //console.log(err);  
              if (!$scope.$$phase) {
                $scope.$apply();
              }
          });  
        }
        
      }
    }, 500);
    
  };
  $scope.typechange = function() {
    $scope.data.searchResult = undefined;
    console.log("changing search type");
  }
  $scope.openTag = function(xx, yy) {
    console.log("opening tag "+xx);
    $rootScope.$storage.tag = xx;
    $rootScope.$storage.taglimits = yy;
    $scope.closeSmodal();
    $rootScope.$broadcast('close:popover');
    $state.go("app.posts", {}, {reload:true});
  };
  $scope.openUser = function(xy) {
    console.log("opening user "+xy);
    $scope.closeSmodal();
    $rootScope.$broadcast('close:popover');
    $state.go("app.profile", {username: xy});
  };
  $scope.testfunction = function() {
    window.Api.database_api().exec("get_account_history", [$rootScope.$storage.user.username, -1, 25]).then(function(response){
      console.log(response)
    });
  }
  


})
app.controller('SendCtrl', function($scope, $rootScope, $state, $ionicPopup, $ionicPopover, $interval, $filter, $q, $timeout) {
  $scope.data = {type: "steem", amount: 0.001};
  $scope.changeUsername = function(typed) {
    console.log('searching');
    window.Api.database_api().exec("lookup_account_names", [[$scope.data.username]]).then(function(response){
      $scope.users = response[0]; 
      if (!$scope.$$phase) {
        $scope.$apply();
      }
    });
  }

  $scope.transfer = function () {
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
      if ($scope.data.type === 'sbd') {
        if ($scope.data.amount > Number($scope.balance.sbd_balance.split(" ")[0])) {
          $rootScope.showAlert("Warning", "Make sure you have enough balance for transaction!");          
        } else {
          $scope.okbalance = true;
        }
      }
      if ($scope.data.type === 'sp' || $scope.data.type === 'steem') {
        if ($scope.data.amount > Number($scope.balance.balance.split(" ")[0])) {
          $rootScope.showAlert("Warning", "Make sure you have enough balance for transaction!");          
        } else {
          $scope.okbalance = true;
        }
      }
      if (!$scope.users || $scope.users.name !== $scope.data.username) {
        $rootScope.showAlert("Warning", "User you are trying to transfer fund, doesn't exist!");
      } else {
        $scope.okuser = true;
      }
      if ($scope.okbalance && $scope.okuser) {
        var confirmPopup = $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you want to transfer?'
        });

      confirmPopup.then(function(res) {
        if(res) {
          console.log('You are sure');
          $rootScope.$broadcast('show:loading');
          $scope.mylogin = new window.steemJS.Login();
          $scope.mylogin.setRoles(["active"]);
          //console.log($rootScope.$storage.user.active.key_auths[0][0]);
          var loginSuccess = $scope.mylogin.checkKeys({
              accountName: $rootScope.$storage.user.username,    
              password: $rootScope.$storage.user.password,
              auths: {
                active: $rootScope.$storage.user.active.key_auths
              }}
          );
          if (loginSuccess) {
            //console.log($scope.mylogin);
            var tr = new window.steemJS.TransactionBuilder();
            if ($scope.data.type !== 'sp') {

              var tt = $filter('number')($scope.data.amount) +" "+angular.uppercase($scope.data.type);
              tr.add_type_operation("transfer", {
                from: $rootScope.$storage.user.username,
                to: $scope.data.username,
                amount: tt,
                memo: $scope.data.memo || ""
              });
              localStorage.error = 0;
              tr.process_transaction($scope.mylogin, null, true);  
              setTimeout(function() {
                if (localStorage.error == 1) {
                  $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
                } else {
                  $rootScope.showAlert("Info", "Transaction is broadcasted").then(function(){
                    $scope.data = {type: "steem", amount: 0.001};
                  });
                }
              }, 2000);
            } else {
              console.log($scope.data);
              var tt = $filter('number')($scope.data.amount) +" STEEM";
              tr.add_type_operation("transfer_to_vesting", {
                from: $rootScope.$storage.user.username,
                to: $scope.data.username,
                amount: tt
              });
              localStorage.error = 0;
              tr.process_transaction($scope.mylogin, null, true);
              setTimeout(function() {
                if (localStorage.error == 1) {
                  $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
                } else {
                  $rootScope.showAlert("Info", "Transaction is broadcasted").then(function(){
                    $scope.data = {type: "steem", amount: 0.001};
                  });
                }
              }, 2000);
             
            }
          }
          $rootScope.$broadcast('hide:loading');
         } else {
           console.log('You are not sure');
         }
        });
      }
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Transfer");
    }
  };
  $scope.refresh = function() {
    (new Steem(localStorage.socketUrl)).getAccounts([$rootScope.$storage.user.username], function(err, dd) {   
      $scope.balance = dd[0];
    });
  }
  $scope.$on('$ionicView.beforeEnter', function(){
    (new Steem(localStorage.socketUrl)).getAccounts([$rootScope.$storage.user.username], function(err, dd) {   
      $scope.balance = dd[0];
      if (!$scope.$$phase){
        $scope.$apply();
      }
    });
  });

});
app.controller('PostsCtrl', function($scope, $rootScope, $state, $ionicPopup, $ionicPopover, $interval, $ionicScrollDelegate, $ionicModal, $filter) {

  $rootScope.$on('filter:change', function() {
    $rootScope.$broadcast('show:loading');
    console.log($rootScope.$storage.filter)
    var type = $rootScope.$storage.filter || "trending";
    var tag = $rootScope.$storage.tag || "";
    $scope.fetchPosts(type, $scope.limit, tag);  
  });
  function slug(text) {
    return getSlug(text, {truncate: 128});
  };
  function createPermlink(title) {
    var permlink;
    var t = new Date();
    var timeformat = t.getFullYear().toString()+(t.getMonth()+1).toString()+t.getDate().toString()+"t"+t.getHours().toString()+t.getMinutes().toString()+t.getSeconds().toString()+t.getMilliseconds().toString()+"z";
    if (title && title.trim() !== '') {
      var s = slug(title);
      permlink = s.toString()+"-"+timeformat;
      if(permlink.length > 255) {
        // STEEMIT_MAX_PERMLINK_LENGTH
        permlink = permlink.substring(permlink.length - 255, permlink.length)
      }
      // only letters numbers and dashes shall survive
      permlink = permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '')
      return permlink;
    }
  };
  $scope.submitStorys = function() {
    console.log(createPermlink($scope.spost.title));
    console.log($filter("metadata")($rootScope.$storage.sitem.body));
  }
  $scope.spost = {};
  $scope.tagsChange = function() {
    console.log("tagsChange");
    $scope.spost.category = $scope.spost.tags.split(" ");
    if ($scope.spost.category.length > 5) {
      $scope.disableBtn = true;
    } else {
      $scope.disableBtn = false;
    }
  }
  $scope.submitStory = function() {
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
      $scope.mylogin = new window.steemJS.Login();
      $scope.mylogin.setRoles(["posting"]);
      var loginSuccess = $scope.mylogin.checkKeys({
          accountName: $rootScope.$storage.user.username,    
          password: $rootScope.$storage.user.password,
          auths: {
              posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
          }}
      );
      if (loginSuccess) {
        var tr = new window.steemJS.TransactionBuilder();
        var permlink = createPermlink($scope.spost.title);
        var json = $filter("metadata")($scope.spost.body);
        angular.merge(json, {tags: $scope.spost.category});

        tr.add_type_operation("comment", {
          parent_author: "",
          parent_permlink: $scope.spost.category[0],
          author: $rootScope.$storage.user.username,
          permlink: permlink,
          title: $scope.spost.title,
          body: $scope.spost.body,
          json_metadata: angular.toJson(json)
        });
        //console.log(my_pubkeys);
        localStorage.error = 0;
        tr.process_transaction($scope.mylogin, null, true);
        $scope.closePostModal();
        $scope.replying = false;
        setTimeout(function() {
          $rootScope.$broadcast('hide:loading');
          if (localStorage.error == 1) {
            $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
          } else {
            //$scope.spost.comment = "";  
            $scope.closePopover();
            $state.go("app.profile", {username: $rootScope.$storage.user.username});
          }
        }, 2000);
      } 
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Comment");
    }
  }

  $ionicModal.fromTemplateUrl('templates/story.html', {
    scope: $scope  }).then(function(modal) {
    $scope.modal = modal;
  });
  $scope.openPostModal = function() {
    $scope.modal.show();
  };
  $scope.closePostModal = function() {
    $scope.modal.hide();
  };

  $scope.votePost = function(post) {
    post.invoting = true;
    console.log('upvoting');
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: $rootScope.$storage.voteWeight || 10000
          });
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              post.invoting = false;
              $scope.fetchPosts();
            }
          }, 2000);
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };

  $scope.downvotePost = function(post) {
    post.invoting = true;
    console.log('downvoting');
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: -10000
          });
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              post.invoting = false;
              $scope.fetchPosts();
            }
          }, 2000);
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };

  $scope.unvotePost = function(post) {
    post.invoting = true;
    console.log('unvoting');
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: 0
          });
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              post.invoting = false;
              $scope.fetchPosts();  
            }
          }, 2000);  
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('show:loading');
      $rootScope.showAlert("Warning", "Please, login to UnVote"); 
    }
  };

  $scope.showFilter = function() {
    $scope.fdata = {filter: $rootScope.$storage.filter || "trending"};
    var myPopupF = $ionicPopup.show({
       template: '<ion-radio ng-model="fdata.filter" ng-change="filterchange()" value="hot"><i class="icon" ng-class="{\'ion-flame gray\':fdata.filter!=\'hot\', \'ion-flame positive\': fdata.filter==\'hot\'}"></i> Hot</ion-radio><ion-radio ng-model="fdata.filter" ng-change="filterchange()" value="created"><i class="icon" ng-class="{\'ion-star gray\':fdata.filter!=\'new\', \'ion-star positive\': fdata.filter==\'new\'}"></i> New</ion-radio><ion-radio ng-model="fdata.filter"  ng-change="filterchange()" value="trending"><i class="icon" ng-class="{\'ion-podium gray\':fdata.filter!=\'trending\', \'ion-podium positive\': fdata.filter==\'trending\'}"></i> Trending</ion-radio><ion-radio ng-model="fdata.filter"  ng-change="filterchange()" value="trending30"><i class="icon" ng-class="{\'ion-connection-bars gray\':fdata.filter!=\'trending30\', \'ion-connection-bars positive\': fdata.filter==\'trending30\'}"></i> Trending (30 days)</ion-radio><ion-radio ng-model="fdata.filter"  ng-change="filterchange()" value="active"><i class="icon" ng-class="{\'ion-chatbubble-working gray\':fdata.filter!=\'active\', \'ion-chatbubble-working positive\': fdata.filter==\'active\'}"></i> Active</ion-radio><ion-radio ng-model="fdata.filter"  ng-change="filterchange()" value="cashout"><i class="icon" ng-class="{\'ion-share gray\':fdata.filter!=\'cashout\', \'ion-share positive\': fdata.filter==\'cashout\'}"></i> Cashout</ion-radio><ion-radio ng-model="fdata.filter"  ng-change="filterchange()" value="votes"><i class="icon" ng-class="{\'ion-person-stalker gray\':fdata.filter!=\'votes\', \'ion-person-stalker positive\': fdata.filter==\'votes\'}"></i> Votes</ion-radio><ion-radio ng-model="fdata.filter"  ng-change="filterchange()" value="children"><i class="icon" ng-class="{\'ion-chatbubbles gray\':fdata.filter!=\'children\', \'ion-chatbubbles positive\': fdata.filter==\'children\'}"></i> Comments</ion-radio>',   
       title: 'Sort by',
       scope: $scope
    });
    myPopupF.then(function(res) {
      if (res) {
        $scope.fetchPosts(res[0], null, res[1]);
      }
    });

    $scope.filterchange = function(f){
      console.log($scope.fdata.filter)
      $rootScope.$storage.filter = $scope.fdata.filter;
      myPopupF.close();
      $scope.closePopover();
      $rootScope.$broadcast('filter:change');
    }
  };
  
  $scope.refresh = function(){
    $scope.fetchPosts();
    $scope.closePopover();
    $rootScope.$broadcast('filter:change');
  };
  
  $rootScope.$on("user:logout", function(){
    $scope.refresh();
  });

  $scope.loadMore = function() {
    $rootScope.$broadcast('show:loading');
    $scope.limit += 5;
    if (!$scope.error) {
      $scope.fetchPosts(null, $scope.limit, null);  
    }
  };

  $scope.changeView = function(view) {
    $rootScope.$storage.view = view; 
    $scope.closePopover();
    if (!$scope.$$phase){
      $scope.$apply();
    }
    $rootScope.$broadcast('show:loading');
    $scope.refresh();
    setTimeout(function() {
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollTop();
    }, 10);
    
  }
  function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
  }
  $scope.$watch('data', function(newValue, oldValue){
      //console.log('changed');
      if (newValue) {
        var length = newValue.length;
        if (length < $scope.limit) {
          $scope.noMoreItemsAvailable = true;
        }
        for (var i = 0; i < newValue.length; i++) {
          if ($rootScope.$storage.user){
            for (var j = newValue[i].active_votes.length - 1; j >= 0; j--) {
              if (newValue[i].active_votes[j].voter === $rootScope.$storage.user.username) {
                if (newValue[i].active_votes[j].percent > 0) {
                  newValue[i].upvoted = true;  
                } else if (newValue[i].active_votes[j].percent < 0) {
                  newValue[i].downvoted = true;  
                } else {
                  newValue[i].downvoted = false;  
                  newValue[i].upvoted = false;  
                }
              }
            }
          }
          if ($rootScope.$storage.view == 'card') {
            newValue[i].json_metadata = angular.fromJson(newValue[i].json_metadata?newValue[i].json_metadata:[]);
          }
        }
      }      
      if (!$scope.$$phase){
        $scope.$apply();
      }
  }, true);


  $ionicPopover.fromTemplateUrl('templates/popover.html', {
    scope: $scope,
  }).then(function(popover) {
    $scope.popover = popover;
  });
  
  $scope.openPopover = function($event) {
    $scope.popover.show($event);
  };
  $scope.closePopover = function() {
    $scope.popover.hide();
  };
  $rootScope.$on('close:popover', function(){
    $scope.closePopover();
  });
  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

  $scope.fetchPosts = function(type, limit, tag) {
    type = type || $rootScope.$storage.filter || "trending";
    tag = tag || $rootScope.$storage.tag || "";
    limit = limit || $scope.limit || 5;
    //$rootScope.$broadcast('show:loading');

    var params = {tag: tag, limit: limit, filter_tags: []};
    if ($scope.error) {
      $rootScope.showAlert("Error", "Server returned error, Plese try to change it from Settings");
    } else {
      console.log("fetching..."+type, limit, tag)
      window.Api.database_api().exec("get_discussions_by_"+type, [params]).then(function(response){
        $scope.data = response; 
        //console.log(response);
        $rootScope.$broadcast('hide:loading');
        if (!$scope.$$phase) {
          $scope.$apply();
        }
      });
         
    }
  };
  
  $scope.$on('$ionicView.afterEnter', function(){
    $scope.limit = 7;
    $rootScope.$broadcast('show:loading');
    console.log('enter ');
    if (!$rootScope.$storage.socket) {
      $rootScope.$storage.socket = localStorage.socketUrl;
    }
    if (!$rootScope.$storage.view) {
      $rootScope.$storage.view = 'card';
    }
    if (!$rootScope.$storage.filter) {
      $rootScope.$storage.filter = "trending";
    }
    //console.log(window.Api)
    //$scope.fetchPosts(null, $scope.limit, null);
    window.Api.initPromise.then(function(response) {
      console.log("Api ready:", response);  
      window.Api.database_api().exec("get_dynamic_global_properties", []).then(function(response){
        console.log("get_dynamic_global_properties "+response.head_block_number);
        if ($rootScope.$storage.user) {
          $scope.mylogin = new window.steemJS.Login();
          $scope.mylogin.setRoles(["posting"]);
          var loginSuccess = $scope.mylogin.checkKeys({
              accountName: $rootScope.$storage.user.username,    
              password: $rootScope.$storage.user.password,
              auths: {
                  posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
              }}
          );
          console.log("login "+loginSuccess);
        }          
        $scope.fetchPosts(null, $scope.limit, null);  
      });
    });
    setTimeout(function() {
      $ionicScrollDelegate.$getByHandle('mainScroll').scrollTop();   
    }, 10);
  });
  
  $scope.$on('$ionicView.beforeEnter', function(){
    $rootScope.$broadcast('show:loading');
  })
  $scope.$on('$ionicView.loaded', function(){
    
  });

  if (!angular.isDefined($rootScope.timeint)) {
    $rootScope.timeint = $interval(function(){
      window.Api.database_api().exec("get_dynamic_global_properties", []).then(function(response){
        console.log("get_dynamic_global_properties", response.head_block_number);
      });
    }, 20000);
  }

  $scope.$on('$ionicView.leave', function(){
    if (!$scope.$$phase) {
      $scope.$apply();
    }
  });
  
  //$scope.refresh();   
})

app.controller('PostCtrl', function($scope, $stateParams, $rootScope, $interval, $ionicScrollDelegate, $ionicModal, $filter) {
  $scope.post = $rootScope.$storage.sitem;
  $scope.data = {};
  
  $scope.replying = false;
  


  $scope.reply = function (xx) {
    //console.log(xx);
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
      $scope.mylogin = new window.steemJS.Login();
      $scope.mylogin.setRoles(["posting"]);
      var loginSuccess = $scope.mylogin.checkKeys({
          accountName: $rootScope.$storage.user.username,    
          password: $rootScope.$storage.user.password,
          auths: {
              posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
          }}
      );
      if (loginSuccess) {
        var tr = new window.steemJS.TransactionBuilder();
        console.log(angular.fromJson($scope.post.json_metadata));
        var t = new Date();
        var timeformat = t.getFullYear().toString()+(t.getMonth()+1).toString()+t.getDate().toString()+"t"+t.getHours().toString()+t.getMinutes().toString()+t.getSeconds().toString()+t.getMilliseconds().toString()+"z";
        var json = {tags: angular.fromJson($scope.post.json_metadata).tags[0] || ""};
        tr.add_type_operation("comment", {
          parent_author: $scope.post.author,
          parent_permlink: $scope.post.permlink,
          author: $rootScope.$storage.user.username,
          permlink: "re-"+$scope.post.author+"-"+$scope.post.permlink+"-"+timeformat,
          title: "",
          body: $scope.data.comment,
          json_metadata: angular.toJson(json)
        });
        //console.log(my_pubkeys);
        localStorage.error = 0;
        tr.process_transaction($scope.mylogin, null, true);
        $scope.closeModal();
        $scope.replying = false;
        setTimeout(function() {
          if (localStorage.error == 1) {
            $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
          } else {
            $scope.data.comment = "";  
            (new Steem(localStorage.socketUrl)).getContentReplies($rootScope.$storage.sitem.author, $rootScope.$storage.sitem.permlink, function(err, result){
              //console.log(result);      
              $scope.comments = result;
              if (!$scope.$$phase) {
                $scope.$apply();
              }
            });
          }
        }, 2000);
      } 
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Comment");
    }
  }
  $rootScope.$on("update:content", function(){
    console.log("update:content");
    (new Steem(localStorage.socketUrl)).getContentReplies($rootScope.$storage.sitem.author, $rootScope.$storage.sitem.permlink, function(err, result){
      //console.log(result);      
      $scope.comments = result;
      if (!$scope.$$phase) {
        $scope.$apply();
      }
    });
  });
  $ionicModal.fromTemplateUrl('templates/reply.html', {
    scope: $scope  }).then(function(modal) {
    $scope.modal = modal;
  });

  $scope.openModal = function(item) {
    $scope.modal.show();
  };

  $scope.closeModal = function() {
    $scope.replying = false;
    $scope.modal.hide();
  };

  $scope.isreplying = function(cho, xx) {
    $scope.replying = xx;
    $scope.post = cho;
    if (xx) {
      $scope.openModal();
    } else {
      $scope.closeModal();
    }
  }
  
  //$scope.post = {};
  $scope.$on('$ionicView.enter', function(){   
    //$scope.post = $rootScope.$storage.sitem;
    //console.log($rootScope.$storage.sitem);
    $ionicScrollDelegate.$getByHandle('mainScroll').scrollTop();
    (new Steem(localStorage.socketUrl)).getContentReplies($rootScope.$storage.sitem.author, $rootScope.$storage.sitem.permlink, function(err, result){
      //console.log(result);      
      $scope.comments = result;

      if (!$scope.$$phase) {
        $scope.$apply();
      }
    });
  });
  
  $scope.upvotePost = function(post) {
    $rootScope.$broadcast('show:loading');
    // Then create the transaction and sign it without broadcasting
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:')
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: $rootScope.$storage.voteWeight || 10000
          });
          //var my_pubkeys = $scope.mylogin.getPubKeys();
          //console.log(my_pubkeys);
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              if ($rootScope.$storage.sitem.upvoted) {
                $rootScope.$storage.sitem.upvoted = false;
                $rootScope.$storage.sitem.downvoted = false;
              } else {
                $rootScope.$storage.sitem.upvoted = true;
                $rootScope.$storage.sitem.downvoted = false;  
              }        
            }
          }, 2000);
        } 
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };
  $scope.downvotePost = function(post) {
    $rootScope.$broadcast('show:loading');
    // Then create the transaction and sign it without broadcasting
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: -10000
          });
          //var my_pubkeys = $scope.mylogin.getPubKeys();
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
               if ($rootScope.$storage.sitem.downvoted) {
                $rootScope.$storage.sitem.upvoted = false;
                $rootScope.$storage.sitem.downvoted = false;  
              } else {
                $rootScope.$storage.sitem.upvoted = false;
                $rootScope.$storage.sitem.downvoted = true;  
              }   
            }
          }, 2000);
        }
      
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };
  $scope.unvotePost = function(post) {
    $rootScope.$broadcast('show:loading');
    // Then create the transaction and sign it without broadcasting
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: 0
          });
          //var my_pubkeys = $scope.mylogin.getPubKeys();
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              if ($rootScope.$storage.sitem.upvoted) {
                $rootScope.$storage.sitem.upvoted = false;
              }
              if ($rootScope.$storage.sitem.downvoted) {
                $rootScope.$storage.sitem.downvoted = false;
              }
            }
          }, 2000);
          
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };

  $scope.$on('$ionicView.leave', function(){
    $rootScope.$storage.sitem = undefined;
  });
})

app.controller('FollowCtrl', function($scope, $stateParams, $rootScope, $state, APIs, $interval, $ionicScrollDelegate) {
  
  $scope.$on('$ionicView.beforeEnter', function(){
    $scope.active = "followers";  
    $scope.followers = [];
    $scope.following = [];
    $scope.limit = 50;
    $scope.tt = {ruser:"", duser:""};
      
    APIs.getFollowers($rootScope.$storage.user.username, $scope.tt.ruser, "blog", $scope.limit).then(function(res){
      if (res && res.length==$scope.limit) {
        $scope.tt.ruser = res[res.length-1].follower;
      }
      $scope.followers = res;
    });
    
    APIs.getFollowing($rootScope.$storage.user.username, $scope.tt.duser, "blog", $scope.limit).then(function(res){
      if (res && res.length==$scope.limit) {
        $scope.tt.duser = res[res.length-1].following;
      }
      $scope.following = res;
    });

    $scope.rfetching = $interval(function(){
      if ($scope.followers.length == $scope.limit) {
        APIs.getFollowers($rootScope.$storage.user.username, $scope.tt.ruser, "blog", $scope.limit).then(function(res){
          if (res && res.length==$scope.limit) {
            $scope.tt.ruser = res[res.length-1].follower;
          }
          //angular.merge($scope.followers, res);
          for (var i = 1; i < res.length; i++) {
            $scope.followers.push(res[i]);
          }
          //$scope.followers.push.apply($scope.followers, res);
          if (res.length<$scope.limit) {
            if (angular.isDefined($scope.rfetching)){
              $interval.cancel($scope.rfetching);
              $scope.rfetching = undefined;
            }
          }
        });
      }
    }, 800);

    $scope.dfetching = $interval(function(){
      if ($scope.following.length == $scope.limit) {
        APIs.getFollowing($rootScope.$storage.user.username, $scope.tt.duser, "blog", $scope.limit).then(function(res){
          if (res && res.length==$scope.limit) {
            $scope.tt.duser = res[res.length-1].following;
          }
          //angular.merge($scope.followers, res);
          for (var i = 1; i < res.length; i++) {
            $scope.following.push(res[i]);
          }
          //$scope.followers.push.apply($scope.followers, res);
          if (res.length<$scope.limit) {
            if (angular.isDefined($scope.dfetching)){
              $interval.cancel($scope.dfetching);
              $scope.dfetching = undefined;
            }
          }
        });
      }
    }, 700);
  });
   
  $scope.$on('$ionicView.leave', function(){
    if (angular.isDefined($scope.dfetching)){
      $interval.cancel($scope.dfetching);
      $scope.dfetching = undefined;
      $scope.following = undefined;
    }
    if (angular.isDefined($scope.rfetching)){
      $interval.cancel($scope.rfetching);
      $scope.rfetching = undefined;
      $scope.followers = undefined;
    }
  });
  $scope.isFollowed = function(x) {
    for (var i = 0; i < $scope.following.length; i++) {
      if ($scope.following[i].following == x) {
        return true;
      }
    }
    return false;
  };
  $scope.isFollowing = function(x) {
    for (var i = 0; i < $scope.followers.length; i++) {
      if ($scope.followers[i].follower == x) {
        return true;
      }
    }
    return false;
  };
  $scope.change = function(type){
    $scope.active = type;
    console.log(type);
    /*if (type == "following") {
      $scope.following = angular.copy($scope.following);
    }*/
    $ionicScrollDelegate.$getByHandle('listScroll').scrollTop();
    if (!$scope.$$phase) {
      $scope.$apply();
    }
    //$scope.loadMore(type);
  }
  $scope.unfollowUser = function(xx){
    //$rootScope.showAlert("Info", "In Development, coming soon!");
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting","active"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]],
                active: [[$rootScope.$storage.user.active.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          console.log("do unfollowing");
          var tr = new window.steemJS.TransactionBuilder();
          var json = {follower:$rootScope.$storage.user.username, following:xx, what: []}
          tr.add_type_operation("custom_json", {
            id: 'follow',
            required_posting_auths: [$rootScope.$storage.user.username],
            json: JSON.stringify(json)
          });
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              //$scope.refreshFollowers();
              $state.go($state.current, {}, {reload: true});
            }
          }, 2000);
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Follow");
    }
  };
  $scope.followUser = function(xx){
    //console.log($rootScope.$storage.user);
    $rootScope.$broadcast('show:loading');
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting","active"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]],
                active: [[$rootScope.$storage.user.active.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          console.log("do following")
          var tr = new window.steemJS.TransactionBuilder();
          var json = {follower:$rootScope.$storage.user.username, following:xx, what: ["blog"]}
          tr.add_type_operation("custom_json", {
            id: 'follow',
            required_posting_auths: [$rootScope.$storage.user.username],
            json: JSON.stringify(json)
          });
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              //$scope.refreshFollowers();
              $state.go($state.current, {}, {reload: true});
            }
          }, 2000);
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Follow");
    }
    //$rootScope.showAlert("Info", "In Development, coming soon!");
  };
  $scope.profileView = function(xx){
    $state.go('app.profile', {username: xx});
  };
  
})

app.controller('ProfileCtrl', function($scope, $stateParams, $rootScope, $ionicActionSheet, $cordovaCamera, ImageUploadService, $ionicPopup, $ionicSideMenuDelegate) {
  
  $scope.show = function() {
   var hideSheet = $ionicActionSheet.show({
     buttons: [
       { text: 'Capture Picture' },
       { text: 'Select Picture' },
       { text: 'Set Custom URL' },
     ],
     destructiveText: 'Reset',
     titleText: 'Modify Profile Picture',
     cancelText: 'Cancel',
     cancel: function() {
        // add cancel code..
      },
     buttonClicked: function(index) {
        $scope.changeProfileInfo(index);  
        return true;
     }, 
     destructiveButtonClicked: function(index){
      var confirmPopup = $ionicPopup.confirm({
        title: 'Are you sure?',
        template: 'This will reset user profile picture'
      });
      confirmPopup.then(function(res) {
        if(res) {
          var update = {profilePicUrl:""};
          angular.merge(update, $rootScope.$storage.user.json_metadata);

          console.log('You are sure');
          if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
            $scope.mylogin = new window.steemJS.Login();
            $scope.mylogin.setRoles(["owner","active","posting"]);
            var loginSuccess = $scope.mylogin.checkKeys({
                accountName: $rootScope.$storage.user.username,    
                password: $rootScope.$storage.user.password,
                auths: {
                  owner: $rootScope.$storage.user.owner.key_auths,
                  active: $rootScope.$storage.user.active.key_auths,
                  posting: $rootScope.$storage.user.posting.key_auths
                }}
            );
            //todo: if json_metadata already exist make sure to keep it.
            if (loginSuccess) {
              var tr = new window.steemJS.TransactionBuilder();
              tr.add_type_operation("account_update", {
                account: $rootScope.$storage.user.username,
                memo_key: $rootScope.$storage.user.memo_key,
                json_metadata: JSON.stringify(update)      
              });
              localStorage.error = 0;
              tr.process_transaction($scope.mylogin, null, true);
              setTimeout(function() {
                if (localStorage.error == 1) {
                  $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
                } else {
                  $scope.refreshLocalUserData();
                }
              }, 2000);
            }
            $rootScope.$broadcast('hide:loading');
          } else {
            $rootScope.$broadcast('hide:loading');
            $rootScope.showAlert("Warning", "Please, login to Update");
          }
        } else {
          console.log('You are not sure');
        }
      });
      return true;
     }
   });
  };
  $scope.changeProfileInfo = function(type) {
    var options = {};
    if (type == 0) {
      //capture
      options = {
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.CAMERA,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
        targetWidth: 500,
        targetHeight: 500,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: false,
        correctOrientation:true
      };
    }
    if (type == 1) {
      //capture
      options = {
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        allowEdit: true,
        encodingType: Camera.EncodingType.JPEG,
        targetWidth: 500,
        targetHeight: 500,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: false,
        correctOrientation:true
      };
    }
    if (type !== 2) {
      $cordovaCamera.getPicture(options).then(function(imageData) {
        ImageUploadService.uploadImage(imageData).then(function(result) {
          var url = result.secure_url || '';
          var update = { profilePicUrl:url };
          angular.merge(update, $rootScope.$storage.user.json_metadata);

          $rootScope.$broadcast('show:loading');
          if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
            $scope.mylogin = new window.steemJS.Login();
            $scope.mylogin.setRoles(["owner","active","posting"]);
            var loginSuccess = $scope.mylogin.checkKeys({
                accountName: $rootScope.$storage.user.username,    
                password: $rootScope.$storage.user.password,
                auths: {
                  owner: $rootScope.$storage.user.owner.key_auths,
                  active: $rootScope.$storage.user.active.key_auths,
                  posting: $rootScope.$storage.user.posting.key_auths
                }}
            );
            if (loginSuccess) {
              var tr = new window.steemJS.TransactionBuilder();
              tr.add_type_operation("account_update", {
                account: $rootScope.$storage.user.username,
                memo_key: $rootScope.$storage.user.memo_key,
                json_metadata: JSON.stringify(update)      
              });
              
              localStorage.error = 0;

              tr.process_transaction($scope.mylogin, null, true);

              setTimeout(function() {
                if (localStorage.error == 1) {
                  $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage);
                } else {
                  $scope.refreshLocalUserData();
                }
              }, 2000);
            }
          $rootScope.$broadcast('hide:loading');
        } else {
          $rootScope.$broadcast('hide:loading');
          $rootScope.showAlert("Warning", "Please, login to Update");
        }
          $cordovaCamera.cleanup();
        },
        function(err) {
          $rootScope.showAlert("Error", "Upload Error");
          $cordovaCamera.cleanup();
        });
      }, function(err) {
        $rootScope.showAlert("Error", "Camera Cancelled");
      });
    } else {
      $ionicPopup.prompt({
        title: 'Set URL',
        template: 'Direct web link for picture',
        inputType: 'text',
        inputPlaceholder: 'http://example.com/image.jpg'
      }).then(function(res) {
        console.log('Your url is', res);
        if (res) {
          var update = {profilePicUrl: res};
          angular.merge(update, $rootScope.$storage.user.json_metadata);

          if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
            $scope.mylogin = new window.steemJS.Login();
            $scope.mylogin.setRoles(["owner","active","posting"]);
            var loginSuccess = $scope.mylogin.checkKeys({
                accountName: $rootScope.$storage.user.username,    
                password: $rootScope.$storage.user.password,
                auths: {
                  owner: $rootScope.$storage.user.owner.key_auths,
                  active: $rootScope.$storage.user.active.key_auths,
                  posting: $rootScope.$storage.user.posting.key_auths
                }}
            );
            if (loginSuccess) {
              var tr = new window.steemJS.TransactionBuilder();
              tr.add_type_operation("account_update", {
                account: $rootScope.$storage.user.username,
                memo_key: $rootScope.$storage.user.memo_key,
                json_metadata: JSON.stringify(update)      
              });
              localStorage.error = 0;
              tr.process_transaction($scope.mylogin, null, true);
              setTimeout(function() {
                if (localStorage.error == 1) {
                  $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
                } else {
                  $scope.refreshLocalUserData();
                }
              }, 2000);
            }
            $rootScope.$broadcast('hide:loading');
          } else {
            $rootScope.$broadcast('hide:loading');
            $rootScope.showAlert("Warning", "Please, login to Update");
          }
        }
      });
    }
    
  };

  $scope.upvotePost = function(post) {
    post.invoting = true;
    $rootScope.$broadcast('show:loading');
    // Then create the transaction and sign it without broadcasting
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        console.log(loginSuccess);
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: $rootScope.$storage.voteWeight || 10000
          });
          //var my_pubkeys = $scope.mylogin.getPubKeys();
          //console.log(my_pubkeys);
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              post.invoting = false;
              $scope.refresh();
            }
          }, 2000);
        } 
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };
  $scope.downvotePost = function(post) {
    post.invoting = true;
    $rootScope.$broadcast('show:loading');
    // Then create the transaction and sign it without broadcasting
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: -10000
          });
          //var my_pubkeys = $scope.mylogin.getPubKeys();
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              post.invoting = false;
              $scope.refresh();
            }
          }, 2000);
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };
  $scope.unvotePost = function(post) {
    post.invoting = true;
    $rootScope.$broadcast('show:loading');
    // Then create the transaction and sign it without broadcasting
    if ($rootScope.$storage.user && $rootScope.$storage.user.password) {
        console.log('Api ready:');
        $scope.mylogin = new window.steemJS.Login();
        $scope.mylogin.setRoles(["posting"]);
        var loginSuccess = $scope.mylogin.checkKeys({
            accountName: $rootScope.$storage.user.username,    
            password: $rootScope.$storage.user.password,
            auths: {
                posting: [[$rootScope.$storage.user.posting.key_auths[0][0], 1]]
            }}
        );
        if (loginSuccess) {
          var tr = new window.steemJS.TransactionBuilder();
          tr.add_type_operation("vote", {
              voter: $rootScope.$storage.user.username,
              author: post.author,
              permlink: post.permlink,
              weight: 0
          });
          //var my_pubkeys = $scope.mylogin.getPubKeys();
          localStorage.error = 0;
          tr.process_transaction($scope.mylogin, null, true);
          setTimeout(function() {
            if (localStorage.error == 1) {
              $rootScope.showAlert("Error", "Broadcast error, try again!"+" "+localStorage.errormessage)
            } else {
              post.invoting = false;
              $scope.refresh();
            }
          }, 2000);
        }
      $rootScope.$broadcast('hide:loading');
    } else {
      $rootScope.$broadcast('hide:loading');
      $rootScope.showAlert("Warning", "Please, login to Vote");
    }
  };
  $scope.$watch('profile', function(newValue, oldValue){
    //console.log('changed');
    if (newValue) {
      for (var i = 0; i < newValue.length; i++) {
        if ($rootScope.$storage.user){
          for (var j = newValue[i].active_votes.length - 1; j >= 0; j--) {
            if (newValue[i].active_votes[j].voter === $rootScope.$storage.user.username) {
              if (newValue[i].active_votes[j].percent > 0) {
                newValue[i].upvoted = true;  
              } else if (newValue[i].active_votes[j].percent < 0) {
                newValue[i].downvoted = true;  
              } else {
                newValue[i].upvoted = false;
                newValue[i].downvoted = false;    
              }
            }
          }
        }
      }
    }
  }, true);
  $scope.refresh = function() {  
    if (!$scope.active) {
      $scope.active = "blog";  
    }
    if ($scope.active != "blog") {
      $scope.rest = "/"+$scope.active;
    } else {
      $scope.rest = "";
    }  
    
    $scope.nonexist = false;
    
    (new Steem(localStorage.socketUrl)).getState("/@"+$stateParams.username+$scope.rest, function(err, res){
      $scope.profile = [];
      //console.log(res.content);
      if (Object.keys(res.content).length>0) {
        for (var property in res.content) {
          if (res.content.hasOwnProperty(property)) {
            // do stuff
            //console.log(res.content[property])
            $scope.profile.push(res.content[property]);
          }
        }
        $scope.nonexist = false;
        if(!$scope.$$phase){
          $scope.$apply();
        }
      } else {
        $scope.nonexist = true;
      }
    });
  };
  $scope.user = {username: $stateParams.username};
  $scope.getOtherUsersData = function() {
    console.log("getOtherUsersData");
    (new Steem(localStorage.socketUrl)).getAccounts([$stateParams.username], function(err, dd) {
      //console.log(dd);
      dd = dd[0];
      if (dd.json_metadata) {
        dd.json_metadata = angular.fromJson(dd.json_metadata);
      }
      angular.merge($scope.user, dd);
      if(!$scope.$$phase){
        $scope.$apply();
      }
    });
  };
  $scope.$on('$ionicView.beforeEnter', function(){
    
    if ($rootScope.$storage.user.username !== $stateParams.username) {
      $scope.getOtherUsersData();  
    }/* else {
      $scope.refreshLocalUserData();
    }*/  
    $scope.refresh();  
  });
  $scope.openMenu = function() {
    $ionicSideMenuDelegate.toggleLeft();
  }
   $scope.change = function(type){
    $scope.profile = [];
    $scope.accounts = [];
    $scope.active = type;
    if (type != "blog") {
      $scope.rest = "/"+type;
    } else {
      $scope.rest = "";
    }
    (new Steem(localStorage.socketUrl)).getState("/@"+$stateParams.username+$scope.rest, function(err, res){
      //console.log(res);
      //console.log(type)
      if (res.content) {
        //console.log(res.content)
        if (Object.keys(res.content).length>0) {
          for (var property in res.content) {
            if (res.content.hasOwnProperty(property)) {
              $scope.profile.push(res.content[property]);
            }
          }    
          $scope.nonexist = false;
        } else {
          $scope.nonexist = true;
        }
      } 
      if (type=="transfers" || type=="permissions") {
        //console.log(res.accounts)
        for (var property in res.accounts) {
          if (res.accounts.hasOwnProperty(property)) {
            $scope.accounts = res.accounts[property];
            $scope.transfers = res.accounts[property].transfer_history;
            $scope.nonexist = false;
          }
        } 
        //console.log($scope.transfers);
      }
      
      if(!$scope.$$phase){
        $scope.$apply();
      }
    });
  }

})

app.controller('ExchangeCtrl', function($scope, $stateParams, $rootScope) {
  $scope.username = $stateParams.username;
  
  $scope.$on('$ionicView.beforeEnter', function(){
    $scope.active = 'buy';
    $scope.orders = [];
    (new Steem(localStorage.socketUrl)).getOrderBook(15, function(err, res){
      console.log(err, res);
      $scope.orders = res;
      if (!$scope.$$phase) {
        $scope.$apply();
      }
    });
    $scope.change = function(type){
      $scope.active = type;
      if (type == "open"){
        (new Steem(localStorage.socketUrl)).getOpenOrders($stateParams.username, function(err, res){
          console.log(err, res)
          $scope.openorders = res;
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
      }
      if (type == "history"){
        $scope.history = [];
        window.Api.market_history_api().exec("get_recent_trades", [15]).then(function(r){
          //console.log(r);
          $scope.recent_trades = r;
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
        /*(new Steem($rootScope.$storage.socket)).getAccountHistory($stateParams.username, 20, 10, function(err, res){
          console.log(err, res)
          //$scope.openorders = res;
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });*/
      }
    };
  });

});

app.controller('SettingsCtrl', function($scope, $stateParams, $rootScope, $ionicHistory, $state, $ionicPopover, $ionicPopup) {
   
   $ionicPopover.fromTemplateUrl('popover.html', {
      scope: $scope
   }).then(function(popover) {
      $scope.tooltip = popover;
   });

   $scope.openTooltip = function($event, text) {
      $scope.tooltipText = text;
      $scope.tooltip.show($event);
   };

   $scope.closeTooltip = function() {
      $scope.tooltip.hide();
   };

   //Cleanup the popover when we're done with it!
   $scope.$on('$destroy', function() {
      $scope.tooltip.remove();
   });

   // Execute action on hide popover
   $scope.$on('popover.hidden', function() {
      // Execute action
   });

   // Execute action on remove popover
   $scope.$on('popover.removed', function() {
      // Execute action
   });

  $scope.$on('$ionicView.beforeEnter', function(){
    $rootScope.$storage.socket = localStorage.socketUrl;
    if (!$rootScope.$storage.voteWeight){
      $rootScope.$storage.voteWeight = 10000;
      $scope.vvalue = 100;
    } else {
      $scope.vvalue = $rootScope.$storage.voteWeight/100;
    }
    if(!$scope.$$phase){
      $scope.$apply();
    }
    $scope.slider = {
      value: $scope.vvalue,
      options: {
        floor: 1,
        ceil: 100
      }
    };

    if ($rootScope.$storage.pincode) {
      $scope.data = {pin: true};
    } else {
      $scope.data = {pin: false};
    }
  });
  
  
  $scope.$watch('slider', function(newValue, oldValue){
    if (newValue.value) {
      $rootScope.$storage.voteWeight = newValue.value*100; 
    }
  }, true);

  $scope.pinChange = function() {
    console.log("pinChange");
    if ($rootScope.$storage.pincode) {
      $rootScope.$broadcast("pin:check");
    } else {
      $rootScope.$broadcast("pin:new");
    }  
  }

  $rootScope.$on("pin:correct", function(){
    console.log("pin:correct",$scope.data.pin);
    if (!$scope.data.pin) {
        $rootScope.$storage.pincode = undefined;
    }
    if ($rootScope.$storage.pincode) {
      $scope.data.pin = true;
    } else {
      $scope.data.pin = false;
    }
    if (!$scope.$$phase){
      $scope.$apply();
    }
  });

  $rootScope.$on("pin:failed", function(){
    console.log("pin:failed");
    setTimeout(function() {
      if ($rootScope.$storage.pincode) {
        $scope.data.pin = true;
      } else {
        $scope.data.pin = false;
      }
      if (!$scope.$$phase){
        $scope.$apply();
      }
    }, 100);
    
  });
  
  $scope.save = function(){
    localStorage.socketUrl = $rootScope.$storage.socket;
    $rootScope.showAlert("Success", "Settings are updated! Please, restart app for this to take effect!");
    $ionicHistory.nextViewOptions({
      disableBack: true
    });
    $state.go('app.posts');
  };

});
}