/**
 * Copyright 2015 Aylien, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var AYLIENTextAPI = require('../textapi'),
    querystring = require('querystring'),
    assert = require('assert'),
    nock = require('nock'),
    path = require('path'),
    fs = require('fs');

// Override http requests
var fakeTextAPI = nock('https://api.aylien.com/');
var files = fs.readdirSync('test/fixtures');
files.forEach(function(file) {
  if (file.match('.json$')) {
    var endpoint = file.replace('.json', '');
    var content = JSON.parse(fs.readFileSync('test/fixtures/' + file, 'utf8'));
    content.tests.forEach(function(test) {
      var input = {};
      if (typeof test.input === 'string') {
        input[test.input_type] = test.input;
      } else {
        input = test.input;
      }
      input = querystring.stringify(input);
      fakeTextAPI.post('/api/v1/' + endpoint, input).reply(200, JSON.stringify(test.output));
    });
  }
});

var authErrorMessage = 'Authentication parameters missing';
fakeTextAPI.post('/api/v1/sentiment', 'text=random').reply(403, authErrorMessage);
fakeTextAPI.post('/api/v1/summarize', 'url=invalid').reply(400,
    '{"error" : "requirement failed: if you are not providing an url, both text and title are required."}');


describe('Text API', function() {
  files.forEach(function(file) {
    if (file.match('.json$')) {
      var endpoint = file.replace('.json', '');
      describe(endpoint, function() {
        var content = JSON.parse(fs.readFileSync('test/fixtures/' + file, 'utf8'));
        content.tests.forEach(function(test) {
          var textapi = new AYLIENTextAPI({
            application_id: "random",
            application_key: "random"
          });
          it(endpoint + ' should return an object with correct params', function(done) {
            textapi[endpoint].apply(textapi, [test.input, function(e, c) {
              assert.equal(e, null);
              assert.equal(typeof c, 'object');
              done();
            }]);
          });
        });
        it(endpoint + ' should return an error for missing params', function(done) {
          var textapi = new AYLIENTextAPI({
            application_id: "random",
            application_key: "random"
          });
          textapi[endpoint].apply(textapi, [{}, function(e, c) {
            assert.notEqual(e, null);
            done();
          }]);
        });
      });
    }
  });
  describe('authentication', function() {
    it('should throw an exception for invalid keys', function(done) {
      var textapi = new AYLIENTextAPI({
        application_id: "random",
        application_key: "random"
      });
      textapi.sentiment('random', function(error, response) {
        assert.notEqual(error, null);
        assert.equal(error.message, authErrorMessage);
        done();
      });
    });
  });
  describe('invalid url', function() {
    it('should throw an exception', function(done) {
      var textapi = new AYLIENTextAPI({
        application_id: "random",
        application_key: "random"
      });
      textapi.summarize({url: 'invalid'}, function(error, response) {
        assert.notEqual(error, null);
        done();
      });
    });
  });
});
