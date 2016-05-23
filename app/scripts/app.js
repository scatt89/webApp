'use strict';

/**
 * @ngdoc overview
 * @name webAppApp
 * @description
 * # webAppApp
 *
 * Main module of the application.
 */
var app = angular
  .module('webAppApp', [
    'elasticsearch',
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ]);

// Create the es service from the esFactory
app.service('es', function (esFactory) {
  return esFactory({ host: 'localhost:9200' });
});

//Controller that returns the server health
app.controller("ConnectionController", ['es', function(es){
  this.info = "";
  var self = this;

  es.cluster.health(function (err, resp) {
    if (err) {
      self.info = err.message;
    } else {
      self.info = "Elasticsearch connected!";
    }
  });

}]);

//Controller that returns query results
app.controller("QueryController", ['es','$log', function(es,$log){

  var vm = this;

  // search for documents
  es.search({
    index: 'logstash-2016.05.23',
    size: 1000,
    _source:["@timestamp", "container_name", "log"],
    body:{
      "query":{"match_all": {}}
    }
  }).then(function(response){
    vm.hits = response.hits.hits;
  }, function(error){
    $log.debug(error);
  });

}]);

//Controller that returns query results
// app.controller("QueryController", ['es','$log', function(es,$log){
//
//   var vm = this;
//
//   // search for documents
//   es.get({
//     index: 'logstash-2016.05.23',
//     type: '_all',
//     _source:["@timestamp", "container_name", "log"]
//   }, function (error, response){
//     if(error){
//       $log.debug(error);
//     }else{
//       vm = response.hits.hits;
//     }
//   });
//
// }]);
