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
    vm.hits = parseLogs(response.hits.hits);

  }, function(error){
    $log.debug(error);
  });

}]);

var parseLogs = function(hits){

  var new_hits = [];
  var spring_log_regex = /^(\d{1,4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}\:\d{1,2}\:\d{1,2}\.\d{1,4})\s+(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\s+(\d+)\s+---\s+(\[[\s\w\-]*\])\s+([\w\.\[\]\/\\]*)\s+\:\s+(.*)/;
  var db_regex = /^(\d{1,4}-\d{1,2}\-\d{1,2}T\d{1,2}\:\d{1,2}\:\d{1,2}\.\d{1,8}Z)\s(\d+)\s(\[\w*\])\s(.*)/;

  for(var index in hits){

    var current_log = hits[index]._source.log;

    if(hits[index]['_source']['container_name'] === "/db"){

      var new_db_source = {};

      var match = db_regex.exec(current_log);

      if(match !== null){
        new_db_source['timestamp'] =  match[1];
        new_db_source['container_name'] =  "db";
        new_db_source['log_level']="";
        new_db_source['process_id'] =  match[2];
        new_db_source['thread_name']="";
        new_db_source['class'] =  match[3];
        new_db_source['message'] =  match[4];

        new_hits.push(new_db_source);
      }
    }

    if(hits[index]['_source']['container_name'] === "/app"){

      var new_app_source = {};

      var match = spring_log_regex.exec(current_log);

      if(match !== null){
        new_app_source['@timestamp'] =  match[1];
        new_app_source['container_name'] =  "app";
        new_app_source['log_level']= match[2];
        new_app_source['process_id'] =  match[3];
        new_app_source['thread_name']=match[4];
        new_app_source['class'] =  match[5];
        new_app_source['message'] =  match[6];

        new_hits.push(new_app_source);
      }
    }
  }
  return new_hits;

};
