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

//Value contains vector with log results
app.value("log_results",[]);

// Create the es service from the esFactory
app.service('es', function (esFactory) {
  return esFactory({ host: 'localhost:9200' });
});

//Controller that returns query results
app.controller("QueryController", ['es','$log', 'log_results', function(es,$log,log_results){

  var vm = this;

  vm.hits = [];
  vm.info = "";
  vm.index = "fluentd";
  vm.log_level_filter_active = false;
  vm.log_level_filter = "ALL";
  vm.date_filter_active = false;
  vm.date_filter_start = "";
  vm.date_filter_end = "";


  vm.connect = function () {
    es.cluster.health(function (err, resp) {
      if (err) {
        vm.info = err.message;
      } else {
        vm.info = "Elasticsearch connected to "+vm.index+" index";
        vm.initial_query();
      }
    });
  }

  vm.initial_query = function(){
    // search for documents
    es.search({
      index: vm.index,
      size: 1000,
      _source:["@timestamp", "container_name", "log"],
      body:{
        "query":{"match_all": {}}
      }
    }).then(function(response){
      log_results = parseLogs(response.hits.hits);
      vm.hits = log_results;
    }, function(error){
      $log.debug(error);
    });
  }

  vm.execute_filter = function(){
    $log.debug("inside execute_filter function");
    var newResults = [];
    $log.debug("log_level_filter_active: "+vm.log_level_filter_active);
    $log.debug("log_level_filter: "+vm.log_level_filter);

    if(!vm.log_level_filter_active && !vm.date_filter_active){
      $log.debug("No filter to apply");
    }else{
      for(var index in log_results){
        if(vm.log_level_filter_active){
          if(vm.log_level_filter.toUpperCase() === "ALL" || log_results[index].log_level.toUpperCase() === vm.log_level_filter.toUpperCase()){
            newResults.push(log_results[index]);
            $log.debug(log_results[index].log_level.toUpperCase());
            $log.debug(vm.log_level_filter.toUpperCase());
          }
        }
        if(vm.date_filter_active){
          $log.debug(log_results[index].date);
          if(log_results[index].date >= vm.date_filter_start && log_results[index].date <= vm.date_filter_end){
            $log.debug("inside date filter with date"+log_results[index])
            newResults.push(log_results[index]);
          }
        }
      }
      vm.hits = newResults;
    }
  }

}]);

var parseLogs = function(hits){

  var new_hits = [];
  var spring_log_regex = /^(\d{1,4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}\:\d{1,2}\:\d{1,2}\.\d{1,4})\s+(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\s+(\d+)\s+---\s+(\[[\s\w\-]*\])\s+([\w\.\[\]\/\\\$\?\¿\!\¡\,\;]*)\s+\:\s+(.*)/;
  var spring_date_regex = /(\d{4})-(\d{2})-(\d{2})\s(\d{2})\:(\d{2})\:(\d{2})\.(\d+)/;
  var mysql_log_regex = /^(\d{1,4}-\d{1,2}\-\d{1,2}T\d{1,2}\:\d{1,2}\:\d{1,2}\.\d{1,8}Z)\s(\d+)\s(\[\w*\])\s(.*)/;
  var mysql_date_regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d+)Z/;

  for(var index in hits){

    var current_log = hits[index]._source.log;

    if(hits[index]['_source']['container_name'] === "/db"){

      var new_db_source = {};

      var match = mysql_log_regex.exec(current_log);

      if(match !== null){
        var date_parts = match[1].match(mysql_date_regex);//se obtiene el string timestamp del log
        new_db_source['date'] =  new Date(date_parts[1],date_parts[2],date_parts[3],date_parts[4],date_parts[5],date_parts[6],date_parts[7]);//se construye el objeto fecha
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
        var date_parts = match[1].match(spring_date_regex);//se obtiene el string timestamp del log
        new_app_source['date'] =  new Date(date_parts[1],date_parts[2],date_parts[3],date_parts[4],date_parts[5],date_parts[6],date_parts[7]);//se construye el objeto fecha
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
