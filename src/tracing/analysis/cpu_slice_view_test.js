// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.analysis.cpu_slice_view');
tvcm.require('tracing.trace_model');
tvcm.require('tracing.importer.linux_perf_importer');

tvcm.unittest.testSuite('tracing.analysis.cpu_slice_view_test', function() {
  function createBasicModel() {
    var lines = [
      'Android.launcher-584   [001] d..3 12622.506890: sched_switch: prev_comm=Android.launcher prev_pid=584 prev_prio=120 prev_state=R+ ==> next_comm=Binder_1 next_pid=217 next_prio=120', // @suppress longLineCheck
      '       Binder_1-217   [001] d..3 12622.506918: sched_switch: prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=D ==> next_comm=Android.launcher next_pid=584 next_prio=120', // @suppress longLineCheck
      'Android.launcher-584   [001] d..4 12622.506936: sched_wakeup: comm=Binder_1 pid=217 prio=120 success=1 target_cpu=001', // @suppress longLineCheck
      'Android.launcher-584   [001] d..3 12622.506950: sched_switch: prev_comm=Android.launcher prev_pid=584 prev_prio=120 prev_state=R+ ==> next_comm=Binder_1 next_pid=217 next_prio=120', // @suppress longLineCheck
      '       Binder_1-217   [001] ...1 12622.507057: tracing_mark_write: B|128|queueBuffer', // @suppress longLineCheck
      '       Binder_1-217   [001] ...1 12622.507175: tracing_mark_write: E',
      '       Binder_1-217   [001] d..3 12622.507253: sched_switch: prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=S ==> next_comm=Android.launcher next_pid=584 next_prio=120' // @suppress longLineCheck
    ];

    return new tracing.TraceModel(lines.join('\n'), false);
  }

  test('cpuSliceView_withCpuSliceOnExistingThread', function() {
    var m = createBasicModel();

    var cpu = m.kernel.cpus[1];
    assertNotUndefined(cpu);
    var cpuSlice = cpu.slices[0];
    assertEquals('Binder_1', cpuSlice.title);

    var thread = m.findAllThreadsNamed('Binder_1')[0];
    assertNotUndefined(thread);
    assertEquals(cpuSlice.threadThatWasRunning, thread);

    var view = new tracing.analysis.CpuSliceView();
    view.modelEvent = cpuSlice;
    this.addHTMLOutput(view);

    // Clicking the analysis link should focus the Binder1's timeslice.
    var didSelectionChangeHappen = false;
    view.addEventListener('requestSelectionChange', function(e) {
      assertEquals(1, e.selection.length);
      assertEquals(thread.timeSlices[0], e.selection[0]);
      didSelectionChangeHappen = true;
    });
    view.querySelector('.analysis-link').click();
    assertTrue(didSelectionChangeHappen);
  });

  test('cpuSliceViewWithCpuSliceOnMissingThread', function() {
    var m = createBasicModel();

    var cpu = m.kernel.cpus[1];
    assertNotUndefined(cpu);
    var cpuSlice = cpu.slices[1];
    assertEquals('Android.launcher', cpuSlice.title);
    assertUndefined(cpuSlice.thread);

    var view = new tracing.analysis.CpuSliceView();
    view.modelEvent = cpuSlice;
    this.addHTMLOutput(view);
  });

});
