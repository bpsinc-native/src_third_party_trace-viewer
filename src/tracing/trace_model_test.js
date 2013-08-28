// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.trace_model');
base.require('tracing.importer');

base.unittest.testSuite('tracing.trace_model', function() {
  var ThreadSlice = tracing.trace_model.ThreadSlice;
  var TraceModel = tracing.TraceModel;
  var TitleFilter = tracing.TitleFilter;

  var createTraceModelWithOneOfEverything = function() {
    var m = new TraceModel();
    var cpu = m.kernel.getOrCreateCpu(1);
    cpu.slices.push(tracing.test_utils.newSlice(1, 3));

    var p = m.getOrCreateProcess(1);
    var t = p.getOrCreateThread(1);
    t.sliceGroup.pushSlice(new ThreadSlice('', 'a', 0, 1, {}, 4));
    t.asyncSliceGroup.push(tracing.test_utils.newAsyncSlice(0, 1, t, t));

    var c = p.getOrCreateCounter('', 'ProcessCounter');
    var aSeries = new tracing.trace_model.CounterSeries('a', 0);
    var bSeries = new tracing.trace_model.CounterSeries('b', 0);
    c.addSeries(aSeries);
    c.addSeries(bSeries);

    aSeries.addSample(0, 5);
    aSeries.addSample(1, 6);
    aSeries.addSample(2, 5);
    aSeries.addSample(3, 7);

    bSeries.addSample(0, 10);
    bSeries.addSample(1, 15);
    bSeries.addSample(2, 12);
    bSeries.addSample(3, 16);

    var c1 = cpu.getOrCreateCounter('', 'CpuCounter');
    var aSeries = new tracing.trace_model.CounterSeries('a', 0);
    var bSeries = new tracing.trace_model.CounterSeries('b', 0);
    c1.addSeries(aSeries);
    c1.addSeries(bSeries);

    aSeries.addSample(0, 5);
    aSeries.addSample(1, 6);
    aSeries.addSample(2, 5);
    aSeries.addSample(3, 7);

    bSeries.addSample(0, 10);
    bSeries.addSample(1, 15);
    bSeries.addSample(2, 12);
    bSeries.addSample(3, 16);

    m.updateBounds();

    return m;
  };

  test('traceModelBounds_EmptyTraceModel', function() {
    var m = new TraceModel();
    m.updateBounds();
    assertEquals(undefined, m.bounds.min);
    assertEquals(undefined, m.bounds.max);
  });

  test('traceModelBounds_OneEmptyThread', function() {
    var m = new TraceModel();
    var t = m.getOrCreateProcess(1).getOrCreateThread(1);
    m.updateBounds();
    assertEquals(undefined, m.bounds.min);
    assertEquals(undefined, m.bounds.max);
  });

  test('traceModelBounds_OneThread', function() {
    var m = new TraceModel();
    var t = m.getOrCreateProcess(1).getOrCreateThread(1);
    t.sliceGroup.pushSlice(new ThreadSlice('', 'a', 0, 1, {}, 3));
    m.updateBounds();
    assertEquals(1, m.bounds.min);
    assertEquals(4, m.bounds.max);
  });

  test('traceModelBounds_OneThreadAndOneEmptyThread', function() {
    var m = new TraceModel();
    var t1 = m.getOrCreateProcess(1).getOrCreateThread(1);
    t1.sliceGroup.pushSlice(new ThreadSlice('', 'a', 0, 1, {}, 3));
    var t2 = m.getOrCreateProcess(1).getOrCreateThread(1);
    m.updateBounds();
    assertEquals(1, m.bounds.min);
    assertEquals(4, m.bounds.max);
  });

  test('traceModelBounds_OneCpu', function() {
    var m = new TraceModel();
    var cpu = m.kernel.getOrCreateCpu(1);
    cpu.slices.push(tracing.test_utils.newSlice(1, 3));
    m.updateBounds();
    assertEquals(1, m.bounds.min);
    assertEquals(4, m.bounds.max);
  });

  test('traceModelBounds_OneCpuOneThread', function() {
    var m = new TraceModel();
    var cpu = m.kernel.getOrCreateCpu(1);
    cpu.slices.push(tracing.test_utils.newSlice(1, 3));

    var t = m.getOrCreateProcess(1).getOrCreateThread(1);
    t.sliceGroup.pushSlice(new ThreadSlice('', 'a', 0, 1, {}, 4));

    m.updateBounds();
    assertEquals(1, m.bounds.min);
    assertEquals(5, m.bounds.max);
  });

  test('traceModelCanImportEmpty', function() {
    var m;
    m = new TraceModel([]);
    m = new TraceModel('');
  });

  test('traceModelCanImportSubtraces', function() {
    var systraceLines = [
      'SurfaceFlinger-2  [001] ...1 1000.0: 0: B|1|taskA',
      'SurfaceFlinger-2  [001] ...1 2000.0: 0: E'
    ];
    var traceEvents = [
      {ts: 1000, pid: 1, tid: 3, ph: 'B', cat: 'c', name: 'taskB', args: {
        my_object: {id_ref: '0x1000'}
      }},
      {ts: 2000, pid: 1, tid: 3, ph: 'E', cat: 'c', name: 'taskB', args: {}}
    ];

    var combined = JSON.stringify({
      traceEvents: traceEvents,
      systemTraceEvents: systraceLines.join('\n')
    });

    var m = new TraceModel();
    m.importTraces([combined]);
    assertEquals(1, base.dictionaryValues(m.processes).length);

    var p1 = m.processes[1];
    assertNotUndefined(p1);

    var t2 = p1.threads[2];
    var t3 = p1.threads[3];
    assertNotUndefined(t2);
    assertNotUndefined(t3);

    assertEquals(1, t2.sliceGroup.length, 1);
    assertEquals('taskA', t2.sliceGroup.slices[0].title);

    assertEquals(1, t3.sliceGroup.length);
    assertEquals('taskB', t3.sliceGroup.slices[0].title);
  });

  test('traceModelWithImportFailure', function() {
    var malformed = '{traceEvents: [{garbage';
    var m = new TraceModel();
    assertThrows(function() {
      m.importTraces([malformed]);
    });
  });

  test('titleFilter', function() {
    var s0 = tracing.test_utils.newSlice(1, 3);
    assertTrue(new TitleFilter('a').matchSlice(s0));
    assertFalse(new TitleFilter('x').matchSlice(s0));

    var s1 = tracing.test_utils.newSliceNamed('ba', 1, 3);
    assertTrue(new TitleFilter('a').matchSlice(s1));
    assertTrue(new TitleFilter('ba').matchSlice(s1));
    assertFalse(new TitleFilter('x').matchSlice(s1));
  });

  test('traceModel_toJSON', function() {
    var m = createTraceModelWithOneOfEverything();
    assertNotNull(JSON.stringify(m));
  });

  test('traceModel_findAllThreadsNamed', function() {
    var m = new TraceModel();
    var t = m.getOrCreateProcess(1).getOrCreateThread(1);
    t.name = 'CrBrowserMain';

    m.updateBounds();
    var f = m.findAllThreadsNamed('CrBrowserMain');
    assertArrayEquals([t], f);
    f = m.findAllThreadsNamed('NoSuchThread');
    assertEquals(0, f.length);
  });

  test('traceModel_updateCategories', function() {
    var m = new TraceModel();
    var t = m.getOrCreateProcess(1).getOrCreateThread(1);
    t.sliceGroup.pushSlice(new ThreadSlice('categoryA', 'a', 0, 1, {}, 3));
    t.sliceGroup.pushSlice(new ThreadSlice('categoryA', 'a', 0, 1, {}, 3));
    t.sliceGroup.pushSlice(new ThreadSlice('categoryB', 'a', 0, 1, {}, 3));
    t.sliceGroup.pushSlice(new ThreadSlice('categoryA', 'a', 0, 1, {}, 3));
    t.sliceGroup.pushSlice(new ThreadSlice('', 'a', 0, 1, {}, 3));
    m.updateCategories_();
    assertArrayEquals(['categoryA', 'categoryB'], m.categories);
  });
});
