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

// We define an Angular controller that returns the server health
// Inputs: $scope and the 'es' service
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
