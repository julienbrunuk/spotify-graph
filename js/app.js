$(window).on('resize', function() {
  $('#graph').css('height', $(window).height());
});
$('#graph').css('height', $(window).height());

var options = {
  Repulsion: true,
  smoothCurves: true,
  nodes: {
    scaleFontWithValue: true,
    fontColor: '#FFFFFF',
    color: {

      background: '#3D6E21',
      border: '#3D6E21',
      highlight: {
        background: '#80B719',
        border: '#80B719'
      }
    }
  },
  edges: {
    color: {
      color: '#888888',
      highlight: '#3D6E21'
    },
    width: 1
  }
};

var container = document.getElementById('graph');
var nodes = new vis.DataSet();
var edges = new vis.DataSet();

var data = {
  nodes: nodes,
  edges: edges
};
var network = new vis.Network(container, data, options, {});


var musicApp = angular.module('musicApp', ['ngResource', 'ngRoute', 'cgBusy']);

musicApp.config(function($provide) {
  $provide.decorator('$q', ['$delegate', '$rootScope', function($delegate, $rootScope) {
    var pendingPromisses = 0;
    $rootScope.$watch(
      function() {
        return pendingPromisses > 0;
      },
      function(loading) {
        $rootScope.loading = loading;
      }
    );
    var $q = $delegate;
    var origDefer = $q.defer;
    $q.defer = function() {
      var defer = origDefer();
      pendingPromisses++;
      defer.promise.finally(function() {
        pendingPromisses--;
      });
      return defer;
    };
    return $q;
  }]);
});

var apiBase = 'https://ws.spotify.com/';


musicApp.factory('oEmbed', ['$resource',
  function($resource) {
    return $resource('https://embed.spotify.com/oembed/?url=:href', {}, {
      query: {
        method: 'GET',
        params: {
          href: 'href'
        },
        isArray: false
      }
    });
  }
]);

musicApp.factory('Albums', ['$resource',
  function($resource) {
    return $resource(apiBase + 'search/1/album.json?q=:query', {}, {
      query: {
        method: 'GET',
        params: {
          query: 'query'
        },
        isArray: false
      }
    });
  }
]);

musicApp.factory('Artists', ['$resource',
  function($resource) {
    return $resource(apiBase + 'search/1/artist.json?q=:query', {}, {
      query: {
        method: 'GET',
        params: {
          query: 'query'
        },
        isArray: false
      }
    });
  }
]);

musicApp.factory('Album', ['$resource',
  function($resource) {
    return $resource(apiBase + 'lookup/1//.json?uri=:uri&extras=trackdetail', {}, {
      query: {
        method: 'GET',
        params: {
          uri: 'uri'
        },
        isArray: false
      }
    });
  }
]);

musicApp.factory('Artist', ['$resource',
  function($resource) {
    return $resource(apiBase + 'lookup/1//.json?uri=:uri&extras=albumdetail', {}, {
      query: {
        method: 'GET',
        params: {
          uri: 'uri'
        },
        isArray: false
      }
    });
  }
]);





musicApp.controller('starter', ['$scope', 'Albums', 'Album', 'Artists', 'Artist', function($scope, Albums, Album, Artists, Artist) {
  //$scope.option = Albums.get({query:$scope.search});
  $scope.Search = function(search) {

    angular.forEach(nodes._data, function(node, key) {
      console.log(node);
      if (network.getConnectedNodes(node.id) <= 0) {
        nodes.remove(node.id);
      }
    });


    $scope.Results = Artists.get({
      query: $scope.search
    }, function(response) {
      angular.forEach(response.artists, function(value, key) {
        //console.log(value);

        if (value.popularity > 0.5) {
          nodes.add([{
            id: value.href,
            label: value.name,
            value: value.popularity,
            shape: 'star',
            href: value.href,
            spotifyType: 'artist'
          }]);
        }
      });



    });

    network.on('hoverNode', function(properties) {
      network.freezeSimulation(true);
    });

    network.on('blurNode', function(properties) {
      network.freezeSimulation(false);
    });

    network.on('select', function(nodeProperties) {
      console.log(nodeProperties);
      network.focusOnNode(nodeProperties.nodes[0]);
      angular.forEach(nodeProperties.nodes, function(nodeID, key) {

        if (nodes._data[nodeID].spotifyType == 'artist') {
          Artist.get({
            uri: nodes._data[nodeID].href
          }, function(response) {
            angular.forEach(response.artist.albums, function(value, key) {

              //console.log(value);
              if (value.info.type == 'album' && value.album['artist-id'] == nodes._data[nodeID].href) {

                // create album node
                nodes.add([{
                  id: value.album.href,
                  label: value.album.name.replace(/ *\([^)]*\) */g, ""),
                  value: value.album.popularity,
                  shape: 'dot',
                  href: value.album.href,
                  spotifyType: 'album'
                }]);
                edges.add([{
                  from: value.album['artist-id'],
                  to: value.album.href
                }]);



              }



            });



          });
        }

        if (nodes._data[nodeID].spotifyType == 'album') {
          Album.get({
            uri: nodes._data[nodeID].href
          }, function(response) {
            angular.forEach(response.album.tracks, function(value, key) {
              var trackHref = value.href;
              //console.log(value);
              nodes.add([{
                id: value.href,
                label: value.name.replace(/ *\([^)]*\) */g, ""), // saves some space!
                value: value.popularity,
                shape: 'triangle',
                href: value.href,
                spotifyType: 'track'
              }]);
              edges.add([{
                from: nodeID,
                to: value.href
              }]);
              // if it's a collaboration

              if (value.artists.length > 1) {
                angular.forEach(value.artists, function(trackArtist, key) {
                  console.log(trackArtist);
                  // for each artist of this track
                  if (key > 0) {
                    // get artist details

                    Artists.get({
                      query: trackArtist.name
                    }, function(response) {
                      console.log(response.artists[0]);
                      nodes.add([{
                        id: trackArtist.href,
                        label: trackArtist.name,
                        shape: 'star',
                        href: trackArtist.href,
                        value: response.artists[0].popularity,
                        spotifyType: 'artist'
                      }]);

                      edges.add([{
                        from: trackArtist.href,
                        to: trackHref
                      }]);

                    });

                  }
                });
              }


            });



          });
        }


      });
    });


  };
}]);
