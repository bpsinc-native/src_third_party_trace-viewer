// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.importer');

tvcm.unittest.testSuite('tracing.importer.trace_event_importer_perf_test', function() { // @suppress longLineCheck
  var eventStrings = {};

  // @const
  var TEST_NAMES = ['simple_trace', 'lthi_cats'];
  // @const
  var TEST_FILES_PATHS = ['/test_data/simple_trace.json',
                          '/test_data/lthi_cats.json.gz'];

  function getSynchronous(url) {
    var req = new XMLHttpRequest();
    req.open('GET', url, false);
    // Without the mime type specified like this, the file's bytes are not
    // retrieved correctly.
    req.overrideMimeType('text/plain; charset=x-user-defined');
    req.send(null);
    return req.responseText;
  }

  function getEvents(url) {
    if (url in eventStrings)
      return eventStrings[url];
    eventStrings[url] = getSynchronous(url);
    return eventStrings[url];
  }

  function timedPerfTestWithEvents(name, testFn, initialOptions) {
    if (initialOptions.setUp)
      throw new Error(
          'Per-test setUp not supported. Trivial to fix if needed.');

    var options = {};
    for (var k in initialOptions)
      options[k] = initialOptions[k];
    options.setUp = function() {
      TEST_FILES_PATHS.forEach(
          function warmup(url) {
            getEvents(url);
          });
    };
    timedPerfTest(name, testFn, options);
  }

  var n110100 = [1, 10, 100];
  n110100.forEach(function(val) {
    timedPerfTestWithEvents(TEST_NAMES[0] + '_' + val, function() {
      var events = getEvents(TEST_FILES_PATHS[0]);
      var m = new tracing.TraceModel();
      m.importTraces([events], false, false);
    }, {iterations: val});
  });

  timedPerfTestWithEvents(TEST_NAMES[1] + '_1', function() {
    var events = getEvents(TEST_FILES_PATHS[1]);
    var m = new tracing.TraceModel();
    m.importTraces([events], false, false);
  }, {iterations: 1});
});
