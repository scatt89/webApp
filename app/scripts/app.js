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
    index: 'fluentd',
    size: 1000,
    _source:["@timestamp", "container_name", "log"],
    body:{
      "query":{"match_all": {}}
    }
  }).then(function(response){
    //vm.hits=  response.hits.hits;
    vm.hits = parseLogs(response.hits.hits);

  }, function(error){
    $log.debug(error);
  });

}]);

var parseLogs = function(hits){

    var new_hits = [];
    var spring_log_regex = /^((\d{1,4}\-\d{1,2}\-\d{1,2})\s+(\d{1,2}\:\d{1,2}\:\d{1,2}\.\d{1,4})\s+(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\s+(\d+)\s+(---)\s+(\[[\w\-]*\])\s+([\w\.\[\]\/\\]*)\s+\:\s+(.*))/;
    var hit;
    for(hit in hits){
      //$log.debug(hit);
      if(hit._source.log){
        if(spring_log_regex.exec(hit._source.log)){
          var new_source = [];
          new_source.time=hit._source.log.match(/^((\d{1,4}\-\d{1,2}\-\d{1,2})\s+(\d{1,2}\:\d{1,2}\:\d{1,2}\.\d{1,4}))/); //match timestamp
          new_source.container_name=hit._source.container_name; //take the container name
          new_source.log_level=hit._source.log.match(/(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)/); //match the log level
          new_source.process_id=hit._source.log.match(/\s+(\d+)\s+/); //match the process id
          new_source.thread_name=hit._source.log.match(/\s+(\[[\w\-]*\])\s+/);
          new_source.class=hit._source.log.match(/\s+([\w\.\[\]\/\\]*)\s+\:/);
          new_source.message=hit._source.log.match(/\:\s+(.*)$/);
          new_hits.push(new_source);
        }
      }
    }
    return new_hits;

};
